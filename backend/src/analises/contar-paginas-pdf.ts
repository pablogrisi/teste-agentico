import { Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';

const logger = new Logger('contarPaginasPdf');

/**
 * Conta as páginas de um PDF (RF-014). **Best-effort**: qualquer falha de parse
 * (arquivo corrompido, encriptado, truncado, não-PDF) devolve `null` em vez de
 * lançar — a contagem serve para o frontend validar a navegação por página, não
 * é regra de negócio, e não deve interromper a criação da análise.
 */
export async function contarPaginasPdf(bytes: Buffer): Promise<number | null> {
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    return doc.getPageCount();
  } catch (erro) {
    logger.debug(
      `Não foi possível contar as páginas do PDF: ${(erro as Error).message}`,
    );
    return null;
  }
}
