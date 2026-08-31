import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { parseRequisitosCsv } from '../../src/requisitos/importador/parse-requisitos-csv';
import { validarLinhas } from '../../src/requisitos/importador/validar-linhas';
import { importarRequisitos } from '../../src/requisitos/importador/importar-requisitos';
import { ImportacaoInvalidaError } from '../../src/requisitos/importador/tipos';

/**
 * Integração real contra o PostgreSQL de teste. Requer `docker compose up -d db`
 * e a migration aplicada (`npm run prisma:migrate`). Rodado por `npm run test:e2e`.
 */
const CSV_PLACEHOLDER = resolve(
  __dirname,
  '../../prisma/seed-data/requisitos.csv',
);

const linhasDoArquivo = (caminho: string) => {
  const validacao = validarLinhas(
    parseRequisitosCsv(readFileSync(caminho, 'utf-8')),
  );
  if (!validacao.ok) {
    throw new Error(`fixture inválida: ${JSON.stringify(validacao.erros)}`);
  }
  return validacao.linhas;
};

describe('Importador de requisitos (integração)', () => {
  const prisma = new PrismaClient();

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.requisito.deleteMany();
  });

  it('importa o CSV placeholder e é idempotente na reimportação', async () => {
    const linhas = linhasDoArquivo(CSV_PLACEHOLDER);

    const primeira = await importarRequisitos(prisma, linhas);
    expect(primeira.inseridos).toBe(linhas.length);

    const segunda = await importarRequisitos(prisma, linhas);
    expect(segunda).toEqual({
      inseridos: 0,
      atualizados: 0,
      inalterados: linhas.length,
    });

    const total = await prisma.requisito.count();
    expect(total).toBe(linhas.length);
  });

  it('aplica mudança só de ordem/ativo sem tocar no texto', async () => {
    const linhas = linhasDoArquivo(CSV_PLACEHOLDER);
    await importarRequisitos(prisma, linhas);

    const alvo = linhas[0];
    await importarRequisitos(prisma, [
      { ...alvo, ordem: alvo.ordem + 1000, ativo: false },
    ]);

    const depois = await prisma.requisito.findUniqueOrThrow({
      where: { codigo: alvo.codigo },
    });
    expect(depois.ordem).toBe(alvo.ordem + 1000);
    expect(depois.ativo).toBe(false);
    expect(depois.titulo).toBe(alvo.titulo);
  });

  it('aborta a transação inteira quando um campo imutável diverge', async () => {
    const linhas = linhasDoArquivo(CSV_PLACEHOLDER);
    await importarRequisitos(prisma, linhas);

    const conflito = [
      { ...linhas[0], titulo: `${linhas[0].titulo} (reescrito)` },
      { ...linhas[1], codigo: 'NOVO-999', ordem: 500 },
    ];

    await expect(importarRequisitos(prisma, conflito)).rejects.toBeInstanceOf(
      ImportacaoInvalidaError,
    );

    // A segunda linha (nova) não pode ter sido gravada: rollback total.
    const nova = await prisma.requisito.findUnique({
      where: { codigo: 'NOVO-999' },
    });
    expect(nova).toBeNull();
    const original = await prisma.requisito.findUniqueOrThrow({
      where: { codigo: linhas[0].codigo },
    });
    expect(original.titulo).toBe(linhas[0].titulo);
  });

  it('listarAtivos (via query) retorna só ativos, ordenados por area e ordem', async () => {
    const linhas = linhasDoArquivo(CSV_PLACEHOLDER);
    await importarRequisitos(prisma, linhas);
    await importarRequisitos(prisma, [{ ...linhas[0], ativo: false }]);

    const ativos = await prisma.requisito.findMany({
      where: { ativo: true },
      orderBy: [{ area: 'asc' }, { ordem: 'asc' }],
    });

    expect(ativos.every((r) => r.ativo)).toBe(true);
    expect(ativos.map((r) => r.codigo)).not.toContain(linhas[0].codigo);
    const chaves = ativos.map((r) => `${r.area}#${r.ordem}`);
    expect(chaves).toEqual([...chaves].sort());
  });
});
