import { describe, expect, it } from "vitest";
import {
  FILTRO_REQUISITO_OPCOES,
  FILTRO_REQUISITO_PADRAO,
  filtrarPorStatus,
  filtroParaSlug,
  parseFiltroRequisito,
} from "@/lib/data";
import type { AreaComItens, AvaliacaoItem } from "@/lib/data";

function item(id: string, over: Partial<AvaliacaoItem> = {}): AvaliacaoItem {
  return {
    id,
    requisitoId: `r-${id}`,
    codigo: `C-${id}`,
    area: "CHECKLIST_A",
    titulo: `Requisito ${id}`,
    descricao: "…",
    obrigatorio: false,
    ordem: 1,
    norma: { lei: null, artigo: null, inciso: null, paragrafo: null, alinea: null },
    statusSugeridoIa: "CONFORME",
    statusFinal: "CONFORME",
    verificado: false,
    comentario: null,
    paginaReferencia: null,
    ...over,
  };
}

const GRUPOS: AreaComItens[] = [
  {
    area: "CHECKLIST_A",
    itens: [
      item("a1", { statusFinal: "NAO_CONFORME" }),
      item("a2", { statusFinal: "CONFORME" }),
      item("a3", { statusFinal: "NAO_SE_APLICA" }),
    ],
  },
  {
    area: "CHECKLIST_B",
    itens: [item("b1", { area: "CHECKLIST_B", statusFinal: "CONFORME" })],
  },
];

describe("parseFiltroRequisito / filtroParaSlug", () => {
  it("mapeia os slugs conhecidos", () => {
    expect(parseFiltroRequisito("nao-conforme")).toBe("NAO_CONFORME");
    expect(parseFiltroRequisito("conforme")).toBe("CONFORME");
    expect(parseFiltroRequisito("nao-se-aplica")).toBe("NAO_SE_APLICA");
    expect(parseFiltroRequisito("todos")).toBe("TODOS");
    expect(parseFiltroRequisito("TODOS")).toBe("TODOS");
  });

  it("ausente ou desconhecido → padrão 'Não conforme'", () => {
    expect(parseFiltroRequisito(null)).toBe(FILTRO_REQUISITO_PADRAO);
    expect(parseFiltroRequisito(undefined)).toBe("NAO_CONFORME");
    expect(parseFiltroRequisito("")).toBe("NAO_CONFORME");
    expect(parseFiltroRequisito("qualquer-coisa")).toBe("NAO_CONFORME");
  });

  it("filtroParaSlug é o inverso de parseFiltroRequisito", () => {
    for (const filtro of FILTRO_REQUISITO_OPCOES) {
      expect(parseFiltroRequisito(filtroParaSlug(filtro))).toBe(filtro);
    }
  });
});

describe("filtrarPorStatus", () => {
  it("'TODOS' devolve os grupos inalterados", () => {
    expect(filtrarPorStatus(GRUPOS, "TODOS")).toBe(GRUPOS);
  });

  it("filtra os itens de cada grupo por statusFinal", () => {
    const r = filtrarPorStatus(GRUPOS, "NAO_CONFORME");
    expect(r.map((g) => g.itens.map((i) => i.id))).toEqual([["a1"], []]);
  });

  it("preserva todos os grupos, mesmo os que ficam sem itens", () => {
    const r = filtrarPorStatus(GRUPOS, "NAO_SE_APLICA");
    expect(r).toHaveLength(2);
    expect(r[0].area).toBe("CHECKLIST_A");
    expect(r[1].area).toBe("CHECKLIST_B");
    expect(r[1].itens).toEqual([]);
  });

  it("não muta a entrada", () => {
    const antes = JSON.stringify(GRUPOS);
    filtrarPorStatus(GRUPOS, "CONFORME");
    expect(JSON.stringify(GRUPOS)).toBe(antes);
  });
});
