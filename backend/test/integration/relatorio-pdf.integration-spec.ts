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

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');

describe('GET /analises/:id/relatorio (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let processamento: ProcessamentoService;
  let pdfDir: string;

  beforeAll(async () => {
    pdfDir = mkdtempSync(join(tmpdir(), 'licia-relatorio-pdf-'));
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

  const criarProcessarConcluir = async (): Promise<string> => {
    await prisma.requisito.createMany({
      data: [
        {
          codigo: 'CHK-1',
          area: 'CHECKLIST',
          titulo: 'Requisito 1',
          descricao: 'd',
          obrigatorio: true,
          ordem: 10,
          ativo: true,
          normaLei: 'Lei 14.133/2021',
          normaArtigo: '72',
        },
        {
          codigo: 'TEC-1',
          area: 'TECNICA',
          titulo: 'Requisito técnico',
          descricao: 'd',
          obrigatorio: true,
          ordem: 10,
          ativo: true,
        },
      ],
    });
    const res = await request(app.getHttpServer())
      .post('/analises')
      .field('nup', 'NUP-REL')
      .field('objeto', 'Objeto do relatório')
      .attach('arquivo', PDF, {
        filename: 'p.pdf',
        contentType: 'application/pdf',
      });
    const id: string = res.body.id;
    await processamento.processarUma(id);
    const reqs = await prisma.requisito.findMany();
    for (const r of reqs) {
      await request(app.getHttpServer())
        .patch(`/analises/${id}/requisitos/${r.id}`)
        .send({ verificado: true });
    }
    return id;
  };

  it('gera o PDF de uma análise concluída (200 application/pdf inline)', async () => {
    const id = await criarProcessarConcluir();
    const concl = await request(app.getHttpServer()).post(
      `/analises/${id}/concluir`,
    );
    expect(concl.status).toBe(200);

    const res = await request(app.getHttpServer())
      .get(`/analises/${id}/relatorio`)
      .buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('inline');
    expect(res.headers['content-disposition']).toContain(
      `relatorio-analise-${id}.pdf`,
    );
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('409 quando a análise ainda não está concluída', async () => {
    const id = await criarProcessarConcluir(); // verifica tudo, mas NÃO conclui
    const res = await request(app.getHttpServer()).get(
      `/analises/${id}/relatorio`,
    );
    expect(res.status).toBe(409);
  });

  it('404 para análise inexistente', async () => {
    const res = await request(app.getHttpServer()).get(
      `/analises/${randomUUID()}/relatorio`,
    );
    expect(res.status).toBe(404);
  });
});
