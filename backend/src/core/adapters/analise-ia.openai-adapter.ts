import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';
import { isStatusRequisito } from '../domain/status-requisito';
import {
  AnalisarInput,
  AnaliseIaPort,
  RequisitoParaIa,
  SugestaoRequisito,
} from '../ports/analise-ia.port';

/**
 * Adapter real da `AnaliseIaPort` (A-02 / TSD-022): manda o PDF do processo e a
 * lista de requisitos para um modelo GPT da OpenAI e devolve, por requisito, a
 * sugestão de conformidade + a página da evidência (quando o modelo indicar).
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
    const arquivo = await this.client.files.create({
      file: await toFile(pdf, 'analise.pdf', { type: 'application/pdf' }),
      purpose: 'user_data',
    });

    try {
      const resultados: SugestaoRequisito[] = [];
      for (let i = 0; i < requisitos.length; i += this.maxPorChamada) {
        const lote = requisitos.slice(i, i + this.maxPorChamada);
        resultados.push(...(await this.analisarLote(arquivo.id, lote)));
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

  private async analisarLote(
    fileId: string,
    requisitos: RequisitoParaIa[],
  ): Promise<SugestaoRequisito[]> {
    const resposta = await this.client.responses.create({
      model: this.modelo,
      input: [
        { role: 'system', content: PROMPT_SISTEMA },
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
      throw new Error(
        'resposta da IA fora do formato esperado (JSON inválido)',
      );
    }
    const sugestoes = extrairSugestoes(bruto);

    const porCodigo = new Map(requisitos.map((r) => [r.codigo, r.requisitoId]));
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
}

const PROMPT_SISTEMA = [
  'Você é um analista de conformidade de licitações públicas brasileiras (Lei nº 14.133/2021).',
  'Recebe o PDF de um processo licitatório e uma lista de requisitos a verificar.',
  'Para CADA requisito da lista, decida, com base APENAS no conteúdo do PDF:',
  '- "CONFORME": o PDF atende ao requisito;',
  '- "NAO_CONFORME": o PDF contraria ou não atende ao requisito;',
  '- "NAO_SE_APLICA": o requisito não é pertinente a este processo.',
  'Quando houver evidência clara numa página específica, informe "paginaReferencia" (número da página, começando em 1); senão, use null.',
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
