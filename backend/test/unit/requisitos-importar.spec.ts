import type { Requisito } from '@prisma/client';
import {
  importarRequisitos,
  PrismaLike,
} from '../../src/requisitos/importador/importar-requisitos';
import {
  ImportacaoInvalidaError,
  LinhaRequisito,
} from '../../src/requisitos/importador/tipos';

const linha = (over: Partial<LinhaRequisito> = {}): LinhaRequisito => ({
  codigo: 'CHK-001',
  area: 'CHECKLIST',
  titulo: 'Título',
  descricao: 'Descrição',
  obrigatorio: true,
  ordem: 10,
  ativo: true,
  normaLei: 'Lei 14.133/2021',
  normaArtigo: '72',
  normaInciso: 'I',
  normaParagrafo: null,
  normaAlinea: null,
  ...over,
});

const requisitoExistente = (over: Partial<Requisito> = {}): Requisito =>
  ({
    id: 'uuid-1',
    codigo: 'CHK-001',
    area: 'CHECKLIST',
    titulo: 'Título',
    descricao: 'Descrição',
    obrigatorio: true,
    ordem: 10,
    ativo: true,
    normaLei: 'Lei 14.133/2021',
    normaArtigo: '72',
    normaInciso: 'I',
    normaParagrafo: null,
    normaAlinea: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...over,
  }) as Requisito;

function makePrisma(existentes: Requisito[]) {
  const create = jest.fn().mockResolvedValue(undefined);
  const update = jest.fn().mockResolvedValue(undefined);
  const findMany = jest.fn().mockResolvedValue(existentes);
  const tx = { requisito: { findMany, create, update } };
  const prisma: PrismaLike = {
    $transaction: ((cb: (t: unknown) => unknown) =>
      Promise.resolve(cb(tx))) as PrismaLike['$transaction'],
  };
  return { prisma, create, update, findMany };
}

describe('importarRequisitos', () => {
  it('insere codigos novos', async () => {
    const { prisma, create } = makePrisma([]);
    const resumo = await importarRequisitos(prisma, [
      linha({ codigo: 'CHK-001' }),
      linha({ codigo: 'CHK-002' }),
    ]);
    expect(resumo).toEqual({ inseridos: 2, atualizados: 0, inalterados: 0 });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('atualiza só ordem/ativo quando os campos imutáveis batem', async () => {
    const { prisma, update, create } = makePrisma([requisitoExistente()]);
    const resumo = await importarRequisitos(prisma, [
      linha({ ordem: 99, ativo: false }),
    ]);
    expect(resumo).toEqual({ inseridos: 0, atualizados: 1, inalterados: 0 });
    expect(update).toHaveBeenCalledWith({
      where: { codigo: 'CHK-001' },
      data: { ordem: 99, ativo: false },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('não escreve nada quando tudo já está igual', async () => {
    const { prisma, update, create } = makePrisma([requisitoExistente()]);
    const resumo = await importarRequisitos(prisma, [linha()]);
    expect(resumo).toEqual({ inseridos: 0, atualizados: 0, inalterados: 1 });
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('aborta e não grava quando um campo imutável diverge', async () => {
    const { prisma, create, update } = makePrisma([requisitoExistente()]);
    await expect(
      importarRequisitos(prisma, [linha({ titulo: 'Título reescrito' })]),
    ).rejects.toBeInstanceOf(ImportacaoInvalidaError);
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('trata obrigatorio como imutável', async () => {
    const { prisma } = makePrisma([requisitoExistente({ obrigatorio: true })]);
    await expect(
      importarRequisitos(prisma, [linha({ obrigatorio: false })]),
    ).rejects.toThrow(/obrigatorio/);
  });
});
