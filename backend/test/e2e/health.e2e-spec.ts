import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * Prova que a app NestJS real sobe, conecta no PostgreSQL de teste e responde
 * no `/health`. Requer o banco do `docker compose up -d db` no ar.
 */
describe('GET /health (e2e)', () => {
  let app: INestApplication;

  // Boot da app real + conexão com o Postgres pode passar de 5s.
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  it('responde 200 com o serviço no ar e o banco acessível', async () => {
    const resposta = await request(app.getHttpServer()).get('/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(typeof resposta.body.timestamp).toBe('string');
  });
});
