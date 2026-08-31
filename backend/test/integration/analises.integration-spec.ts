import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';

const PDF_MIN = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

/** Coletor de corpo binário para o supertest (endpoint de PDF). */
function binaryParser(
  res: request.Response,
  cb: (err: Error | null, body: Buffer) => void,
): void {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

describe('Análises (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let pdfDir: string;

  beforeAll(async () => {
    pdfDir = mkdtempSync(join(tmpdir(), 'licia-analises-pdf-'));
    process.env.ARMAZENAMENTO_PDF_DIR = pdfDir;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = new PrismaClient();
    await prisma.$connect();
  }, 30_000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    rmSync(pdfDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await prisma.analise.deleteMany();
  });

  it('cria a análise, persiste o PDF e permite recuperá-lo', async () => {
    const criar = await request(app.getHttpServer())
      .post('/analises')
      .field('nup', '00000.123456/2026-99')
      .field('objeto', 'Aquisição de equipamentos de rede')
      .attach('arquivo', PDF_MIN, {
        filename: 'processo.pdf',
        contentType: 'application/pdf',
      });

    expect(criar.status).toBe(201);
    expect(criar.body).toMatchObject({ status: 'PENDENTE' });
    const id: string = criar.body.id;
    expect(id).toBeTruthy();

    const noBanco = await prisma.analise.findUniqueOrThrow({ where: { id } });
    expect(noBanco.arquivoPdfRef).toMatch(/\.pdf$/);
    expect(noBanco.analistaId).toBeTruthy();

    const buscar = await request(app.getHttpServer()).get(`/analises/${id}`);
    expect(buscar.status).toBe(200);
    expect(buscar.body).toMatchObject({
      id,
      nup: '00000.123456/2026-99',
      status: 'PENDENTE',
    });

    const pdf = await request(app.getHttpServer())
      .get(`/analises/${id}/pdf`)
      .buffer()
      .parse(binaryParser);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(Buffer.compare(pdf.body as Buffer, PDF_MIN)).toBe(0);
  });

  it('recusa (422) sem arquivo e não cria linha', async () => {
    const res = await request(app.getHttpServer())
      .post('/analises')
      .field('nup', 'X')
      .field('objeto', 'Y');
    expect(res.status).toBe(422);
    expect(await prisma.analise.count()).toBe(0);
  });

  it('recusa (422) arquivo que não é PDF e não cria linha', async () => {
    const res = await request(app.getHttpServer())
      .post('/analises')
      .field('nup', 'X')
      .field('objeto', 'Y')
      .attach('arquivo', Buffer.from('só um texto'), {
        filename: 'nota.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(422);
    expect(await prisma.analise.count()).toBe(0);
  });

  it('404 para análise inexistente e para o PDF dela', async () => {
    const id = randomUUID();
    expect(
      (await request(app.getHttpServer()).get(`/analises/${id}`)).status,
    ).toBe(404);
    expect(
      (await request(app.getHttpServer()).get(`/analises/${id}/pdf`)).status,
    ).toBe(404);
  });
});
