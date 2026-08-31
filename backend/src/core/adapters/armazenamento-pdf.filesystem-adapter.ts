import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, resolve, sep } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArmazenamentoPdfPort } from '../ports/armazenamento-pdf.port';

/**
 * Adapter de `ArmazenamentoPdfPort` que grava os PDFs num diretório local
 * (`ARMAZENAMENTO_PDF_DIR`). É o "mais simples viável" pedido na fundação;
 * object storage + criptografia at-rest ficam para depois (A-05).
 */
@Injectable()
export class ArmazenamentoPdfFilesystemAdapter implements ArmazenamentoPdfPort {
  private readonly logger = new Logger(ArmazenamentoPdfFilesystemAdapter.name);
  private readonly baseDir: string;

  constructor(config: ConfigService) {
    const dir = config.get<string>('armazenamentoPdf.dir') ?? './var/pdfs';
    this.baseDir = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
  }

  async salvar(bytes: Buffer): Promise<string> {
    await mkdir(this.baseDir, { recursive: true });
    const ref = `${randomUUID()}.pdf`;
    await writeFile(this.resolveRef(ref), bytes);
    this.logger.debug(`PDF salvo: ${ref}`);
    return ref;
  }

  async ler(ref: string): Promise<Buffer> {
    return readFile(this.resolveRef(ref));
  }

  lerPagina(ref: string, pagina: number): Promise<Buffer> {
    // A extração por página depende de uma lib de PDF e será implementada no
    // ciclo do RF-014. O seam já existe para não haver retrabalho estrutural.
    return Promise.reject(
      new Error(
        `lerPagina(${ref}, ${pagina}) ainda não implementada — ver ciclo do RF-014`,
      ),
    );
  }

  /** Impede que uma referência escape do diretório base (path traversal). */
  private resolveRef(ref: string): string {
    if (ref !== basename(ref) || ref.includes(sep) || ref.includes('/')) {
      throw new Error(`Referência de PDF inválida: ${ref}`);
    }
    const full = resolve(this.baseDir, ref);
    if (full !== resolve(this.baseDir, basename(ref))) {
      throw new Error(`Referência de PDF inválida: ${ref}`);
    }
    return full;
  }
}
