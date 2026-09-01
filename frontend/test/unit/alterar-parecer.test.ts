import { describe, expect, it } from "vitest";
import { PARECER_OPCOES, resolverAlteracaoParecer, validarAlteracaoParecer } from "@/lib/data";
import type { AvaliacaoItem } from "@/lib/data";

function item(over: Partial<AvaliacaoItem> = {}): AvaliacaoItem {
  return {
    id: "av-1",
    requisitoId: "req-1",
    codigo: "CHK-001",
    area: "CHECKLIST_A",
    titulo: "t",
    descricao: "d",
    obrigatorio: false,
    ordem: 1,
    norma: { lei: null, artigo: null, inciso: null, paragrafo: null, alinea: null },
    statusSugeridoIa: "NAO_CONFORME",
    statusFinal: "NAO_CONFORME",
    verificado: false,
    comentario: null,
    paginaReferencia: null,
    ...over,
  };
}

describe("PARECER_OPCOES", () => {
  it("são os três status de requisito", () => {
    expect([...PARECER_OPCOES].sort()).toEqual(["CONFORME", "NAO_CONFORME", "NAO_SE_APLICA"]);
  });
});

describe("validarAlteracaoParecer", () => {
  const base = {
    statusAtual: "NAO_CONFORME",
    statusSugeridoIa: "NAO_CONFORME",
  } as const;

  it("parecer não escolhido → erro", () => {
    const r = validarAlteracaoParecer({ ...base, statusFinal: "", comentario: "x" });
    expect(r.ok).toBe(false);
    expect(r.erros.statusFinal).toBeTruthy();
  });

  it("parecer igual ao atual → erro", () => {
    const r = validarAlteracaoParecer({ ...base, statusFinal: "NAO_CONFORME", comentario: "x" });
    expect(r.ok).toBe(false);
    expect(r.erros.statusFinal).toMatch(/diferente do atual/i);
  });

  it("comentário vazio → erro", () => {
    const r = validarAlteracaoParecer({ ...base, statusFinal: "CONFORME", comentario: "   " });
    expect(r.ok).toBe(false);
    expect(r.erros.comentario).toBeTruthy();
  });

  it("mensagem de comentário é específica quando o novo parecer diverge da IA", () => {
    const r = validarAlteracaoParecer({
      statusAtual: "NAO_CONFORME",
      statusSugeridoIa: "NAO_CONFORME",
      statusFinal: "CONFORME",
      comentario: "",
    });
    expect(r.divergeDaSugestao).toBe(true);
    expect(r.erros.comentario).toMatch(/difere da sugest/i);
  });

  it("parecer diferente + comentário preenchido → ok", () => {
    const r = validarAlteracaoParecer({
      ...base,
      statusFinal: "CONFORME",
      comentario: "consta à fl. 2",
    });
    expect(r.ok).toBe(true);
    expect(r.erros).toEqual({});
  });
});

describe("resolverAlteracaoParecer", () => {
  it("grava statusFinal, liga verificado e faz trim no comentário", () => {
    const antes = item({ statusFinal: "NAO_CONFORME", verificado: false, comentario: null });
    const depois = resolverAlteracaoParecer(antes, {
      statusFinal: "CONFORME",
      comentario: "  ok  ",
    });
    expect(depois).toMatchObject({
      statusFinal: "CONFORME",
      verificado: true,
      comentario: "ok",
    });
    // não muta a entrada
    expect(antes.statusFinal).toBe("NAO_CONFORME");
    expect(antes.verificado).toBe(false);
  });

  it("preserva os demais campos da avaliação", () => {
    const antes = item({ codigo: "TEC-9", paginaReferencia: 12, statusSugeridoIa: "NAO_CONFORME" });
    const depois = resolverAlteracaoParecer(antes, {
      statusFinal: "NAO_SE_APLICA",
      comentario: "x",
    });
    expect(depois.codigo).toBe("TEC-9");
    expect(depois.paginaReferencia).toBe(12);
    expect(depois.statusSugeridoIa).toBe("NAO_CONFORME");
  });
});
