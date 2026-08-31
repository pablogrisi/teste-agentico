import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { ProcessamentoService } from '../../src/processamento/processamento.service';

const PDF = Buffer.from('%PDF-1.4\ntrailer<</Root 1 0 R>>\n%%EOF\n');

const requisito = (codigo: string, ordem: number) => ({
  codigo,
  area: 'CHECKLIST',
  titulo: `Requisito ${codigo}`,
  descricao: 'descrição',
  obrigatorio: true,
  ordem,
  ativo: true,
});

describe('Processamento da análise (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let processamento: ProcessamentoService;
  let pdfDir: string;

  beforeAll(async () => {
    pdfDir = mkdtempSync(join(tmpdir(), 'licia-proc-pdf-'));
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

  const criar = async (nup: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/analises')
      .field('nup', nup)
      .field('objeto', 'Objeto de teste')
      .attach('arquivo', PDF, {
        filename: 'p.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(201);
    return res.body.id;
  };

  it('processa uma análise: uma avaliação por requisito ativo, status PRONTA_PARA_REVISAO', async () => {
    await prisma.requisito.createMany({
      data: [requisito('C-1', 10), requisito('C-2', 20), requisito('C-3', 30)],
    });
    const id = await criar('NUP-PROC-1');

    await processamento.processarUma(id);

    const analise = await prisma.analise.findUniqueOrThrow({ where: { id } });
    expect(analise.status).toBe('PRONTA_PARA_REVISAO');

    const avaliacoes = await prisma.avaliacaoRequisito.findMany({
      where: { analiseId: id },
    });
    expect(avaliacoes).toHaveLength(3);
    for (const a of avaliacoes) {
      expect(['CONFORME', 'NAO_CONFORME', 'NAO_SE_APLICA']).toContain(
        a.statusSugeridoIa,
      );
      expect(a.statusFinal).toBe(a.statusSugeridoIa);
      expect(a.verificado).toBe(false);
    }
  });

  it('claim atômico: processar duas vezes não duplica avaliações', async () => {
    await prisma.requisito.createMany({ data: [requisito('C-1', 10)] });
    const id = await criar('NUP-PROC-2');

    await processamento.processarUma(id);
    await processamento.processarUma(id); // não está mais PENDENTE

    expect(
      await prisma.avaliacaoRequisito.count({ where: { analiseId: id } }),
    ).toBe(1);
  });

  it('base de requisitos vazia → ERRO_PROCESSAMENTO', async () => {
    const id = await criar('NUP-PROC-3');
    await processamento.processarUma(id);

    const analise = await prisma.analise.findUniqueOrThrow({ where: { id } });
    expect(analise.status).toBe('ERRO_PROCESSAMENTO');
    expect(analise.motivoErro).toBe('base de requisitos vazia');
    expect(
      await prisma.avaliacaoRequisito.count({ where: { analiseId: id } }),
    ).toBe(0);
  });

  it('reprocessar: erro → PENDENTE → processa; 409 fora de erro; 404 inexistente', async () => {
    const id = await criar('NUP-PROC-4');
    await processamento.processarUma(id); // sem requisitos → ERRO_PROCESSAMENTO

    await prisma.requisito.createMany({ data: [requisito('C-1', 10)] });

    const rep = await request(app.getHttpServer()).post(
      `/analises/${id}/reprocessar`,
    );
    expect(rep.status).toBe(200);
    expect(rep.body.status).toBe('PENDENTE');

    await processamento.processarUma(id);
    expect(
      (await prisma.analise.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('PRONTA_PARA_REVISAO');

    const rep2 = await request(app.getHttpServer()).post(
      `/analises/${id}/reprocessar`,
    );
    expect(rep2.status).toBe(409);

    const rep3 = await request(app.getHttpServer()).post(
      `/analises/${randomUUID()}/reprocessar`,
    );
    expect(rep3.status).toBe(404);
  });

  it('recuperarPresas volta PROCESSANDO para PENDENTE', async () => {
    await prisma.requisito.createMany({ data: [requisito('C-1', 10)] });
    const id = await criar('NUP-PROC-5');
    await prisma.analise.update({
      where: { id },
      data: { status: 'PROCESSANDO' },
    });

    const n = await processamento.recuperarPresas();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(
      (await prisma.analise.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('PENDENTE');
  });
});
