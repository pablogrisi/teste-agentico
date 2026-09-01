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

const requisito = (
  codigo: string,
  area: string,
  ordem: number,
  obrigatorio = true,
) => ({
  codigo,
  area,
  titulo: `Requisito ${codigo}`,
  descricao: 'descrição',
  obrigatorio,
  ordem,
  ativo: true,
});

describe('POST /analises/:id/concluir (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let processamento: ProcessamentoService;
  let pdfDir: string;

  beforeAll(async () => {
    pdfDir = mkdtempSync(join(tmpdir(), 'licia-concluir-pdf-'));
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

  const criarEProcessar = async (): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/analises')
      .field('nup', 'NUP-CONCLUIR')
      .field('objeto', 'Objeto')
      .attach('arquivo', PDF, {
        filename: 'p.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(201);
    await processamento.processarUma(res.body.id);
    return res.body.id;
  };

  const verificarTodos = async (id: string) => {
    const reqs = await prisma.requisito.findMany();
    for (const r of reqs) {
      const res = await request(app.getHttpServer())
        .patch(`/analises/${id}/requisitos/${r.id}`)
        .send({ verificado: true });
      expect(res.status).toBe(200);
    }
  };

  it('bloqueia com 422 e lista os obrigatórios pendentes; conclui com 200 depois de verificar tudo', async () => {
    await prisma.requisito.createMany({
      data: [
        requisito('OBR-1', 'CHECKLIST', 10),
        requisito('OBR-2', 'TECNICA', 10),
        requisito('OPC-1', 'TECNICA', 20, false),
      ],
    });
    const id = await criarEProcessar();

    const bloqueado = await request(app.getHttpServer()).post(
      `/analises/${id}/concluir`,
    );
    expect(bloqueado.status).toBe(422);
    expect(
      bloqueado.body.requisitosPendentes.map(
        (p: { codigo: string }) => p.codigo,
      ),
    ).toEqual(['OBR-1', 'OBR-2']); // OPC-1 não obrigatório → fora
    // nada gravado
    const aindaAberta = await request(app.getHttpServer()).get(
      `/analises/${id}`,
    );
    expect(aindaAberta.body.status).toBe('PRONTA_PARA_REVISAO');
    expect(aindaAberta.body.concluidaEm).toBeNull();

    await verificarTodos(id);

    const ok = await request(app.getHttpServer()).post(
      `/analises/${id}/concluir`,
    );
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('CONCLUIDA');
    expect(ok.body.concluidaEm).not.toBeNull();
    expect(ok.body.analistaId).toBe('analista-teste');
    expect(ok.body.analistaNome).toBe('Analista de Teste');

    // segunda chamada → 200 idempotente, mesmo concluidaEm
    const dinovo = await request(app.getHttpServer()).post(
      `/analises/${id}/concluir`,
    );
    expect(dinovo.status).toBe(200);
    expect(dinovo.body.concluidaEm).toBe(ok.body.concluidaEm);
  });

  it('requisito não obrigatório pendente não impede a conclusão', async () => {
    await prisma.requisito.createMany({
      data: [
        requisito('OBR-1', 'CHECKLIST', 10),
        requisito('OPC-1', 'CHECKLIST', 20, false),
      ],
    });
    const id = await criarEProcessar();
    const obr = await prisma.requisito.findFirstOrThrow({
      where: { codigo: 'OBR-1' },
    });
    await request(app.getHttpServer())
      .patch(`/analises/${id}/requisitos/${obr.id}`)
      .send({ verificado: true });

    const ok = await request(app.getHttpServer()).post(
      `/analises/${id}/concluir`,
    );
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('CONCLUIDA');
  });

  it('409 quando a análise não está em revisão', async () => {
    await prisma.requisito.createMany({
      data: [requisito('OBR-1', 'CHECKLIST', 10)],
    });
    const res = await request(app.getHttpServer())
      .post('/analises')
      .field('nup', 'NUP-PENDENTE')
      .field('objeto', 'Objeto')
      .attach('arquivo', PDF, {
        filename: 'p.pdf',
        contentType: 'application/pdf',
      });
    // sem processar → status PENDENTE
    const r = await request(app.getHttpServer()).post(
      `/analises/${res.body.id}/concluir`,
    );
    expect(r.status).toBe(409);
  });

  it('404 para análise inexistente', async () => {
    const r = await request(app.getHttpServer()).post(
      `/analises/${randomUUID()}/concluir`,
    );
    expect(r.status).toBe(404);
  });
});
