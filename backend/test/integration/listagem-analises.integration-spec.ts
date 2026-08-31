import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';

// Precisa bater com ANALISTA_ATUAL_ID de test/setup-e2e-env.ts
const ANALISTA = 'analista-teste';

describe('GET /analises — listagem (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
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
  });

  beforeEach(async () => {
    await prisma.analise.deleteMany();
    await prisma.analise.createMany({
      data: [
        {
          nup: 'NUP-0001',
          objeto: 'Compra de licenças de software',
          analistaId: ANALISTA,
          arquivoPdfRef: 'r1.pdf',
          status: 'PENDENTE',
          iniciadaEm: new Date('2026-01-01T10:00:00Z'),
        },
        {
          nup: 'NUP-0002',
          objeto: 'Reforma predial',
          analistaId: ANALISTA,
          arquivoPdfRef: 'r2.pdf',
          status: 'CONCLUIDA',
          iniciadaEm: new Date('2026-02-01T10:00:00Z'),
        },
        {
          nup: 'NUP-0003',
          objeto: 'Aquisição de software de gestão',
          analistaId: ANALISTA,
          arquivoPdfRef: 'r3.pdf',
          status: 'PENDENTE',
          iniciadaEm: new Date('2026-03-01T10:00:00Z'),
        },
        {
          nup: 'NUP-0004',
          objeto: 'Serviço de limpeza',
          analistaId: ANALISTA,
          arquivoPdfRef: 'r4.pdf',
          status: 'PRONTA_PARA_REVISAO',
          iniciadaEm: new Date('2026-04-01T10:00:00Z'),
        },
        {
          nup: 'OUTRO-9999',
          objeto: 'Análise de outro analista',
          analistaId: 'analista-x',
          arquivoPdfRef: 'r5.pdf',
          status: 'PENDENTE',
          iniciadaEm: new Date('2026-05-01T10:00:00Z'),
        },
      ],
    });
  });

  const get = (qs = '') => request(app.getHttpServer()).get(`/analises${qs}`);

  it('lista só as do analista atual, mais recentes primeiro, paginado', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 4, pagina: 1, tamanho: 20 });
    expect(res.body.itens.map((i: { nup: string }) => i.nup)).toEqual([
      'NUP-0004',
      'NUP-0003',
      'NUP-0002',
      'NUP-0001',
    ]);
    expect(Object.keys(res.body.itens[0]).sort()).toEqual(
      ['concluidaEm', 'id', 'iniciadaEm', 'nup', 'objeto', 'status'].sort(),
    );
  });

  it('q filtra por nup ou objeto, sem distinção de maiúsculas', async () => {
    const res = await get('?q=SOFTWARE');
    expect(res.body.total).toBe(2);
    expect(res.body.itens.map((i: { nup: string }) => i.nup).sort()).toEqual([
      'NUP-0001',
      'NUP-0003',
    ]);
  });

  it('status filtra (inclusive múltiplos valores)', async () => {
    expect((await get('?status=CONCLUIDA')).body.total).toBe(1);
    const multi = await get('?status=PENDENTE,PRONTA_PARA_REVISAO');
    expect(multi.body.total).toBe(3);
  });

  it('ordenarPor=nup&ordem=asc ordena pelo NUP', async () => {
    const res = await get('?ordenarPor=nup&ordem=asc');
    expect(res.body.itens.map((i: { nup: string }) => i.nup)).toEqual([
      'NUP-0001',
      'NUP-0002',
      'NUP-0003',
      'NUP-0004',
    ]);
  });

  it('pagina/tamanho recortam o resultado e total é o do filtro', async () => {
    const res = await get('?pagina=2&tamanho=2&ordenarPor=nup&ordem=asc');
    expect(res.body).toMatchObject({ total: 4, pagina: 2, tamanho: 2 });
    expect(res.body.itens.map((i: { nup: string }) => i.nup)).toEqual([
      'NUP-0003',
      'NUP-0004',
    ]);
  });

  it('422 para status inválido', async () => {
    expect((await get('?status=NAO_EXISTE')).status).toBe(422);
    expect((await get('?tamanho=999')).status).toBe(422);
  });

  it('lista vazia quando o analista não tem análises', async () => {
    await prisma.analise.deleteMany();
    const res = await get();
    expect(res.body).toEqual({ itens: [], total: 0, pagina: 1, tamanho: 20 });
  });
});
