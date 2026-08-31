/**
 * globalTeardown do Jest e2e: derruba o PostgreSQL embutido e apaga o data dir.
 *
 * O `stop()` gracioso do embedded-postgres é lento no Windows (checkpoint de
 * shutdown). Como o data dir é descartável (mkdtemp por execução,
 * `persistent: false`), matamos o processo direto pelo `postmaster.pid` e só
 * caímos no `stop()` se não achar o PID. Nunca trava, nunca falha a run.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import EmbeddedPostgres from 'embedded-postgres';
import { HANDLE_FILE } from './embedded-postgres.globalSetup';

function matarPorPid(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/F', '/T', '/PID', String(pid)], {
        stdio: 'ignore',
      });
    } else {
      process.kill(pid, 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

export default async function globalTeardown(): Promise<void> {
  if (!existsSync(HANDLE_FILE)) return;

  const handle = JSON.parse(readFileSync(HANDLE_FILE, 'utf-8')) as {
    external: boolean;
    databaseDir?: string;
    port?: number;
  };
  rmSync(HANDLE_FILE, { force: true });
  if (handle.external || !handle.databaseDir) return;

  const pidFile = join(handle.databaseDir, 'postmaster.pid');
  let morto = false;
  if (existsSync(pidFile)) {
    const pid = Number(readFileSync(pidFile, 'utf-8').split('\n')[0]?.trim());
    if (Number.isInteger(pid) && pid > 0) morto = matarPorPid(pid);
  }

  if (!morto && handle.port) {
    try {
      await Promise.race([
        new EmbeddedPostgres({
          databaseDir: handle.databaseDir,
          port: handle.port,
          user: 'licia',
          password: 'licia',
          persistent: false,
        }).stop(),
        sleep(20_000),
      ]);
    } catch {
      // segue para limpar o diretório
    }
  }

  await sleep(500);
  try {
    rmSync(handle.databaseDir, {
      recursive: true,
      force: true,
      maxRetries: 15,
      retryDelay: 300,
    });
  } catch {
    // best-effort: diretório em os.tmpdir(), o SO recupera
  }
}
