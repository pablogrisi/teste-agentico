import { isStatusAnalise } from "./status-analise";
import type { ListarAnalisesQuery, OrdemListagem, OrdenarAnalisesPor } from "./types";

export const TAMANHO_PADRAO = 20;
export const TAMANHO_MAX = 100;

const ORDENAR_POR: readonly OrdenarAnalisesPor[] = ["iniciadaEm", "nup"];
const ORDEM: readonly OrdemListagem[] = ["asc", "desc"];

/** Parâmetros crus vindos de `searchParams` do Next (string, lista ou ausente). */
export type ParamsBrutos = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/**
 * Normaliza os parâmetros da URL para uma `ListarAnalisesQuery` válida.
 * Nunca lança: valor inválido cai no default (a UI não deve quebrar por querystring torta).
 */
export function parseListarAnalisesQuery(params: ParamsBrutos): ListarAnalisesQuery {
  const q = (primeiro(params.q) ?? "").trim();

  const statusBruto = params.status;
  const statusLista = (Array.isArray(statusBruto) ? statusBruto : statusBruto ? [statusBruto] : [])
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(isStatusAnalise);
  const status = [...new Set(statusLista)];

  const ordenarPorBruto = primeiro(params.ordenarPor) as OrdenarAnalisesPor | undefined;
  const ordenarPor: OrdenarAnalisesPor =
    ordenarPorBruto && ORDENAR_POR.includes(ordenarPorBruto) ? ordenarPorBruto : "iniciadaEm";

  const ordemBruto = primeiro(params.ordem) as OrdemListagem | undefined;
  const ordem: OrdemListagem = ordemBruto && ORDEM.includes(ordemBruto) ? ordemBruto : "desc";

  const paginaNum = Number.parseInt(primeiro(params.pagina) ?? "", 10);
  const pagina = Number.isFinite(paginaNum) && paginaNum >= 1 ? paginaNum : 1;

  const tamanhoNum = Number.parseInt(primeiro(params.tamanho) ?? "", 10);
  const tamanho = Number.isFinite(tamanhoNum)
    ? Math.min(Math.max(tamanhoNum, 1), TAMANHO_MAX)
    : TAMANHO_PADRAO;

  return { q, status, ordenarPor, ordem, pagina, tamanho };
}

/**
 * Serializa uma query para querystring, omitindo o que for igual ao default
 * (URLs limpas; o backend aplica os mesmos defaults — TSD-005).
 */
export function queryParaString(query: Partial<ListarAnalisesQuery>): string {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.status && query.status.length > 0) sp.set("status", query.status.join(","));
  if (query.ordenarPor && query.ordenarPor !== "iniciadaEm") sp.set("ordenarPor", query.ordenarPor);
  if (query.ordem && query.ordem !== "desc") sp.set("ordem", query.ordem);
  if (query.pagina && query.pagina > 1) sp.set("pagina", String(query.pagina));
  if (query.tamanho && query.tamanho !== TAMANHO_PADRAO) sp.set("tamanho", String(query.tamanho));
  return sp.toString();
}
