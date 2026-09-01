import { describe, expect, it } from "vitest";
import { parseListarAnalisesQuery, queryParaString, TAMANHO_MAX, TAMANHO_PADRAO } from "@/lib/data";

describe("parseListarAnalisesQuery", () => {
  it("aplica os defaults quando não há parâmetros", () => {
    expect(parseListarAnalisesQuery({})).toEqual({
      q: "",
      status: [],
      ordenarPor: "iniciadaEm",
      ordem: "desc",
      pagina: 1,
      tamanho: TAMANHO_PADRAO,
    });
  });

  it("faz trim do termo de busca", () => {
    expect(parseListarAnalisesQuery({ q: "  material  " }).q).toBe("material");
  });

  it("aceita status por vírgula e descarta valores inválidos e repetidos", () => {
    const { status } = parseListarAnalisesQuery({
      status: "CONCLUIDA,LIXO,PROCESSANDO,CONCLUIDA",
    });
    expect(status).toEqual(["CONCLUIDA", "PROCESSANDO"]);
  });

  it("aceita status como parâmetro repetido (array)", () => {
    const { status } = parseListarAnalisesQuery({ status: ["PENDENTE", "ERRO_PROCESSAMENTO"] });
    expect(status).toEqual(["PENDENTE", "ERRO_PROCESSAMENTO"]);
  });

  it("cai no default quando ordenarPor/ordem são inválidos", () => {
    const q = parseListarAnalisesQuery({ ordenarPor: "foo", ordem: "bar" });
    expect(q.ordenarPor).toBe("iniciadaEm");
    expect(q.ordem).toBe("desc");
  });

  it("preserva ordenarPor e ordem válidos", () => {
    const q = parseListarAnalisesQuery({ ordenarPor: "nup", ordem: "asc" });
    expect(q.ordenarPor).toBe("nup");
    expect(q.ordem).toBe("asc");
  });

  it("normaliza pagina (mínimo 1) e tamanho (1..MAX, default se inválido)", () => {
    expect(parseListarAnalisesQuery({ pagina: "0" }).pagina).toBe(1);
    expect(parseListarAnalisesQuery({ pagina: "-3" }).pagina).toBe(1);
    expect(parseListarAnalisesQuery({ pagina: "4" }).pagina).toBe(4);
    expect(parseListarAnalisesQuery({ tamanho: "0" }).tamanho).toBe(1);
    expect(parseListarAnalisesQuery({ tamanho: "9999" }).tamanho).toBe(TAMANHO_MAX);
    expect(parseListarAnalisesQuery({ tamanho: "abc" }).tamanho).toBe(TAMANHO_PADRAO);
    expect(parseListarAnalisesQuery({ tamanho: "50" }).tamanho).toBe(50);
  });
});

describe("queryParaString", () => {
  it("omite tudo que é igual ao default", () => {
    expect(
      queryParaString({
        q: "",
        status: [],
        ordenarPor: "iniciadaEm",
        ordem: "desc",
        pagina: 1,
        tamanho: TAMANHO_PADRAO,
      }),
    ).toBe("");
  });

  it("serializa apenas os campos não-default", () => {
    const qs = queryParaString({
      q: "abc",
      status: ["CONCLUIDA", "PENDENTE"],
      ordenarPor: "nup",
      ordem: "asc",
      pagina: 3,
      tamanho: 50,
    });
    const sp = new URLSearchParams(qs);
    expect(sp.get("q")).toBe("abc");
    expect(sp.get("status")).toBe("CONCLUIDA,PENDENTE");
    expect(sp.get("ordenarPor")).toBe("nup");
    expect(sp.get("ordem")).toBe("asc");
    expect(sp.get("pagina")).toBe("3");
    expect(sp.get("tamanho")).toBe("50");
  });

  it("é a inversa de parse para uma query não-trivial", () => {
    const original = {
      q: "hospital",
      status: ["PROCESSANDO" as const],
      ordenarPor: "nup" as const,
      ordem: "asc" as const,
      pagina: 2,
      tamanho: 20,
    };
    expect(
      parseListarAnalisesQuery(Object.fromEntries(new URLSearchParams(queryParaString(original)))),
    ).toEqual(original);
  });
});
