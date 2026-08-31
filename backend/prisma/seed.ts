/**
 * Seed da base de requisitos (RF-006 / TSD-003).
 *
 * Importa um CSV para a tabela `requisito`. Por padrão usa
 * `prisma/seed-data/requisitos.csv`; um caminho alternativo pode ser passado
 * como argumento (`npm run seed:file -- caminho/arquivo.csv`).
 *
 * Idempotente: reimportar o mesmo arquivo não duplica nem reescreve texto.
 * Se um `codigo` existente tiver campo imutável divergente, aborta sem gravar.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { parseRequisitosCsv } from '../src/requisitos/importador/parse-requisitos-csv';
import { validarLinhas } from '../src/requisitos/importador/validar-linhas';
import { importarRequisitos } from '../src/requisitos/importador/importar-requisitos';

async function main(): Promise<void> {
  const caminho =
    process.argv[2] ?? resolve(__dirname, 'seed-data', 'requisitos.csv');
  const conteudo = readFileSync(caminho, 'utf-8');

  const cruas = parseRequisitosCsv(conteudo);
  const validacao = validarLinhas(cruas);
  if (!validacao.ok) {
    const detalhe = validacao.erros
      .map((e) => `  linha ${e.linha}: ${e.mensagem}`)
      .join('\n');
    throw new Error(`CSV inválido (${caminho}):\n${detalhe}`);
  }

  const prisma = new PrismaClient();
  try {
    const resumo = await importarRequisitos(prisma, validacao.linhas);
    console.log(
      `Seed de requisitos (${caminho}): ` +
        `${resumo.inseridos} inseridos, ${resumo.atualizados} atualizados, ` +
        `${resumo.inalterados} inalterados.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
