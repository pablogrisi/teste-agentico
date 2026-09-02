import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';
// Build `legacy` (UMD/CommonJS) do pdfjs-dist v3 — `require`-ável sob o ts-jest
// CJS atual (o build ESM padrão e o pdfjs v4+ usam `Promise.withResolvers` /
// `import` de ESM e quebram na toolchain, o mesmo atrito que barrou `openai@7` na
// TSD-022). Ver TSD-023 §9 (plano B) e o desvio registrado no §13.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';
import { isStatusRequisito } from '../domain/status-requisito';
import {
  AnalisarInput,
  AnaliseIaPort,
  RequisitoParaIa,
  SugestaoRequisito,
} from '../ports/analise-ia.port';

/**
 * Adapter real da `AnaliseIaPort` (A-02 / TSD-022 + TSD-023).
 *
 * `analisar()` decide **uma vez por análise** entre dois caminhos:
 *
 * 1. **Texto (primário, TSD-023):** extrai o texto do PDF por página no
 *    servidor, monta um bloco com marcadores `=== Página N ===` e manda esse
 *    texto ao modelo como `input_text` — sem subir o binário. Resolve editais
 *    grandes (o smoke da TSD-022 estourou o context window com um edital de 142
 *    páginas enviado inteiro via Files API).
 * 2. **Arquivo (fallback, = TSD-022):** quando o texto extraído é insuficiente
 *    (PDF escaneado, protegido, extração que falhou), sobe o PDF via Files API
 *    (`files.create` → `input_file` → `files.delete`), logando o motivo em `warn`.
 *
 * Selecionado por `IA_ADAPTER=openai` no `CoreModule`. Não é registrado como
 * provider — o factory o instancia só quando escolhido, então o construtor pode
 * exigir a chave sem quebrar o boot no modo `stub`.
 */
@Injectable()
export class AnaliseIaOpenAiAdapter implements AnaliseIaPort {
  private readonly logger = new Logger(AnaliseIaOpenAiAdapter.name);
  private readonly client: OpenAI;
  private readonly modelo: string;
  private readonly maxPorChamada: number;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ia.openaiApiKey', '');
    if (!apiKey) {
      throw new Error('IA_ADAPTER=openai exige OPENAI_API_KEY');
    }
    const baseURL = config.get<string>('ia.baseUrl', '') || undefined;
    this.client = new OpenAI({ apiKey, baseURL });
    this.modelo = config.get<string>('ia.modelo', 'gpt-4o');
    this.maxPorChamada = config.get<number>('ia.maxRequisitosPorChamada', 50);
  }

  async analisar({
    pdf,
    requisitos,
  }: AnalisarInput): Promise<SugestaoRequisito[]> {
    const paginas = await this.extrairTextoPorPagina(pdf);
    const stats = estatisticasTexto(paginas);

    if (textoAproveitavel(paginas)) {
      this.logger.debug(
        `OpenAI (${this.modelo}): analisando por TEXTO extraído ` +
          `(${stats.nPaginasComTexto} pág. com texto; ` +
          `média ${stats.mediaCharsPorPagina} chars/pág.)`,
      );
      return this.analisarPorTexto(montarBlocoTexto(paginas), requisitos);
    }

    this.logger.warn(
      `Texto extraído insuficiente (${stats.nPaginasComTexto} pág. com texto; ` +
        `média ${stats.mediaCharsPorPagina} chars/pág.) — ` +
        `enviando o PDF via Files API (fallback)`,
    );
    return this.analisarPorArquivo(pdf, requisitos);
  }

  /**
   * Extrai o texto do PDF **por página** (um item por página, na ordem do PDF).
   * **Best-effort**, no espírito do `contarPaginasPdf` (TSD-009): qualquer falha
   * (parse, PDF protegido, lib) devolve `[]` — nunca lança. `analisar()` cai no
   * fallback de arquivo quando isso acontece.
   */
  private async extrairTextoPorPagina(pdf: Buffer): Promise<string[]> {
    try {
      const doc = await getDocument({
        data: new Uint8Array(pdf),
        // Extração de texto não precisa avaliar strings de fonte nem renderizar;
        // desligar `isEvalSupported` fecha a superfície da CVE-2024-4367 do
        // pdfjs v3 (execução de JS ao abrir PDF malicioso). Ver TSD-023 §13.
        isEvalSupported: false,
        useSystemFonts: false,
        disableFontFace: true,
        verbosity: 0,
      }).promise;
      try {
        const paginas: string[] = [];
        for (let n = 1; n <= doc.numPages; n += 1) {
          const page = await doc.getPage(n);
          const conteudo = await page.getTextContent();
          const texto = conteudo.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .replace(/[ \t\f\v]+/g, ' ')
            .trim();
          paginas.push(texto);
          page.cleanup();
        }
        return paginas;
      } finally {
        await doc.cleanup();
        await doc.destroy();
      }
    } catch (erro) {
      this.logger.debug(
        `Não foi possível extrair o texto do PDF: ${(erro as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Caminho primário (TSD-023): manda o texto extraído por página, com
   * marcadores `=== Página N ===`, como `input_text`. Sem `files.*`.
   */
  private async analisarPorTexto(
    blocoTexto: string,
    requisitos: RequisitoParaIa[],
  ): Promise<SugestaoRequisito[]> {
    const resultados: SugestaoRequisito[] = [];
    for (let i = 0; i < requisitos.length; i += this.maxPorChamada) {
      const lote = requisitos.slice(i, i + this.maxPorChamada);
      const resposta = await this.client.responses.create({
        model: this.modelo,
        input: [
          { role: 'system', content: PROMPT_SISTEMA_TEXTO },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: blocoTexto },
              { type: 'input_text', text: montarListaRequisitos(lote) },
            ],
          },
        ],
        max_output_tokens: Math.min(16000, lote.length * 64 + 1024),
        text: {
          format: {
            type: 'json_schema',
            name: 'sugestoes_requisitos',
            strict: true,
            schema: SCHEMA_SAIDA,
          },
        },
      });
      resultados.push(...mapearResposta(resposta, lote));
    }
    this.logger.debug(
      `OpenAI (${this.modelo}) [texto]: ${resultados.length}/${requisitos.length} sugestões`,
    );
    return resultados;
  }

  /**
   * Caminho de fallback (= TSD-022, comportamento inalterado): sobe o PDF inteiro
   * via Files API, reusa o `file_id` entre os lotes e apaga o arquivo no
   * `finally`.
   */
  private async analisarPorArquivo(
    pdf: Buffer,
    requisitos: RequisitoParaIa[],
  ): Promise<SugestaoRequisito[]> {
    const arquivo = await this.client.files.create({
      file: await toFile(pdf, 'analise.pdf', { type: 'application/pdf' }),
      purpose: 'user_data',
    });

    try {
      const resultados: SugestaoRequisito[] = [];
      for (let i = 0; i < requisitos.length; i += this.maxPorChamada) {
        const lote = requisitos.slice(i, i + this.maxPorChamada);
        resultados.push(
          ...(await this.analisarLotePorArquivo(arquivo.id, lote)),
        );
      }
      this.logger.debug(
        `OpenAI (${this.modelo}): ${resultados.length}/${requisitos.length} sugestões`,
      );
      return resultados;
    } finally {
      // O PDF não fica retido na OpenAI depois da análise. Best-effort.
      await this.client.files.delete(arquivo.id).catch((erro: unknown) => {
        this.logger.warn(
          `Falha ao apagar o arquivo ${arquivo.id} na OpenAI: ${
            (erro as Error).message
          }`,
        );
      });
    }
  }

  private async analisarLotePorArquivo(
    fileId: string,
    requisitos: RequisitoParaIa[],
  ): Promise<SugestaoRequisito[]> {
    const resposta = await this.client.responses.create({
      model: this.modelo,
      input: [
        { role: 'system', content: PROMPT_SISTEMA_ARQUIVO },
        {
          role: 'user',
          content: [
            { type: 'input_file', file_id: fileId },
            { type: 'input_text', text: montarListaRequisitos(requisitos) },
          ],
        },
      ],
      // Folga para o JSON de saída crescer com o lote (~64 tokens por requisito
      // + margem), teto para não estourar custo. Evita truncar o JSON.
      max_output_tokens: Math.min(16000, requisitos.length * 64 + 1024),
      text: {
        format: {
          type: 'json_schema',
          name: 'sugestoes_requisitos',
          strict: true,
          schema: SCHEMA_SAIDA,
        },
      },
    });

    return mapearResposta(resposta, requisitos);
  }
}

/** Uma página "tem texto" se, tirados os espaços, sobram ao menos tantos chars. */
const MIN_CHARS_PAGINA_COM_TEXTO = 20;
/** Ao menos uma página precisa "ter texto" para o caminho de texto valer. */
const MIN_PAGINAS_COM_TEXTO = 1;
/**
 * Média mínima de caracteres não-espaço por página do PDF para o texto extraído
 * ser considerado aproveitável. Racional (TSD-023 §9): uma página de edital
 * digital real tem 1.500–3.500 chars não-espaço; um PDF puramente escaneado
 * rende ~0. O piso de 100/página é conservador — nenhum edital digital cai
 * abaixo, nenhum documento só-imagem chega perto. Valor fixo de propósito (sem
 * env var); promover a config é follow-up se o smoke pedir.
 */
const MIN_MEDIA_CHARS_POR_PAGINA = 100;

interface EstatisticasTexto {
  nPaginas: number;
  nPaginasComTexto: number;
  totalCharsNaoEspaco: number;
  /** Média de caracteres não-espaço por página do PDF (valor cru, sem arredondar). */
  mediaCharsPorPagina: number;
}

const charsNaoEspaco = (s: string): number => s.replace(/\s/g, '').length;

function estatisticasTexto(paginas: string[]): EstatisticasTexto {
  const nPaginas = paginas.length;
  const nPaginasComTexto = paginas.filter(
    (p) => charsNaoEspaco(p) >= MIN_CHARS_PAGINA_COM_TEXTO,
  ).length;
  const totalCharsNaoEspaco = paginas.reduce(
    (acc, p) => acc + charsNaoEspaco(p),
    0,
  );
  const mediaCharsPorPagina =
    nPaginas > 0 ? Math.round(totalCharsNaoEspaco / nPaginas) : 0;
  return {
    nPaginas,
    nPaginasComTexto,
    totalCharsNaoEspaco,
    mediaCharsPorPagina,
  };
}

/**
 * Critério fixo do fallback (TSD-023 §9): usa o texto extraído quando **ambas**
 * as condições valem — `≥ MIN_PAGINAS_COM_TEXTO` página com texto **e** média
 * `≥ MIN_MEDIA_CHARS_POR_PAGINA` caracteres não-espaço por página. `[]` (extração
 * que falhou/veio vazia) → `false` → caminho de arquivo.
 */
function textoAproveitavel(paginas: string[]): boolean {
  if (paginas.length === 0) return false;
  const nPaginas = paginas.length;
  const nPaginasComTexto = paginas.filter(
    (p) => charsNaoEspaco(p) >= MIN_CHARS_PAGINA_COM_TEXTO,
  ).length;
  const totalCharsNaoEspaco = paginas.reduce(
    (acc, p) => acc + charsNaoEspaco(p),
    0,
  );
  const media = totalCharsNaoEspaco / nPaginas;
  return (
    nPaginasComTexto >= MIN_PAGINAS_COM_TEXTO &&
    media >= MIN_MEDIA_CHARS_POR_PAGINA
  );
}

/**
 * Concatena as páginas com o marcador que o `PROMPT_SISTEMA_TEXTO` referencia:
 * ```
 * === Página 1 ===
 * <texto da página 1>
 *
 * === Página 2 ===
 * <texto da página 2>
 * ```
 * O `N` do marcador é `índice + 1` (a lib devolve as páginas na ordem do PDF).
 */
function montarBlocoTexto(paginas: string[]): string {
  return paginas
    .map((texto, i) => `=== Página ${i + 1} ===\n${texto}\n`)
    .join('\n');
}

/** Resposta do `responses.create` no que o adapter consome (estrutural). */
interface RespostaModelo {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output_text: string;
}

/**
 * Parse do `output_text` + mapeamento `codigo → requisitoId` + descarte de
 * `codigo`/`status` inválido + filtro de `paginaReferencia` (inteiro `≥ 1`) +
 * tratamento de `status === 'incomplete'`. Compartilhado pelos dois caminhos
 * (texto e arquivo) — TSD-023 §2.
 */
function mapearResposta(
  resposta: RespostaModelo,
  requisitosDoLote: RequisitoParaIa[],
): SugestaoRequisito[] {
  if (resposta.status === 'incomplete') {
    throw new Error(
      `resposta da IA incompleta (${
        resposta.incomplete_details?.reason ?? 'motivo desconhecido'
      }) — reduza IA_MAX_REQUISITOS_POR_CHAMADA`,
    );
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(resposta.output_text);
  } catch {
    throw new Error('resposta da IA fora do formato esperado (JSON inválido)');
  }
  const sugestoes = extrairSugestoes(bruto);

  const porCodigo = new Map(
    requisitosDoLote.map((r) => [r.codigo, r.requisitoId]),
  );
  const saida: SugestaoRequisito[] = [];
  for (const s of sugestoes) {
    const requisitoId = porCodigo.get(s.codigo);
    if (!requisitoId || !isStatusRequisito(s.statusSugerido)) continue;
    const pagina =
      typeof s.paginaReferencia === 'number' &&
      Number.isInteger(s.paginaReferencia) &&
      s.paginaReferencia >= 1
        ? s.paginaReferencia
        : undefined;
    saida.push({
      requisitoId,
      statusSugerido: s.statusSugerido,
      ...(pagina !== undefined ? { paginaReferencia: pagina } : {}),
    });
  }
  return saida;
}

const PROMPT_SISTEMA_ARQUIVO = [
  'Você é um analista de conformidade de licitações públicas brasileiras (Lei nº 14.133/2021).',
  'Recebe o PDF de um processo licitatório e uma lista de requisitos a verificar.',
  'Para CADA requisito da lista, decida, com base APENAS no conteúdo do PDF:',
  '- "CONFORME": o PDF atende ao requisito;',
  '- "NAO_CONFORME": o PDF contraria ou não atende ao requisito;',
  '- "NAO_SE_APLICA": o requisito não é pertinente a este processo.',
  'Quando houver evidência clara numa página específica, informe "paginaReferencia" (número da página, começando em 1); senão, use null.',
  'Responda SOMENTE no formato JSON pedido, com um item por requisito recebido.',
].join('\n');

const PROMPT_SISTEMA_TEXTO = [
  'Você é um analista de conformidade de licitações públicas brasileiras (Lei nº 14.133/2021).',
  'Recebe o TEXTO extraído de um processo licitatório e uma lista de requisitos a verificar.',
  'O texto está dividido por marcadores de página no formato "=== Página N ===", onde N é o número da página no PDF original (começando em 1). Todo o conteúdo entre um marcador e o próximo pertence àquela página.',
  'Para CADA requisito da lista, decida, com base APENAS no conteúdo do texto:',
  '- "CONFORME": o texto atende ao requisito;',
  '- "NAO_CONFORME": o texto contraria ou não atende ao requisito;',
  '- "NAO_SE_APLICA": o requisito não é pertinente a este processo.',
  'Quando a evidência estiver numa página específica, informe em "paginaReferencia" o número N do marcador "=== Página N ===" imediatamente anterior ao trecho que sustenta a conclusão; se não houver evidência localizável numa página, use null.',
  'O texto pode conter ruído de extração (hifenização de fim de linha, ligaduras, ordem de colunas/tabelas imperfeita) — interprete com tolerância.',
  'Responda SOMENTE no formato JSON pedido, com um item por requisito recebido.',
].join('\n');

/** JSON Schema (strict) da saída esperada do modelo. */
const SCHEMA_SAIDA = {
  type: 'object',
  additionalProperties: false,
  required: ['sugestoes'],
  properties: {
    sugestoes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['codigo', 'statusSugerido', 'paginaReferencia'],
        properties: {
          codigo: { type: 'string' },
          statusSugerido: {
            type: 'string',
            enum: ['CONFORME', 'NAO_CONFORME', 'NAO_SE_APLICA'],
          },
          paginaReferencia: { type: ['integer', 'null'] },
        },
      },
    },
  },
} as const;

function montarListaRequisitos(requisitos: RequisitoParaIa[]): string {
  const linhas = requisitos.map(
    (r) =>
      `- codigo: ${r.codigo}\n  titulo: ${r.titulo}\n  descricao: ${r.descricao}`,
  );
  return `Requisitos a verificar (${requisitos.length}):\n${linhas.join('\n')}`;
}

interface SugestaoBruta {
  codigo: string;
  statusSugerido: string;
  paginaReferencia: number | null;
}

/** Lê `{ sugestoes: [...] }` do corpo devolvido pelo modelo; lança se a forma não bate. */
function extrairSugestoes(bruto: unknown): SugestaoBruta[] {
  if (
    typeof bruto !== 'object' ||
    bruto === null ||
    !Array.isArray((bruto as { sugestoes?: unknown }).sugestoes)
  ) {
    throw new Error(
      'resposta da IA fora do formato esperado (sem "sugestoes")',
    );
  }
  return (bruto as { sugestoes: unknown[] }).sugestoes.map((s) => {
    const o = (typeof s === 'object' && s !== null ? s : {}) as Record<
      string,
      unknown
    >;
    return {
      codigo: typeof o.codigo === 'string' ? o.codigo : '',
      statusSugerido:
        typeof o.statusSugerido === 'string' ? o.statusSugerido : '',
      paginaReferencia:
        typeof o.paginaReferencia === 'number' ? o.paginaReferencia : null,
    };
  });
}
