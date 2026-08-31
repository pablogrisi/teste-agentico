import { AvaliacaoRequisito } from '@prisma/client';
import { isStatusRequisito } from '../core/domain/status-requisito';

export interface PatchRevisaoBody {
  statusFinal?: string;
  verificado?: boolean;
  comentario?: string | null;
}

export interface DadosRevisao {
  statusFinal?: string;
  verificado?: boolean;
  comentario?: string | null;
}

export interface ResultadoRevisao {
  erros: string[];
  dados: DadosRevisao;
}

const vazio = (v: string | null | undefined): boolean =>
  v === null || v === undefined || v.trim() === '';

/**
 * Valida o PATCH de revisão e devolve só os campos que mudam.
 *
 * Regras (RF-008/011/017 + P-03 = R-06):
 * - ao menos um dos 3 campos no corpo;
 * - `statusFinal`, se vier, deve ser um dos 3 valores;
 * - alterar `statusFinal` marca `verificado = true`;
 * - `verificado` alterna livre quando o status não muda;
 * - comentário obrigatório se o estado resultante tiver
 *   `statusFinal !== statusSugeridoIa` e nenhum comentário.
 */
export function validarEResolverPatch(
  atual: AvaliacaoRequisito,
  body: PatchRevisaoBody,
): ResultadoRevisao {
  const erros: string[] = [];
  const temStatus = body.statusFinal !== undefined;
  const temVerificado = body.verificado !== undefined;
  const temComentario = body.comentario !== undefined;

  if (!temStatus && !temVerificado && !temComentario) {
    return {
      erros: [
        'informe ao menos um campo: statusFinal, verificado ou comentario',
      ],
      dados: {},
    };
  }

  if (temStatus && !isStatusRequisito(body.statusFinal as string)) {
    erros.push(
      `statusFinal inválido: "${body.statusFinal}" (esperado CONFORME, NAO_CONFORME ou NAO_SE_APLICA)`,
    );
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

  const dados: DadosRevisao = {};
  if (statusMudou) dados.statusFinal = statusFinalResolvido;
  if (verificadoResolvido !== atual.verificado)
    dados.verificado = verificadoResolvido;
  if (comentarioTratado !== undefined && comentarioTratado !== atual.comentario)
    dados.comentario = comentarioTratado;

  return { erros: [], dados };
}
