import { Test } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RequisitosService } from '../../src/requisitos/requisitos.service';

describe('RequisitosService', () => {
  it('listarAtivos consulta só ativos, ordenado por area e ordem', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        RequisitosService,
        { provide: PrismaService, useValue: { requisito: { findMany } } },
      ],
    }).compile();

    await moduleRef.get(RequisitosService).listarAtivos();

    expect(findMany).toHaveBeenCalledWith({
      where: { ativo: true },
      orderBy: [{ area: 'asc' }, { ordem: 'asc' }],
    });
  });
});
