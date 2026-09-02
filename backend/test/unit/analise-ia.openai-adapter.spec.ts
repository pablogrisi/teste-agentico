import { ConfigService } from '@nestjs/config';
import { AnaliseIaOpenAiAdapter } from '../../src/core/adapters/analise-ia.openai-adapter';
import { RequisitoParaIa } from '../../src/core/ports/analise-ia.port';

const mockFilesCreate = jest.fn();
const mockFilesDelete = jest.fn();
const mockResponsesCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    files: { create: mockFilesCreate, delete: mockFilesDelete },
    responses: { create: mockResponsesCreate },
  })),
  toFile: jest.fn(async (_b: Buffer, nome: string) => ({ __fake_file: nome })),
}));

const PDF = Buffer.from('%PDF-1.4 fake');

function cfg(over: Record<string, unknown> = {}): ConfigService {
  const vals: Record<string, unknown> = {
    'ia.openaiApiKey': 'sk-test',
    'ia.modelo': 'gpt-4o',
    'ia.baseUrl': '',
    'ia.maxRequisitosPorChamada': 50,
    ...over,
  };
  return {
    get: (k: string, d?: unknown) => (k in vals ? vals[k] : d),
  } as unknown as ConfigService;
}

const req = (codigo: string): RequisitoParaIa => ({
  requisitoId: `id-${codigo}`,
  codigo,
  titulo: `Título ${codigo}`,
  descricao: `Descrição ${codigo}`,
});

const respostaComSugestoes = (sugestoes: unknown[]) => ({
  output_text: JSON.stringify({ sugestoes }),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFilesCreate.mockResolvedValue({ id: 'file-abc' });
  mockFilesDelete.mockResolvedValue({});
});

describe('AnaliseIaOpenAiAdapter', () => {
  it('exige OPENAI_API_KEY no construtor', () => {
    expect(
      () => new AnaliseIaOpenAiAdapter(cfg({ 'ia.openaiApiKey': '' })),
    ).toThrow(/OPENAI_API_KEY/);
  });

  it('sobe o PDF, chama responses.create com o file_id + lista de requisitos + json_schema e mapeia por codigo', async () => {
    mockResponsesCreate.mockResolvedValue(
      respostaComSugestoes([
        { codigo: 'CHK-1', statusSugerido: 'CONFORME', paginaReferencia: 3 },
        {
          codigo: 'CHK-2',
          statusSugerido: 'NAO_CONFORME',
          paginaReferencia: null,
        },
      ]),
    );
    const adapter = new AnaliseIaOpenAiAdapter(cfg());

    const out = await adapter.analisar({
      pdf: PDF,
      requisitos: [req('CHK-1'), req('CHK-2')],
    });

    expect(mockFilesCreate).toHaveBeenCalledTimes(1);
    expect(mockFilesCreate.mock.calls[0][0]).toMatchObject({
      purpose: 'user_data',
    });
    const arg = mockResponsesCreate.mock.calls[0][0];
    expect(arg.model).toBe('gpt-4o');
    expect(arg.text.format).toMatchObject({
      type: 'json_schema',
      strict: true,
      name: 'sugestoes_requisitos',
    });
    expect(arg.text.format.schema).toBeDefined();
    expect(arg.text.format.schema.required).toEqual(['sugestoes']);
    expect(typeof arg.max_output_tokens).toBe('number');
    expect(arg.input[0]).toEqual({
      role: 'system',
      content: expect.any(String),
    });
    const userContent = arg.input[1].content;
    expect(userContent[0]).toEqual({ type: 'input_file', file_id: 'file-abc' });
    expect(userContent[1].text).toContain('CHK-1');
    expect(userContent[1].text).toContain('CHK-2');

    expect(out).toEqual([
      {
        requisitoId: 'id-CHK-1',
        statusSugerido: 'CONFORME',
        paginaReferencia: 3,
      },
      { requisitoId: 'id-CHK-2', statusSugerido: 'NAO_CONFORME' },
    ]);
  });

  it('descarta codigo desconhecido e statusSugerido inválido', async () => {
    mockResponsesCreate.mockResolvedValue(
      respostaComSugestoes([
        { codigo: 'CHK-1', statusSugerido: 'CONFORME', paginaReferencia: null },
        {
          codigo: 'NAO-EXISTE',
          statusSugerido: 'CONFORME',
          paginaReferencia: null,
        },
        {
          codigo: 'CHK-2',
          statusSugerido: 'COM_RESSALVA',
          paginaReferencia: null,
        },
      ]),
    );
    const adapter = new AnaliseIaOpenAiAdapter(cfg());
    const out = await adapter.analisar({
      pdf: PDF,
      requisitos: [req('CHK-1'), req('CHK-2')],
    });
    expect(out).toEqual([
      { requisitoId: 'id-CHK-1', statusSugerido: 'CONFORME' },
    ]);
  });

  it('paginaReferencia só entra se for inteiro >= 1', async () => {
    mockResponsesCreate.mockResolvedValue(
      respostaComSugestoes([
        { codigo: 'A', statusSugerido: 'CONFORME', paginaReferencia: 0 },
        { codigo: 'B', statusSugerido: 'CONFORME', paginaReferencia: 2.5 },
        { codigo: 'C', statusSugerido: 'CONFORME', paginaReferencia: 7 },
        { codigo: 'D', statusSugerido: 'CONFORME', paginaReferencia: -1 },
      ]),
    );
    const adapter = new AnaliseIaOpenAiAdapter(cfg());
    const out = await adapter.analisar({
      pdf: PDF,
      requisitos: [req('A'), req('B'), req('C'), req('D')],
    });
    expect(out).toEqual([
      { requisitoId: 'id-A', statusSugerido: 'CONFORME' },
      { requisitoId: 'id-B', statusSugerido: 'CONFORME' },
      { requisitoId: 'id-C', statusSugerido: 'CONFORME', paginaReferencia: 7 },
      { requisitoId: 'id-D', statusSugerido: 'CONFORME' },
    ]);
  });

  it('divide em lotes quando passa de IA_MAX_REQUISITOS_POR_CHAMADA, com um único upload/delete', async () => {
    mockResponsesCreate.mockImplementation(
      (arg: { input: [unknown, { content: [unknown, { text: string }] }] }) => {
        const texto = arg.input[1].content[1].text;
        const codigos = [...texto.matchAll(/codigo: (R-\d+)/g)].map(
          (m) => m[1],
        );
        return Promise.resolve(
          respostaComSugestoes(
            codigos.map((c) => ({
              codigo: c,
              statusSugerido: 'NAO_SE_APLICA',
              paginaReferencia: null,
            })),
          ),
        );
      },
    );
    const adapter = new AnaliseIaOpenAiAdapter(
      cfg({ 'ia.maxRequisitosPorChamada': 2 }),
    );
    const requisitos = Array.from({ length: 5 }, (_, i) => req(`R-${i}`));

    const out = await adapter.analisar({ pdf: PDF, requisitos });

    expect(mockResponsesCreate).toHaveBeenCalledTimes(3); // 2 + 2 + 1
    expect(mockFilesCreate).toHaveBeenCalledTimes(1);
    expect(mockFilesDelete).toHaveBeenCalledTimes(1);
    expect(out).toHaveLength(5);
    expect(out.map((s) => s.requisitoId)).toEqual([
      'id-R-0',
      'id-R-1',
      'id-R-2',
      'id-R-3',
      'id-R-4',
    ]);
  });

  it('apaga o arquivo mesmo quando responses.create rejeita, e propaga o erro', async () => {
    mockResponsesCreate.mockRejectedValue(new Error('429 rate limit'));
    const adapter = new AnaliseIaOpenAiAdapter(cfg());

    await expect(
      adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] }),
    ).rejects.toThrow('429 rate limit');
    expect(mockFilesDelete).toHaveBeenCalledWith('file-abc');
  });

  it('output_text que não é JSON → erro claro', async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: 'desculpe, não consegui',
    });
    const adapter = new AnaliseIaOpenAiAdapter(cfg());
    await expect(
      adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] }),
    ).rejects.toThrow(/formato esperado/);
  });

  it('JSON sem o array "sugestoes" → erro claro', async () => {
    mockResponsesCreate.mockResolvedValue({ output_text: '{"resultado":[]}' });
    const adapter = new AnaliseIaOpenAiAdapter(cfg());
    await expect(
      adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] }),
    ).rejects.toThrow(/sugestoes/);
  });

  it('resposta incompleta (max_output_tokens) → erro claro citando o corte', async () => {
    mockResponsesCreate.mockResolvedValue({
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
      output_text: '',
    });
    const adapter = new AnaliseIaOpenAiAdapter(cfg());
    await expect(
      adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] }),
    ).rejects.toThrow(/incompleta.*IA_MAX_REQUISITOS_POR_CHAMADA/s);
  });
});
