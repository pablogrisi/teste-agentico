import type { AlteracaoParecerInput, AvaliacaoItem, StatusRequisito } from "./types";

/** Os três pareceres possíveis (a UI do modal filtra o status atual). */
export const PARECER_OPCOES: readonly StatusRequisito[] = [
  "CONFORME",
  "NAO_CONFORME",
  "NAO_SE_APLICA",
] as const;

export interface EntradaAlteracaoParecer {
  /** Escolha no select ("" = ainda não escolheu). */
  statusFinal: StatusRequisito | "";
  /** Parecer que o requisito tem hoje. */
  statusAtual: StatusRequisito;
  /** Sugestão da IA — para a mensagem ficar específica quando diverge (R-06). */
  statusSugeridoIa: StatusRequisito;
  comentario: string;
}

export interface ErrosAlteracaoParecer {
  statusFinal?: string;
  comentario?: string;
}

/**
 * Validação client-side do modal "Alterar parecer" (RF-008). Espelha a regra R-06
 * (comentário obrigatório quando o parecer diverge da sugestão da IA) — mas neste fluxo
 * o comentário é sempre exigido, então a regra fica coberta com folga.
 */
export function validarAlteracaoParecer(entrada: EntradaAlteracaoParecer): {
  ok: boolean;
  erros: ErrosAlteracaoParecer;
  divergeDaSugestao: boolean;
} {
  const erros: ErrosAlteracaoParecer = {};
  const divergeDaSugestao =
    entrada.statusFinal !== "" && entrada.statusFinal !== entrada.statusSugeridoIa;

  if (entrada.statusFinal === "") {
    erros.statusFinal = "Escolha o novo parecer.";
  } else if (entrada.statusFinal === entrada.statusAtual) {
    erros.statusFinal = "Escolha um parecer diferente do atual.";
  }

  if (entrada.comentario.trim() === "") {
    erros.comentario = divergeDaSugestao
      ? "Comentário obrigatório: explique por que o parecer difere da sugestão da IA."
      : "Comentário é obrigatório.";
  }

  return { ok: Object.keys(erros).length === 0, erros, divergeDaSugestao };
}

/**
 * Aplica a alteração de parecer a uma avaliação, com as mesmas regras do backend (TSD-008):
 * grava `statusFinal`, liga `verificado` (RF-011) e faz `trim` no comentário. Puro; não muta.
 */
export function resolverAlteracaoParecer(
  atual: AvaliacaoItem,
  patch: AlteracaoParecerInput,
): AvaliacaoItem {
  return {
    ...atual,
    statusFinal: patch.statusFinal,
    verificado: true,
    comentario: patch.comentario.trim(),
  };
}
