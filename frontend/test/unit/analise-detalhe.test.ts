import { describe, expect, it } from "vitest";
import { calcularResumo, contarItens, normaTexto, rotuloArea, separarPorAba } from "@/lib/data";
import type { AreaComItens, AvaliacaoItem } from "@/lib/data";

function item(over: Partial<AvaliacaoItem> & { id: string }): AvaliacaoItem {
  return {
    requisitoId: "r",
    codigo: "C",
    area: "CHECKLIST_X",
    titulo: "t",
    descricao: "d",
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

describe("separarPorAba", () => {
  it("divide os grupos por prefixo da área", () => {
    const grupos: AreaComItens[] = [
      { area: "CHECKLIST_DADOS_GERAIS", itens: [item({ id: "a" })] },
      { area: "TECNICA_ESPEC", itens: [item({ id: "b" })] },
      { area: "checklist_orcamento", itens: [item({ id: "c" })] },
      { area: "OUTRA_COISA", itens: [item({ id: "d" })] },
    ];
    const r = separarPorAba(grupos);
    expect(r.checklist.map((g) => g.area)).toEqual([
      "CHECKLIST_DADOS_GERAIS",
      "checklist_orcamento",
    ]);
    expect(r.tecnica.map((g) => g.area)).toEqual(["TECNICA_ESPEC"]);
    expect(r.outras.map((g) => g.area)).toEqual(["OUTRA_COISA"]);
  });

  it("preserva a ordem recebida", () => {
    const grupos: AreaComItens[] = [
      { area: "CHECKLIST_Z", itens: [] },
      { area: "CHECKLIST_A", itens: [] },
    ];
    expect(separarPorAba(grupos).checklist.map((g) => g.area)).toEqual([
      "CHECKLIST_Z",
      "CHECKLIST_A",
    ]);
  });
});

describe("rotuloArea", () => {
  it("remove o prefixo e formata para exibição", () => {
    expect(rotuloArea("CHECKLIST_DADOS_GERAIS")).toBe("Dados gerais");
    expect(rotuloArea("TECNICA_ESPECIFICACOES")).toBe("Especificacoes");
    expect(rotuloArea("OUTRA")).toBe("Outra");
  });
});

describe("normaTexto", () => {
  it("junta os campos presentes", () => {
    expect(
      normaTexto({
        lei: "Lei 14.133/2021",
        artigo: "18",
        inciso: "I",
        paragrafo: null,
        alinea: null,
      }),
    ).toBe("Lei 14.133/2021, art. 18, inciso I");
  });
  it("vazio quando não há nada", () => {
    expect(
      normaTexto({ lei: null, artigo: null, inciso: null, paragrafo: null, alinea: null }),
    ).toBe("");
  });
});

describe("calcularResumo / contarItens", () => {
  const grupos: AreaComItens[] = [
    {
      area: "CHECKLIST_A",
      itens: [
        item({ id: "1", statusFinal: "NAO_CONFORME", obrigatorio: true, verificado: false }),
        item({ id: "2", statusFinal: "CONFORME", obrigatorio: true, verificado: true }),
      ],
    },
    {
      area: "TECNICA_B",
      itens: [
        item({ id: "3", statusFinal: "NAO_SE_APLICA", obrigatorio: false, verificado: false }),
        item({ id: "4", statusFinal: "NAO_CONFORME", obrigatorio: true, verificado: false }),
      ],
    },
  ];

  it("conta itens", () => {
    expect(contarItens(grupos)).toBe(4);
  });

  it("resumo por statusFinal / verificado / obrigatório", () => {
    expect(calcularResumo(grupos)).toEqual({
      total: 4,
      conforme: 1,
      naoConforme: 2,
      naoSeAplica: 1,
      verificados: 1,
      obrigatoriosPendentes: 2,
    });
  });
});
