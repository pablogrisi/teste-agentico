import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnaliseIaOpenAiAdapter } from '../../src/core/adapters/analise-ia.openai-adapter';
import { RequisitoParaIa } from '../../src/core/ports/analise-ia.port';

const mockFilesCreate = jest.fn();
const mockFilesDelete = jest.fn();
const mockResponsesCreate = jest.fn();
const mockGetDocument = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    files: { create: mockFilesCreate, delete: mockFilesDelete },
    responses: { create: mockResponsesCreate },
  })),
  toFile: jest.fn(async (_b: Buffer, nome: string) => ({ __fake_file: nome })),
}));

jest.mock('pdfjs-dist/legacy/build/pdf.js', () => ({
  __esModule: true,
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
}));

const PDF = Buffer.from('%PDF-1.4 fake');

/** Página densa: 22 chars não-espaço × 8 = 176 chars não-espaço/página. */
const PAGINA_RICA = 'lorem ipsum dolor sit amet '.repeat(8).trim();

/**
 * Configura o mock da extração de texto do pdfjs.
 * - `string[]`  → uma página por item (texto quebrado em "palavras" nos itens);
 * - `Error`     → `getDocument().promise` rejeita (extração que lançou).
 */
function stubExtracao(paginas: string[] | Error): void {
  if (paginas instanceof Error) {
    mockGetDocument.mockReturnValue({ promise: Promise.reject(paginas) });
    return;
  }
  const doc = {
    numPages: paginas.length,
    getPage: (n: number) =>
      Promise.resolve({
        getTextContent: () =>
          Promise.resolve({
            items: paginas[n - 1]
              .split(' ')
              .map((str) => ({ str, hasEOL: false })),
          }),
        cleanup: () => undefined,
      }),
    cleanup: () => Promise.resolve(),
    destroy: () => Promise.resolve(),
  };
  mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });
}

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

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockFilesCreate.mockResolvedValue({ id: 'file-abc' });
  mockFilesDelete.mockResolvedValue({});
  // Padrão: PDF com texto nativo aproveitável (3 páginas densas) → caminho texto.
  stubExtracao([PAGINA_RICA, PAGINA_RICA, PAGINA_RICA]);
  warnSpy = jest
    .spyOn(Logger.prototype, 'warn')
    .mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AnaliseIaOpenAiAdapter', () => {
  it('exige OPENAI_API_KEY no construtor', () => {
    expect(
      () => new AnaliseIaOpenAiAdapter(cfg({ 'ia.openaiApiKey': '' })),
    ).toThrow(/OPENAI_API_KEY/);
  });

  describe('caminho texto (primário)', () => {
    it('manda o texto por página como input_text com marcadores "=== Página N ===" e NÃO chama files.create', async () => {
      mockResponsesCreate.mockResolvedValue(
        respostaComSugestoes([
          { codigo: 'CHK-1', statusSugerido: 'CONFORME', paginaReferencia: 2 },
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

      expect(mockFilesCreate).not.toHaveBeenCalled();
      expect(mockFilesDelete).not.toHaveBeenCalled();

      const arg = mockResponsesCreate.mock.calls[0][0];
      expect(arg.model).toBe('gpt-4o');
      expect(arg.input[0].role).toBe('system');
      expect(arg.input[0].content).toContain('=== Página N ===');
      expect(arg.input[0].content).toContain('TEXTO extraído');

      const userContent = arg.input[1].content;
      expect(userContent[0].type).toBe('input_text');
      expect(userContent[0].text).toContain('=== Página 1 ===');
      expect(userContent[0].text).toContain('=== Página 2 ===');
      expect(userContent[1].text).toContain('CHK-1');
      expect(userContent[1].text).toContain('CHK-2');
      expect(
        userContent.some((c: { type: string }) => c.type === 'input_file'),
      ).toBe(false);

      expect(arg.text.format).toMatchObject({
        type: 'json_schema',
        strict: true,
        name: 'sugestoes_requisitos',
      });
      expect(arg.text.format.schema.required).toEqual(['sugestoes']);
      expect(typeof arg.max_output_tokens).toBe('number');

      expect(out).toEqual([
        {
          requisitoId: 'id-CHK-1',
          statusSugerido: 'CONFORME',
          paginaReferencia: 2,
        },
        { requisitoId: 'id-CHK-2', statusSugerido: 'NAO_CONFORME' },
      ]);
    });

    it('descarta codigo desconhecido e statusSugerido inválido', async () => {
      mockResponsesCreate.mockResolvedValue(
        respostaComSugestoes([
          {
            codigo: 'CHK-1',
            statusSugerido: 'CONFORME',
            paginaReferencia: null,
          },
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
      expect(mockFilesCreate).not.toHaveBeenCalled();
      expect(out).toEqual([
        { requisitoId: 'id-CHK-1', statusSugerido: 'CONFORME' },
      ]);
    });

    it('paginaReferencia (do marcador de página) só entra se for inteiro >= 1', async () => {
      mockResponsesCreate.mockResolvedValue(
        respostaComSugestoes([
          { codigo: 'A', statusSugerido: 'CONFORME', paginaReferencia: 0 },
          { codigo: 'B', statusSugerido: 'CONFORME', paginaReferencia: 2.5 },
          { codigo: 'C', statusSugerido: 'CONFORME', paginaReferencia: 3 },
          { codigo: 'D', statusSugerido: 'CONFORME', paginaReferencia: -1 },
          { codigo: 'E', statusSugerido: 'CONFORME', paginaReferencia: null },
        ]),
      );
      const adapter = new AnaliseIaOpenAiAdapter(cfg());
      const out = await adapter.analisar({
        pdf: PDF,
        requisitos: [req('A'), req('B'), req('C'), req('D'), req('E')],
      });
      expect(mockFilesCreate).not.toHaveBeenCalled();
      expect(out).toEqual([
        { requisitoId: 'id-A', statusSugerido: 'CONFORME' },
        { requisitoId: 'id-B', statusSugerido: 'CONFORME' },
        {
          requisitoId: 'id-C',
          statusSugerido: 'CONFORME',
          paginaReferencia: 3,
        },
        { requisitoId: 'id-D', statusSugerido: 'CONFORME' },
        { requisitoId: 'id-E', statusSugerido: 'CONFORME' },
      ]);
    });

    it('divide os requisitos em lotes repetindo o bloco de texto em cada chamada, com ZERO files.create', async () => {
      mockResponsesCreate.mockImplementation(
        (arg: {
          input: [unknown, { content: [{ text: string }, { text: string }] }];
        }) => {
          const bloco = arg.input[1].content[0].text;
          expect(bloco).toContain('=== Página 1 ===');
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
      expect(mockFilesCreate).not.toHaveBeenCalled();
      expect(mockFilesDelete).not.toHaveBeenCalled();
      for (const call of mockResponsesCreate.mock.calls) {
        expect(call[0].input[1].content[0].text).toContain('=== Página 1 ===');
        expect(call[0].input[1].content[0].text).toContain('=== Página 3 ===');
      }
      expect(out.map((s) => s.requisitoId)).toEqual([
        'id-R-0',
        'id-R-1',
        'id-R-2',
        'id-R-3',
        'id-R-4',
      ]);
    });

    it('output_text que não é JSON → erro claro (sem tocar na Files API)', async () => {
      mockResponsesCreate.mockResolvedValue({
        output_text: 'desculpe, não consegui',
      });
      const adapter = new AnaliseIaOpenAiAdapter(cfg());
      await expect(
        adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] }),
      ).rejects.toThrow(/formato esperado/);
      expect(mockFilesCreate).not.toHaveBeenCalled();
    });

    it('JSON sem o array "sugestoes" → erro claro', async () => {
      mockResponsesCreate.mockResolvedValue({
        output_text: '{"resultado":[]}',
      });
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

    it('SDK rejeita no caminho texto → propaga o erro, sem cair no fallback', async () => {
      mockResponsesCreate.mockRejectedValue(new Error('429 rate limit'));
      const adapter = new AnaliseIaOpenAiAdapter(cfg());
      await expect(
        adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] }),
      ).rejects.toThrow('429 rate limit');
      expect(mockFilesCreate).not.toHaveBeenCalled();
    });
  });

  describe('critério de fallback (valores fixos, sem env var)', () => {
    beforeEach(() => {
      mockResponsesCreate.mockResolvedValue(respostaComSugestoes([]));
    });

    it('média exatamente no limiar (100 chars não-espaço/página) → caminho texto', async () => {
      // 2 páginas de 100 chars não-espaço → média = 200 / 2 = 100 (>= 100).
      stubExtracao(['x'.repeat(100), 'x'.repeat(100)]);
      mockResponsesCreate.mockResolvedValue(respostaComSugestoes([]));
      const adapter = new AnaliseIaOpenAiAdapter(cfg());

      await adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] });

      expect(mockFilesCreate).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(
        mockResponsesCreate.mock.calls[0][0].input[1].content[0].text,
      ).toContain('=== Página 1 ===');
    });

    it('média logo abaixo do limiar (99 chars não-espaço/página) → fallback Files API com warn', async () => {
      stubExtracao(['x'.repeat(99), 'x'.repeat(99)]);
      mockResponsesCreate.mockResolvedValue(respostaComSugestoes([]));
      const adapter = new AnaliseIaOpenAiAdapter(cfg());

      await adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] });

      expect(mockFilesCreate).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Texto extraído insuficiente'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('média 99 chars/pág.'),
      );
    });

    it('conta só páginas com >= 20 chars não-espaço como "com texto" (19 não conta)', async () => {
      // página 1: 20 não-espaço (conta) · página 2: 19 (não conta) · página 3: vazia.
      stubExtracao(['y'.repeat(20), 'z'.repeat(19), '']);
      const adapter = new AnaliseIaOpenAiAdapter(cfg());

      await adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] });

      // média 39/3 ≈ 13 < 100 → fallback de qualquer forma; o warn reporta a contagem.
      expect(mockFilesCreate).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 pág. com texto'),
      );
    });

    it('nenhuma página com >= 20 chars não-espaço → 0 pág. com texto → fallback', async () => {
      stubExtracao(['z'.repeat(19), 'z'.repeat(19)]);
      const adapter = new AnaliseIaOpenAiAdapter(cfg());

      await adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] });

      expect(mockFilesCreate).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('0 pág. com texto'),
      );
    });

    it('conta caracteres não-espaço, não o comprimento cru (página cheia de espaços → fallback)', async () => {
      // 50 chars reais + 500 espaços: comprimento 550, mas só 50 não-espaço.
      stubExtracao(['w'.repeat(50) + ' '.repeat(500)]);
      const adapter = new AnaliseIaOpenAiAdapter(cfg());

      await adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] });

      expect(mockFilesCreate).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('média 50 chars/pág.'),
      );
    });

    it('extração que devolve [] → fallback', async () => {
      stubExtracao([]);
      mockResponsesCreate.mockResolvedValue(respostaComSugestoes([]));
      const adapter = new AnaliseIaOpenAiAdapter(cfg());

      await adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] });

      expect(mockFilesCreate).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('0 pág. com texto'),
      );
    });

    it('extração que lança → best-effort devolve [] e cai no fallback (analisar não quebra)', async () => {
      stubExtracao(new Error('parse boom'));
      mockResponsesCreate.mockResolvedValue(respostaComSugestoes([]));
      const adapter = new AnaliseIaOpenAiAdapter(cfg());

      const out = await adapter.analisar({
        pdf: PDF,
        requisitos: [req('CHK-1')],
      });

      expect(out).toEqual([]);
      expect(mockFilesCreate).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Texto extraído insuficiente'),
      );
    });
  });

  describe('caminho arquivo (fallback = TSD-022, inalterado)', () => {
    beforeEach(() => {
      // Força o fallback em todos os testes deste bloco.
      stubExtracao([]);
    });

    it('sobe o PDF, usa PROMPT_SISTEMA_ARQUIVO + input_file e apaga o arquivo', async () => {
      mockResponsesCreate.mockResolvedValue(
        respostaComSugestoes([
          { codigo: 'CHK-1', statusSugerido: 'CONFORME', paginaReferencia: 3 },
        ]),
      );
      const adapter = new AnaliseIaOpenAiAdapter(cfg());

      const out = await adapter.analisar({
        pdf: PDF,
        requisitos: [req('CHK-1')],
      });

      expect(mockFilesCreate).toHaveBeenCalledTimes(1);
      expect(mockFilesCreate.mock.calls[0][0]).toMatchObject({
        purpose: 'user_data',
      });
      const arg = mockResponsesCreate.mock.calls[0][0];
      expect(arg.input[0].content).toContain('Recebe o PDF de um processo');
      expect(arg.input[0].content).not.toContain('=== Página N ===');
      expect(arg.input[1].content[0]).toEqual({
        type: 'input_file',
        file_id: 'file-abc',
      });
      expect(arg.input[1].content[1].text).toContain('CHK-1');
      expect(mockFilesDelete).toHaveBeenCalledWith('file-abc');

      expect(out).toEqual([
        {
          requisitoId: 'id-CHK-1',
          statusSugerido: 'CONFORME',
          paginaReferencia: 3,
        },
      ]);
    });

    it('divide em lotes com um único upload/delete', async () => {
      mockResponsesCreate.mockImplementation(
        (arg: {
          input: [unknown, { content: [unknown, { text: string }] }];
        }) => {
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

    it('output_text que não é JSON → erro claro, e ainda apaga o arquivo', async () => {
      mockResponsesCreate.mockResolvedValue({
        output_text: 'desculpe, não consegui',
      });
      const adapter = new AnaliseIaOpenAiAdapter(cfg());
      await expect(
        adapter.analisar({ pdf: PDF, requisitos: [req('CHK-1')] }),
      ).rejects.toThrow(/formato esperado/);
      expect(mockFilesDelete).toHaveBeenCalledWith('file-abc');
    });

    it('resposta incompleta → erro claro citando o corte', async () => {
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
});
