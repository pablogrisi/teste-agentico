/**
 * globalSetup do Jest e2e: sobe um PostgreSQL embutido (sem Docker) e aplica as
 * migrations, para `npm run test:e2e` rodar em qualquer máquina e na CI.
 *
 * Para usar um banco externo (ex.: serviço de Postgres da CI), defina
 * `E2E_EXTERNAL_DB=true` e `DATABASE_URL` — o embutido é ignorado.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

export const HANDLE_FILE = join(tmpdir(), 'licia-e2e-pg.json');
const PORT = Number(process.env.E2E_PG_PORT ?? 54329);
const USER = 'licia';
const PASSWORD = 'licia';
const DB = 'licia_test';

export default async function globalSetup(): Promise<void> {
  if (process.env.E2E_EXTERNAL_DB === 'true') {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'E2E_EXTERNAL_DB=true exige DATABASE_URL apontando para o banco externo.',
      );
    }
    console.log('[e2e] usando banco externo:', process.env.DATABASE_URL);
    writeFileSync(HANDLE_FILE, JSON.stringify({ external: true }));
    return;
  }

  const databaseDir = mkdtempSync(join(tmpdir(), 'licia-e2e-pgdata-'));
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);

  const url = `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB}?schema=public`;
  process.env.DATABASE_URL = url;

  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  writeFileSync(
    HANDLE_FILE,
    JSON.stringify({ external: false, databaseDir, port: PORT }),
  );
  console.log(`[e2e] PostgreSQL embutido no ar em localhost:${PORT}/${DB}`);
}
