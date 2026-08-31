import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { ArmazenamentoPdfFilesystemAdapter } from '../../src/core/adapters/armazenamento-pdf.filesystem-adapter';

describe('ArmazenamentoPdfFilesystemAdapter', () => {
  let baseDir: string;
  let adapter: ArmazenamentoPdfFilesystemAdapter;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'licia-pdf-'));
    const config = {
      get: (chave: string) =>
        chave === 'armazenamentoPdf.dir' ? baseDir : undefined,
    } as unknown as ConfigService;
    adapter = new ArmazenamentoPdfFilesystemAdapter(config);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it('salva os bytes e os lê de volta pela referência', async () => {
    const conteudo = Buffer.from('%PDF-1.4 conteúdo de teste');

    const ref = await adapter.salvar(conteudo);
    expect(ref).toMatch(/\.pdf$/);

    const lido = await adapter.ler(ref);
    expect(lido.equals(conteudo)).toBe(true);
  });

  it('rejeita referência com path traversal', async () => {
    await expect(adapter.ler('../escape.pdf')).rejects.toThrow(
      /Referência de PDF inválida/,
    );
  });

  it('lerPagina ainda não é suportado (seam do RF-014)', async () => {
    const ref = await adapter.salvar(Buffer.from('%PDF-1.4'));
    await expect(adapter.lerPagina(ref, 1)).rejects.toThrow(/RF-014/);
  });
});
