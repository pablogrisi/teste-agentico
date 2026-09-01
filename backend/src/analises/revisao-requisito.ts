import { AvaliacaoRequisito } from '@prisma/client';
import { isStatusRequisito } from '../core/domain/status-requisito';

export interface PatchRevisaoBody {
  statusFinal?: string;
  verificado?: boolean;
  comentario?: string | null;
  paginaReferencia?: number | null;
}

export interface DadosRevisao {
  statusFinal?: string;
  verificado?: boolean;
  comentario?: string | null;
  paginaReferencia?: number | null;
}

export interface ResultadoRevisao {
  erros: string[];
  dados: DadosRevisao;
}

const vazio = (v: string | null | undefined): boolean =>
  v === null || v === undefined || v.trim() === '';

/**
 * Valida `paginaReferencia` (RF-014). Devolve mensagem de erro ou `null` se ok.
 * Regras: `null` limpa (sempre válido); número deve ser inteiro `>= 1` e, quando
 * `totalPaginasPdf` é conhecido, `<= totalPaginasPdf`; qualquer outro tipo é erro.
 */
function erroPaginaReferencia(
  valor: unknown,
  totalPaginasPdf: number | null,
): string | null {
  if (valor === null) return null;
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 1) {
    return totalPaginasPdf !== null
      ? `paginaReferencia deve ser um inteiro entre 1 e ${totalPaginasPdf}, ou null para limpar`
      : 'paginaReferencia deve ser um inteiro >= 1, ou null para limpar';
  }
  if (totalPaginasPdf !== null && valor > totalPaginasPdf) {
    return `paginaReferencia deve ser um inteiro entre 1 e ${totalPaginasPdf}, ou null para limpar`;
  }
  return null;
}

/**
 * Valida o PATCH de revisão e devolve só os campos que mudam.
 *
 * Regras (RF-008/011/017 + P-03 = R-06 + RF-014):
 * - ao menos um dos 4 campos no corpo;
 * - `statusFinal`, se vier, deve ser um dos 3 valores;
 * - alterar `statusFinal` marca `verificado = true`;
 * - `verificado` alterna livre quando o status não muda;
 * - comentário obrigatório se o estado resultante tiver
 *   `statusFinal !== statusSugeridoIa` e nenhum comentário;
 * - `paginaReferencia`: inteiro `1..totalPaginasPdf` (ou `>= 1` quando o total é
 *   desconhecido), ou `null` para limpar. **Não** dispara a regra de comentário.
 */
export function validarEResolverPatch(
  atual: AvaliacaoRequisito,
  body: PatchRevisaoBody,
  totalPaginasPdf: number | null = null,
): ResultadoRevisao {
  const erros: string[] = [];
  const temStatus = body.statusFinal !== undefined;
  const temVerificado = body.verificado !== undefined;
  const temComentario = body.comentario !== undefined;
  const temPagina = body.paginaReferencia !== undefined;

  if (!temStatus && !temVerificado && !temComentario && !temPagina) {
    return {
      erros: [
        'informe ao menos um campo: statusFinal, verificado, comentario ou paginaReferencia',
      ],
      dados: {},
    };
  }

  if (temStatus && !isStatusRequisito(body.statusFinal as string)) {
    erros.push(
      `statusFinal inválido: "${body.statusFinal}" (esperado CONFORME, NAO_CONFORME ou NAO_SE_APLICA)`,
    );
  }

  if (temPagina) {
    const erroPagina = erroPaginaReferencia(
      body.paginaReferencia,
      totalPaginasPdf,
    );
    if (erroPagina) erros.push(erroPagina);
  }

  // comentário tratado: string → trim; '' ou espaços → null (limpar)
  const comentarioTratado = temComentario
    ? vazio(body.comentario ?? null)
      ? null
      : (body.comentario as string).trim()
    : undefined;

  if (erros.length > 0) return { erros, dados: {} };

  const statusFinalResolvido = temStatus
    ? (body.statusFinal as string)
    : atual.statusFinal;
  const statusMudou = temStatus && body.statusFinal !== atual.statusFinal;

  const verificadoResolvido = statusMudou
    ? true
    : temVerificado
      ? (body.verificado as boolean)
      : atual.verificado;

  const comentarioResolvido =
    comentarioTratado !== undefined ? comentarioTratado : atual.comentario;

  if (
    statusFinalResolvido !== atual.statusSugeridoIa &&
    vazio(comentarioResolvido)
  ) {
    erros.push(
      'comentário obrigatório quando o parecer final difere da sugestão da IA',
    );
    return { erros, dados: {} };
  }

  const paginaReferenciaResolvida = temPagina
    ? (body.paginaReferencia as number | null)
    : atual.paginaReferencia;

  const dados: DadosRevisao = {};
  if (statusMudou) dados.statusFinal = statusFinalResolvido;
  if (verificadoResolvido !== atual.verificado)
    dados.verificado = verificadoResolvido;
  if (comentarioTratado !== undefined && comentarioTratado !== atual.comentario)
    dados.comentario = comentarioTratado;
  if (temPagina && paginaReferenciaResolvida !== atual.paginaReferencia)
    dados.paginaReferencia = paginaReferenciaResolvida;

  return { erros: [], dados };
}
