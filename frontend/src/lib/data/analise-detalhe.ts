import type { AreaComItens, AvaliacaoItem, ResumoAnalise } from "./types";

/** Prefixos de `area` definidos pelo backend (RF-006 / `src/requisitos/areas.ts`). */
export const AREA_CHECKLIST_PREFIXO = "CHECKLIST";
export const AREA_TECNICA_PREFIXO = "TECNICA";

/** O parecer atual do analista já difere da sugestão da IA (RF-007; passa a ocorrer com RF-008). */
export function divergeDaIa(
  item: Pick<AvaliacaoItem, "statusFinal" | "statusSugeridoIa">,
): boolean {
  return item.statusFinal !== item.statusSugeridoIa;
}

/** Intervalo de re-busca da tela de análise enquanto o status está em processamento. */
export const ANALISE_POLL_MS = 4000;

export type AbaAnalise = "checklist" | "tecnica";

export interface AvaliacoesPorAba {
  checklist: AreaComItens[];
  tecnica: AreaComItens[];
  /** Áreas fora da convenção `CHECKLIST_`/`TECNICA_` — improvável no MVP, mas não some com dado. */
  outras: AreaComItens[];
}

/** Divide os grupos de área nas abas Checklist / Técnica (pelo prefixo da `area`). */
export function separarPorAba(grupos: AreaComItens[]): AvaliacoesPorAba {
  const checklist: AreaComItens[] = [];
  const tecnica: AreaComItens[] = [];
  const outras: AreaComItens[] = [];
  for (const grupo of grupos) {
    const area = grupo.area.toUpperCase();
    if (area.startsWith(AREA_CHECKLIST_PREFIXO)) checklist.push(grupo);
    else if (area.startsWith(AREA_TECNICA_PREFIXO)) tecnica.push(grupo);
    else outras.push(grupo);
  }
  return { checklist, tecnica, outras };
}

/** "CHECKLIST_DADOS_GERAIS" → "Dados gerais". */
export function rotuloArea(area: string): string {
  const semPrefixo = area.replace(/^(CHECKLIST|TECNICA)[\s_-]*/i, "");
  const base = (semPrefixo || area).replace(/[_-]+/g, " ").trim().toLowerCase();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Total de itens numa lista de grupos de área. */
export function contarItens(grupos: AreaComItens[]): number {
  return grupos.reduce((soma, grupo) => soma + grupo.itens.length, 0);
}

/** Deriva o `resumo` a partir das avaliações (mesma regra do backend — TSD-007 §3). */
export function calcularResumo(avaliacoesPorArea: AreaComItens[]): ResumoAnalise {
  const itens = avaliacoesPorArea.flatMap((grupo) => grupo.itens);
  return {
    total: itens.length,
    conforme: itens.filter((i) => i.statusFinal === "CONFORME").length,
    naoConforme: itens.filter((i) => i.statusFinal === "NAO_CONFORME").length,
    naoSeAplica: itens.filter((i) => i.statusFinal === "NAO_SE_APLICA").length,
    verificados: itens.filter((i) => i.verificado).length,
    obrigatoriosPendentes: itens.filter((i) => i.obrigatorio && !i.verificado).length,
  };
}

/** Norma estruturada → texto ("Lei 14.133/2021, art. 18, inciso I"). Vazio se não houver nada. */
export function normaTexto(norma: {
  lei: string | null;
  artigo: string | null;
  inciso: string | null;
  paragrafo: string | null;
  alinea: string | null;
}): string {
  const partes: string[] = [];
  if (norma.lei) partes.push(norma.lei);
  if (norma.artigo) partes.push(`art. ${norma.artigo}`);
  if (norma.inciso) partes.push(`inciso ${norma.inciso}`);
  if (norma.paragrafo) partes.push(`§ ${norma.paragrafo}`);
  if (norma.alinea) partes.push(`alínea ${norma.alinea}`);
  return partes.join(", ");
}
