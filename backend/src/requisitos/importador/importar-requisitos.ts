import { PrismaClient, Requisito } from '@prisma/client';
import {
  CAMPOS_IMUTAVEIS,
  ImportacaoInvalidaError,
  LinhaRequisito,
  ResumoImportacao,
} from './tipos';

/** Subconjunto do PrismaClient que o importador usa (facilita mockar). */
export type PrismaLike = Pick<PrismaClient, '$transaction'>;

type TxLike = {
  requisito: {
    findMany(args: {
      where: { codigo: { in: string[] } };
    }): Promise<Requisito[]>;
    create(args: { data: LinhaRequisito }): Promise<Requisito>;
    update(args: {
      where: { codigo: string };
      data: { ordem?: number; ativo?: boolean };
    }): Promise<Requisito>;
  };
};

function diffImutavel(existente: Requisito, novo: LinhaRequisito): string[] {
  const diffs: string[] = [];
  for (const campo of CAMPOS_IMUTAVEIS) {
    if (existente[campo] !== novo[campo]) {
      diffs.push(
        `${campo}: "${String(existente[campo])}" → "${String(novo[campo])}"`,
      );
    }
  }
  return diffs;
}

/**
 * Importa as linhas (já validadas por `validarLinhas`) numa única transação.
 *
 * - `codigo` novo → cria.
 * - `codigo` existente, campos imutáveis iguais → atualiza só `ordem`/`ativo`
 *   (ou nada, se iguais).
 * - `codigo` existente, algum campo imutável diferente → aborta tudo
 *   (`ImportacaoInvalidaError`); nada é gravado. A saída orienta criar um
 *   novo `codigo`.
 * - `codigo` ausente do arquivo → intocado (desativar é sempre explícito).
 */
export async function importarRequisitos(
  prisma: PrismaLike,
  linhas: LinhaRequisito[],
): Promise<ResumoImportacao> {
  return prisma.$transaction(async (txRaw) => {
    const tx = txRaw as unknown as TxLike;
    const codigos = linhas.map((l) => l.codigo);
    const existentes = await tx.requisito.findMany({
      where: { codigo: { in: codigos } },
    });
    const porCodigo = new Map(existentes.map((r) => [r.codigo, r]));

    const conflitos: string[] = [];
    for (const linha of linhas) {
      const existente = porCodigo.get(linha.codigo);
      if (!existente) continue;
      const diffs = diffImutavel(existente, linha);
      if (diffs.length > 0) {
        conflitos.push(
          `${linha.codigo} — campo(s) imutável(is) divergente(s): ${diffs.join('; ')}. ` +
            `Requisito publicado não é reescrito: crie um novo codigo e marque o antigo como ativo=false.`,
        );
      }
    }
    if (conflitos.length > 0) {
      throw new ImportacaoInvalidaError(conflitos);
    }

    let inseridos = 0;
    let atualizados = 0;
    let inalterados = 0;

    for (const linha of linhas) {
      const existente = porCodigo.get(linha.codigo);
      if (!existente) {
        await tx.requisito.create({ data: linha });
        inseridos++;
        continue;
      }
      if (existente.ordem !== linha.ordem || existente.ativo !== linha.ativo) {
        await tx.requisito.update({
          where: { codigo: linha.codigo },
          data: { ordem: linha.ordem, ativo: linha.ativo },
        });
        atualizados++;
      } else {
        inalterados++;
      }
    }

    return { inseridos, atualizados, inalterados };
  });
}
