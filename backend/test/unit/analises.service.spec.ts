import {
  BadGatewayException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AnalisesService } from '../../src/analises/analises.service';

const PDF = Buffer.from('%PDF-1.4 ok');

function build(over: {
  validarErros?: string[];
  salvar?: jest.Mock;
  create?: jest.Mock;
  findFirst?: jest.Mock;
  ler?: jest.Mock;
}) {
  const validacao = {
    validar: jest.fn().mockReturnValue(over.validarErros ?? []),
  };
  const analistaAtual = {
    getAnalistaAtual: () => ({ analistaId: 'analista-mvp', nome: 'MVP' }),
  };
  const armazenamentoPdf = {
    salvar: over.salvar ?? jest.fn().mockResolvedValue('ref-123.pdf'),
    ler: over.ler ?? jest.fn().mockResolvedValue(PDF),
    lerPagina: jest.fn(),
  };
  const prisma = {
    analise: {
      create:
        over.create ??
        jest.fn().mockResolvedValue({ id: 'a1', status: 'PENDENTE' }),
      findFirst: over.findFirst ?? jest.fn(),
    },
  };
  const service = new AnalisesService(
    prisma as never,
    validacao as never,
    analistaAtual as never,
    armazenamentoPdf as never,
  );
  return { service, validacao, armazenamentoPdf, prisma };
}

const entrada = {
  nup: 'NUP-1',
  objeto: 'Objeto',
  arquivo: { mimetype: 'application/pdf', size: PDF.length, buffer: PDF },
};

describe('AnalisesService.criar', () => {
  it('valida, persiste o PDF e cria a análise PENDENTE', async () => {
    const { service, armazenamentoPdf, prisma } = build({});
    await service.criar(entrada);

    expect(armazenamentoPdf.salvar).toHaveBeenCalledWith(PDF);
    expect(prisma.analise.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nup: 'NUP-1',
        objeto: 'Objeto',
        analistaId: 'analista-mvp',
        arquivoPdfRef: 'ref-123.pdf',
        status: 'PENDENTE',
      }),
    });
  });

  it('lança 422 e não toca no armazenamento quando a validação falha', async () => {
    const { service, armazenamentoPdf, prisma } = build({
      validarErros: ['nup é obrigatório'],
    });
    await expect(service.criar(entrada)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(armazenamentoPdf.salvar).not.toHaveBeenCalled();
    expect(prisma.analise.create).not.toHaveBeenCalled();
  });

  it('lança 502 e não cria linha quando a gravação do PDF falha', async () => {
    const { service, prisma } = build({
      salvar: jest.fn().mockRejectedValue(new Error('disco cheio')),
    });
    await expect(service.criar(entrada)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.analise.create).not.toHaveBeenCalled();
  });

  it('propaga o erro se o create falhar após o PDF já ter sido gravado', async () => {
    const { service } = build({
      create: jest.fn().mockRejectedValue(new Error('constraint')),
    });
    await expect(service.criar(entrada)).rejects.toThrow('constraint');
  });
});

describe('AnalisesService.buscarPorId / lerPdf', () => {
  it('404 quando a análise não existe para o analista atual', async () => {
    const { service } = build({ findFirst: jest.fn().mockResolvedValue(null) });
    await expect(service.buscarPorId('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lerPdf devolve os bytes e um nome de arquivo', async () => {
    const { service } = build({
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'a1', arquivoPdfRef: 'ref-123.pdf' }),
    });
    const r = await service.lerPdf('a1');
    expect(r.bytes).toBe(PDF);
    expect(r.nomeArquivo).toBe('analise-a1.pdf');
  });

  it('lerPdf → 404 quando o arquivo não pode ser lido', async () => {
    const { service } = build({
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'a1', arquivoPdfRef: 'sumiu.pdf' }),
      ler: jest.fn().mockRejectedValue(new Error('ENOENT')),
    });
    await expect(service.lerPdf('a1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
