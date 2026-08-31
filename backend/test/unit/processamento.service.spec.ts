import { ProcessamentoService } from '../../src/processamento/processamento.service';

const REQ = [
  { id: 'r1', codigo: 'C-1', titulo: 'T1', descricao: 'D1' },
  { id: 'r2', codigo: 'C-2', titulo: 'T2', descricao: 'D2' },
];

function build(over: {
  claimCount?: number;
  requisitos?: unknown[];
  ler?: jest.Mock;
  analisar?: jest.Mock;
  iaTimeoutMs?: number;
  auto?: boolean;
}) {
  const analise = {
    updateMany: jest.fn().mockResolvedValue({ count: over.claimCount ?? 1 }),
    findUniqueOrThrow: jest
      .fn()
      .mockResolvedValue({ id: 'a1', arquivoPdfRef: 'ref.pdf' }),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
  };
  const avaliacaoRequisito = { create: jest.fn().mockReturnValue('op') };
  const prisma = {
    analise,
    avaliacaoRequisito,
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const requisitos = {
    listarAtivos: jest.fn().mockResolvedValue(over.requisitos ?? REQ),
  };
  const config = {
    get: (chave: string, padrao: unknown) => {
      if (chave === 'processamento.iaTimeoutMs')
        return over.iaTimeoutMs ?? 120000;
      if (chave === 'processamento.auto') return over.auto ?? true;
      return padrao;
    },
  };
  const analiseIa = {
    analisar:
      over.analisar ??
      jest.fn().mockResolvedValue([
        {
          requisitoId: 'r1',
          statusSugerido: 'NAO_CONFORME',
          paginaReferencia: 5,
        },
        { requisitoId: 'r2', statusSugerido: 'CONFORME' },
      ]),
  };
  const armazenamentoPdf = {
    ler: over.ler ?? jest.fn().mockResolvedValue(Buffer.from('%PDF')),
  };
  const service = new ProcessamentoService(
    prisma as never,
    requisitos as never,
    config as never,
    analiseIa as never,
    armazenamentoPdf as never,
  );
  return {
    service,
    prisma,
    analise,
    avaliacaoRequisito,
    requisitos,
    analiseIa,
  };
}

describe('ProcessamentoService.processarUma', () => {
  it('não faz nada quando o claim não pega a análise', async () => {
    const { service, analise, requisitos } = build({ claimCount: 0 });
    await service.processarUma('a1');
    expect(requisitos.listarAtivos).not.toHaveBeenCalled();
    expect(analise.update).not.toHaveBeenCalled();
  });

  it('grava uma avaliação por requisito e vai para PRONTA_PARA_REVISAO', async () => {
    const { service, prisma, avaliacaoRequisito, analise } = build({});
    await service.processarUma('a1');

    expect(avaliacaoRequisito.create).toHaveBeenCalledTimes(2);
    expect(avaliacaoRequisito.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        analiseId: 'a1',
        requisitoId: 'r1',
        statusSugeridoIa: 'NAO_CONFORME',
        statusFinal: 'NAO_CONFORME',
        verificado: false,
        paginaReferencia: 5,
      }),
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(analise.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { status: 'PRONTA_PARA_REVISAO', motivoErro: null },
    });
  });

  it('usa NAO_SE_APLICA para requisito sem sugestão da IA', async () => {
    const { service, avaliacaoRequisito } = build({
      analisar: jest
        .fn()
        .mockResolvedValue([{ requisitoId: 'r1', statusSugerido: 'CONFORME' }]),
    });
    await service.processarUma('a1');
    expect(avaliacaoRequisito.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requisitoId: 'r2',
        statusSugeridoIa: 'NAO_SE_APLICA',
      }),
    });
  });

  it('base de requisitos vazia → ERRO_PROCESSAMENTO', async () => {
    const { service, analise } = build({ requisitos: [] });
    await service.processarUma('a1');
    expect(analise.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: {
        status: 'ERRO_PROCESSAMENTO',
        motivoErro: 'base de requisitos vazia',
      },
    });
  });

  it('falha da IA → ERRO_PROCESSAMENTO, sem avaliações', async () => {
    const { service, analise, avaliacaoRequisito } = build({
      analisar: jest.fn().mockRejectedValue(new Error('boom')),
    });
    await service.processarUma('a1');
    expect(avaliacaoRequisito.create).not.toHaveBeenCalled();
    expect(analise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ERRO_PROCESSAMENTO' }),
      }),
    );
  });

  it('timeout da IA → ERRO_PROCESSAMENTO', async () => {
    const { service, analise } = build({
      iaTimeoutMs: 10,
      analisar: jest.fn().mockReturnValue(new Promise(() => {})),
    });
    await service.processarUma('a1');
    expect(analise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ERRO_PROCESSAMENTO' }),
      }),
    );
  });

  it('falha ao ler o PDF → ERRO_PROCESSAMENTO', async () => {
    const { service, analise } = build({
      ler: jest.fn().mockRejectedValue(new Error('ENOENT')),
    });
    await service.processarUma('a1');
    expect(analise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ERRO_PROCESSAMENTO' }),
      }),
    );
  });
});

describe('ProcessamentoService — outros', () => {
  it('recuperarPresas volta PROCESSANDO para PENDENTE', async () => {
    const { service, analise } = build({});
    analise.updateMany.mockResolvedValueOnce({ count: 3 });
    const n = await service.recuperarPresas();
    expect(n).toBe(3);
    expect(analise.updateMany).toHaveBeenCalledWith({
      where: { status: 'PROCESSANDO' },
      data: { status: 'PENDENTE' },
    });
  });

  it('disparar não faz nada quando auto=false', () => {
    const { service, analise } = build({ auto: false });
    service.disparar('a1');
    expect(analise.updateMany).not.toHaveBeenCalled();
  });
});
