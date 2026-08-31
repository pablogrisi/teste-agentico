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

describe('PATCH /analises/:id/requisitos/:requisitoId (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let processamento: ProcessamentoService;
  let pdfDir: string;

  beforeAll(async () => {
    pdfDir = mkdtempSync(join(tmpdir(), 'licia-revisao-pdf-'));
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

  const prepararAnalise = async (): Promise<{ id: string; reqId: string }> => {
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
        },
      ],
    });
    const res = await request(app.getHttpServer())
      .post('/analises')
      .field('nup', 'NUP-REV')
      .field('objeto', 'Objeto')
      .attach('arquivo', PDF, {
        filename: 'p.pdf',
        contentType: 'application/pdf',
      });
    const id: string = res.body.id;
    await processamento.processarUma(id);
    const req = await prisma.requisito.findFirstOrThrow();
    return { id, reqId: req.id };
  };

  const patch = (id: string, reqId: string, body: object) =>
    request(app.getHttpServer())
      .patch(`/analises/${id}/requisitos/${reqId}`)
      .send(body);

  it('altera o parecer para NAO_CONFORME: exige comentário, marca verificado, recalcula resumo', async () => {
    const { id, reqId } = await prepararAnalise();

    const semComentario = await patch(id, reqId, {
      statusFinal: 'NAO_CONFORME',
    });
    expect(semComentario.status).toBe(422);

    const ok = await patch(id, reqId, {
      statusFinal: 'NAO_CONFORME',
      comentario: 'evidência ausente no PDF',
    });
    expect(ok.status).toBe(200);
    expect(ok.body.item).toMatchObject({
      requisitoId: reqId,
      statusFinal: 'NAO_CONFORME',
      verificado: true,
      comentario: 'evidência ausente no PDF',
    });
    expect(ok.body.resumo).toMatchObject({
      total: 1,
      naoConforme: 1,
      verificados: 1,
      obrigatoriosPendentes: 0,
    });
  });

  it('só marcar verificado (parecer segue = sugestão) não exige comentário', async () => {
    const { id, reqId } = await prepararAnalise();
    const res = await patch(id, reqId, { verificado: true });
    expect(res.status).toBe(200);
    expect(res.body.item).toMatchObject({
      verificado: true,
      statusFinal: 'NAO_SE_APLICA',
    });
    expect(res.body.resumo.verificados).toBe(1);
  });

  it('422 para statusFinal inválido e para corpo vazio', async () => {
    const { id, reqId } = await prepararAnalise();
    expect((await patch(id, reqId, { statusFinal: 'X' })).status).toBe(422);
    expect((await patch(id, reqId, {})).status).toBe(422);
  });

  it('404 para requisito não avaliado; 409 para análise fora de revisão', async () => {
    const { id } = await prepararAnalise();
    expect((await patch(id, randomUUID(), { verificado: true })).status).toBe(
      404,
    );

    await prisma.analise.update({
      where: { id },
      data: { status: 'CONCLUIDA' },
    });
    const req = await prisma.requisito.findFirstOrThrow();
    expect((await patch(id, req.id, { verificado: true })).status).toBe(409);
  });
});
