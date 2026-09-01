import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import { AppModule } from '../../src/app.module';
import { ProcessamentoService } from '../../src/processamento/processamento.service';

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');

const pdfComPaginas = async (n: number): Promise<Buffer> => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
};

const requisito = (codigo: string, area: string, ordem: number) => ({
  codigo,
  area,
  titulo: `Requisito ${codigo}`,
  descricao: 'descrição',
  obrigatorio: true,
  ordem,
  ativo: true,
  normaLei: 'Lei 14.133/2021',
  normaArtigo: '72',
});

describe('GET /analises/:id — abrir análise (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let processamento: ProcessamentoService;
  let pdfDir: string;

  beforeAll(async () => {
    pdfDir = mkdtempSync(join(tmpdir(), 'licia-abrir-pdf-'));
    process.env.ARMAZENAMENTO_PDF_DIR = pdfDir;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    processamento = app.get(ProcessamentoService);
    prisma = new PrismaClient();
    await prisma.$connect();
  }, 30_000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    rmSync(pdfDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await prisma.avaliacaoRequisito.deleteMany();
    await prisma.analise.deleteMany();
    await prisma.requisito.deleteMany();
  });

  const criar = async (): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/analises')
      .field('nup', 'NUP-ABRIR')
      .field('objeto', 'Objeto')
      .attach('arquivo', PDF, {
        filename: 'p.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(201);
    return res.body.id;
  };

  it('devolve avaliacoesPorArea (agrupado/ordenado) e resumo após processar', async () => {
    await prisma.requisito.createMany({
      data: [
        requisito('CHK-2', 'CHECKLIST', 20),
        requisito('CHK-1', 'CHECKLIST', 10),
        requisito('TEC-1', 'TECNICA', 10),
      ],
    });
    const id = await criar();
    await processamento.processarUma(id);

    const res = await request(app.getHttpServer()).get(`/analises/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id,
      nup: 'NUP-ABRIR',
      status: 'PRONTA_PARA_REVISAO',
      analistaId: 'analista-teste',
      analistaNome: 'Analista de Teste',
    });

    expect(
      res.body.avaliacoesPorArea.map((g: { area: string }) => g.area),
    ).toEqual(['CHECKLIST', 'TECNICA']);
    const checklist = res.body.avaliacoesPorArea[0].itens;
    expect(checklist).toHaveLength(2);
    // stub sugere NAO_SE_APLICA para tudo → sem não conformes → ordena por `ordem`
    expect(checklist.map((i: { codigo: string }) => i.codigo)).toEqual([
      'CHK-1',
      'CHK-2',
    ]);
    expect(checklist[0]).toHaveProperty('norma.lei', 'Lei 14.133/2021');

    expect(res.body.resumo).toMatchObject({
      total: 3,
      naoSeAplica: 3,
      verificados: 0,
      obrigatoriosPendentes: 3,
    });
  });

  it('análise ainda não processada → avaliacoesPorArea vazio e resumo zerado', async () => {
    const id = await criar();
    const res = await request(app.getHttpServer()).get(`/analises/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDENTE');
    expect(res.body.avaliacoesPorArea).toEqual([]);
    expect(res.body.resumo.total).toBe(0);
  });

  it('404 para análise inexistente', async () => {
    const res = await request(app.getHttpServer()).get(
      `/analises/${randomUUID()}`,
    );
    expect(res.status).toBe(404);
  });

  it('expõe totalPaginasPdf contado do PDF enviado (RF-014)', async () => {
    const res = await request(app.getHttpServer())
      .post('/analises')
      .field('nup', 'NUP-PAGS')
      .field('objeto', 'Objeto')
      .attach('arquivo', await pdfComPaginas(5), {
        filename: 'p.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(201);
    const detalhe = await request(app.getHttpServer()).get(
      `/analises/${res.body.id}`,
    );
    expect(detalhe.body.totalPaginasPdf).toBe(5);
  });

  it('totalPaginasPdf = null quando o PDF não é parseável, sem falhar a criação', async () => {
    const id = await criar(); // PDF placeholder não parseável
    const res = await request(app.getHttpServer()).get(`/analises/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.totalPaginasPdf).toBeNull();
  });
});
