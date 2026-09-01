import type { AreaComItens, StatusRequisito } from "./types";

/** Recorte da lista de requisitos na tela de análise (RF-009). `"TODOS"` = sem filtro. */
export type FiltroRequisito = StatusRequisito | "TODOS";

/** Visão inicial: a tela abre priorizando os não conformes (PRD RF-009). */
export const FILTRO_REQUISITO_PADRAO: FiltroRequisito = "NAO_CONFORME";

/** Ordem dos chips no `FiltroStatus`. */
export const FILTRO_REQUISITO_OPCOES: readonly FiltroRequisito[] = [
  "NAO_CONFORME",
  "CONFORME",
  "NAO_SE_APLICA",
  "TODOS",
] as const;

export const FILTRO_REQUISITO_LABEL: Record<FiltroRequisito, string> = {
  NAO_CONFORME: "Não conforme",
  CONFORME: "Conforme",
  NAO_SE_APLICA: "Não se aplica",
  TODOS: "Todos",
};

const SLUG_POR_FILTRO: Record<FiltroRequisito, string> = {
  NAO_CONFORME: "nao-conforme",
  CONFORME: "conforme",
  NAO_SE_APLICA: "nao-se-aplica",
  TODOS: "todos",
};

const FILTRO_POR_SLUG: Record<string, FiltroRequisito> = Object.fromEntries(
  Object.entries(SLUG_POR_FILTRO).map(([filtro, slug]) => [slug, filtro as FiltroRequisito]),
);

/** slug da URL (`?requisitos=`) → filtro; ausente ou desconhecido → padrão ("Não conforme"). */
export function parseFiltroRequisito(valor: string | null | undefined): FiltroRequisito {
  if (!valor) return FILTRO_REQUISITO_PADRAO;
  return FILTRO_POR_SLUG[valor.toLowerCase()] ?? FILTRO_REQUISITO_PADRAO;
}

/** filtro → slug para escrever na URL. */
export function filtroParaSlug(filtro: FiltroRequisito): string {
  return SLUG_POR_FILTRO[filtro];
}

/**
 * Reduz cada grupo aos itens cujo `statusFinal` (parecer atual) casa com o filtro.
 * `"TODOS"` devolve os grupos inalterados. Todos os grupos são preservados — um
 * grupo pode voltar com `itens: []`. Não muta a entrada.
 */
export function filtrarPorStatus(grupos: AreaComItens[], filtro: FiltroRequisito): AreaComItens[] {
  if (filtro === "TODOS") return grupos;
  return grupos.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.filter((item) => item.statusFinal === filtro),
  }));
}

/** Total de itens que passam pelo filtro (para o estado "nenhum não conforme"). */
export function contarPorFiltro(grupos: AreaComItens[], filtro: FiltroRequisito): number {
  return grupos.reduce(
    (soma, grupo) =>
      soma +
      (filtro === "TODOS"
        ? grupo.itens.length
        : grupo.itens.filter((item) => item.statusFinal === filtro).length),
    0,
  );
}
