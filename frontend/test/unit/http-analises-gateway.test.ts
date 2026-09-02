import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AnaliseConflitoError,
  AnaliseNaoEncontradaError,
  AnaliseValidacaoError,
  AnalisesGatewayError,
  HttpAnalisesGateway,
} from "@/lib/data";

/**
 * Teste de contrato: o formato consumido de `GET /analises` (TSD-005 / SDD §7).
 * Não sobe o backend — valida o mapeamento e a rejeição de payload fora do contrato.
 */

const BASE = "https://api.exemplo.test";

/** Resposta de exemplo no formato do contrato TSD-005. */
const RESPOSTA_OK = {
  itens: [
    {
      id: "a1",
      nup: "74037.000634/2024-22",
      objeto: "EQUIPAMENTOS E MATERIAL PERMANENTE - MATERIAL HOSPITALAR",
      status: "PRONTA_PARA_REVISAO",
      iniciadaEm: "2024-03-20T14:30:00.000Z",
      concluidaEm: null,
    },
    {
      id: "a2",
      nup: "75842.000634/2023-12",
      objeto: "MATERIAL DE CONSUMO - MATERIAL FARMACOLÓGICO",
      status: "CONCLUIDA",
      iniciadaEm: "2023-07-01T11:45:00.000Z",
      concluidaEm: "2023-07-03T16:10:00.000Z",
    },
  ],
  total: 2,
  pagina: 1,
  tamanho: 20,
};

function mockFetch(resposta: Partial<Response> & { jsonData?: unknown }) {
  const fn = vi.fn(async (_url: string) => ({
    ok: resposta.ok ?? true,
    status: resposta.status ?? 200,
    json: async () => resposta.jsonData,
    ...resposta,
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("HttpAnalisesGateway (contrato)", () => {
  beforeEach(() => {
    mockFetch({ ok: true, jsonData: RESPOSTA_OK });
  });

  it("monta a URL com base + /analises + querystring da query", async () => {
    const fetchSpy = mockFetch({ ok: true, jsonData: RESPOSTA_OK });
    await new HttpAnalisesGateway(`${BASE}/`).listarAnalises({
      q: "hospital",
      status: ["CONCLUIDA"],
      ordenarPor: "nup",
      ordem: "asc",
      pagina: 2,
    });
    const url = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(`${BASE}/analises`);
    expect(url.searchParams.get("q")).toBe("hospital");
    expect(url.searchParams.get("status")).toBe("CONCLUIDA");
    expect(url.searchParams.get("ordenarPor")).toBe("nup");
    expect(url.searchParams.get("ordem")).toBe("asc");
    expect(url.searchParams.get("pagina")).toBe("2");
  });

  it("sem query, chama apenas /analises", async () => {
    const fetchSpy = mockFetch({ ok: true, jsonData: RESPOSTA_OK });
    await new HttpAnalisesGateway(BASE).listarAnalises();
    expect(fetchSpy.mock.calls[0][0]).toBe(`${BASE}/analises`);
  });

  it("mapeia um payload válido para AnalisesPagina", async () => {
    const pagina = await new HttpAnalisesGateway(BASE).listarAnalises();
    expect(pagina).toEqual(RESPOSTA_OK);
    expect(pagina.itens[0].concluidaEm).toBeNull();
    expect(pagina.itens[1].status).toBe("CONCLUIDA");
  });

  it("resposta não-OK vira AnalisesGatewayError", async () => {
    mockFetch({ ok: false, status: 500, jsonData: {} });
    await expect(new HttpAnalisesGateway(BASE).listarAnalises()).rejects.toBeInstanceOf(
      AnalisesGatewayError,
    );
  });

  it("envelope sem `total` é rejeitado", async () => {
    mockFetch({ ok: true, jsonData: { itens: [], pagina: 1, tamanho: 20 } });
    await expect(new HttpAnalisesGateway(BASE).listarAnalises()).rejects.toThrow(
      /formato inesperado/i,
    );
  });

  it("item com status fora da allowlist é rejeitado", async () => {
    mockFetch({
      ok: true,
      jsonData: {
        ...RESPOSTA_OK,
        itens: [{ ...RESPOSTA_OK.itens[0], status: "COM_RESSALVA" }],
      },
    });
    await expect(new HttpAnalisesGateway(BASE).listarAnalises()).rejects.toBeInstanceOf(
      AnalisesGatewayError,
    );
  });

  it("item sem `nup` é rejeitado", async () => {
    const semNup = { ...RESPOSTA_OK.itens[0] } as Record<string, unknown>;
    delete semNup.nup;
    mockFetch({ ok: true, jsonData: { ...RESPOSTA_OK, itens: [semNup] } });
    await expect(new HttpAnalisesGateway(BASE).listarAnalises()).rejects.toBeInstanceOf(
      AnalisesGatewayError,
    );
  });

  it("falha de rede vira AnalisesGatewayError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    await expect(new HttpAnalisesGateway(BASE).listarAnalises()).rejects.toBeInstanceOf(
      AnalisesGatewayError,
    );
  });
});

describe("HttpAnalisesGateway.criarAnalise (contrato POST /analises — TSD-004)", () => {
  const CRIADA_OK = {
    id: "nova-1",
    nup: "74037.000634/2024-22",
    objeto: "Aquisição de equipamentos",
    status: "PENDENTE",
    iniciadaEm: "2026-09-01T12:00:00.000Z",
  };

  function pdf(): File {
    return new File(["%PDF-1.4"], "processo.pdf", { type: "application/pdf" });
  }

  function stubFetch(resposta: { ok?: boolean; status?: number; jsonData?: unknown }) {
    const fn = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: resposta.ok ?? true,
      status: resposta.status ?? 201,
      json: async () => resposta.jsonData,
    }));
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("faz POST multipart para {base}/analises com nup, objeto e arquivo", async () => {
    const fetchSpy = stubFetch({ status: 201, jsonData: CRIADA_OK });
    await new HttpAnalisesGateway(`${BASE}/`).criarAnalise({
      nup: "74037.000634/2024-22",
      objeto: "Aquisição de equipamentos",
      arquivo: pdf(),
    });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${BASE}/analises`);
    expect(init?.method).toBe("POST");
    const form = init?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("nup")).toBe("74037.000634/2024-22");
    expect(form.get("objeto")).toBe("Aquisição de equipamentos");
    expect(form.get("arquivo")).toBeInstanceOf(File);
  });

  it("mapeia o 201 para AnaliseCriada", async () => {
    stubFetch({ status: 201, jsonData: CRIADA_OK });
    const criada = await new HttpAnalisesGateway(BASE).criarAnalise({
      nup: "n",
      objeto: "o",
      arquivo: pdf(),
    });
    expect(criada).toEqual(CRIADA_OK);
  });

  it("422 vira AnaliseValidacaoError com os motivos do backend", async () => {
    stubFetch({
      ok: false,
      status: 422,
      jsonData: { statusCode: 422, message: ["NUP é obrigatório", "PDF protegido por senha"] },
    });
    const erro = await new HttpAnalisesGateway(BASE)
      .criarAnalise({ nup: "n", objeto: "o", arquivo: pdf() })
      .catch((e) => e);
    expect(erro).toBeInstanceOf(AnaliseValidacaoError);
    expect((erro as AnaliseValidacaoError).motivos).toEqual([
      "NUP é obrigatório",
      "PDF protegido por senha",
    ]);
  });

  it("422 com message string também é aceito", async () => {
    stubFetch({ ok: false, status: 422, jsonData: { message: "Arquivo não é PDF" } });
    const erro = await new HttpAnalisesGateway(BASE)
      .criarAnalise({ nup: "n", objeto: "o", arquivo: pdf() })
      .catch((e) => e);
    expect(erro).toBeInstanceOf(AnaliseValidacaoError);
    expect((erro as AnaliseValidacaoError).motivos).toEqual(["Arquivo não é PDF"]);
  });

  it("502 vira AnalisesGatewayError (não de validação)", async () => {
    stubFetch({ ok: false, status: 502, jsonData: {} });
    const erro = await new HttpAnalisesGateway(BASE)
      .criarAnalise({ nup: "n", objeto: "o", arquivo: pdf() })
      .catch((e) => e);
    expect(erro).toBeInstanceOf(AnalisesGatewayError);
    expect(erro).not.toBeInstanceOf(AnaliseValidacaoError);
  });

  it("201 com corpo fora do formato é rejeitado", async () => {
    stubFetch({ status: 201, jsonData: { id: "x" } });
    await expect(
      new HttpAnalisesGateway(BASE).criarAnalise({ nup: "n", objeto: "o", arquivo: pdf() }),
    ).rejects.toBeInstanceOf(AnalisesGatewayError);
  });

  it("falha de rede vira AnalisesGatewayError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    await expect(
      new HttpAnalisesGateway(BASE).criarAnalise({ nup: "n", objeto: "o", arquivo: pdf() }),
    ).rejects.toBeInstanceOf(AnalisesGatewayError);
  });
});

describe("HttpAnalisesGateway.abrirAnalise (contrato GET /analises/:id — TSD-007)", () => {
  const NORMA = {
    lei: "Lei 14.133/2021",
    artigo: "18",
    inciso: "I",
    paragrafo: null,
    alinea: null,
  };
  const ITEM = {
    id: "av-1",
    requisitoId: "req-1",
    codigo: "CHK-001",
    area: "CHECKLIST_DADOS_GERAIS",
    titulo: "Contém a CI do setor?",
    descricao: "…",
    obrigatorio: true,
    ordem: 1,
    norma: NORMA,
    statusSugeridoIa: "NAO_CONFORME",
    statusFinal: "NAO_CONFORME",
    verificado: false,
    comentario: null,
    paginaReferencia: 3,
  };
  const DETALHE_OK = {
    id: "a1",
    nup: "74037.000634/2024-22",
    objeto: "Aquisição",
    status: "PRONTA_PARA_REVISAO",
    motivoErro: null,
    analistaId: "u1",
    analistaNome: "Usuário Analista",
    iniciadaEm: "2024-03-20T14:30:00.000Z",
    concluidaEm: null,
    totalPaginasPdf: 24,
    resumo: {
      total: 1,
      conforme: 0,
      naoConforme: 1,
      naoSeAplica: 0,
      verificados: 0,
      obrigatoriosPendentes: 1,
    },
    avaliacoesPorArea: [{ area: "CHECKLIST_DADOS_GERAIS", itens: [ITEM] }],
  };

  function stubFetch(resposta: { ok?: boolean; status?: number; jsonData?: unknown }) {
    const fn = vi.fn(async (_url: string) => ({
      ok: resposta.ok ?? true,
      status: resposta.status ?? 200,
      json: async () => resposta.jsonData,
    }));
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("faz GET para {base}/analises/{id} (id encodado)", async () => {
    const fetchSpy = stubFetch({ jsonData: DETALHE_OK });
    await new HttpAnalisesGateway(`${BASE}/`).abrirAnalise("74037.000634/2024-22");
    expect(fetchSpy.mock.calls[0][0]).toBe(`${BASE}/analises/74037.000634%2F2024-22`);
  });

  it("mapeia um payload completo para AnaliseDetalhe", async () => {
    stubFetch({ jsonData: DETALHE_OK });
    const detalhe = await new HttpAnalisesGateway(BASE).abrirAnalise("a1");
    expect(detalhe).toEqual(DETALHE_OK);
    expect(detalhe.avaliacoesPorArea[0].itens[0].statusFinal).toBe("NAO_CONFORME");
  });

  it("404 vira AnaliseNaoEncontradaError", async () => {
    stubFetch({ ok: false, status: 404, jsonData: {} });
    await expect(new HttpAnalisesGateway(BASE).abrirAnalise("x")).rejects.toBeInstanceOf(
      AnaliseNaoEncontradaError,
    );
  });

  it("500 vira AnalisesGatewayError (não NaoEncontrada)", async () => {
    stubFetch({ ok: false, status: 500, jsonData: {} });
    const erro = await new HttpAnalisesGateway(BASE).abrirAnalise("x").catch((e) => e);
    expect(erro).toBeInstanceOf(AnalisesGatewayError);
    expect(erro).not.toBeInstanceOf(AnaliseNaoEncontradaError);
  });

  it("payload sem avaliacoesPorArea é rejeitado", async () => {
    const semGrupos = { ...DETALHE_OK } as Record<string, unknown>;
    delete semGrupos.avaliacoesPorArea;
    stubFetch({ jsonData: semGrupos });
    await expect(new HttpAnalisesGateway(BASE).abrirAnalise("a1")).rejects.toThrow(
      /formato inesperado/i,
    );
  });

  it("item com statusFinal fora da allowlist é rejeitado", async () => {
    stubFetch({
      jsonData: {
        ...DETALHE_OK,
        avaliacoesPorArea: [
          { area: "CHECKLIST_X", itens: [{ ...ITEM, statusFinal: "COM_RESSALVA" }] },
        ],
      },
    });
    await expect(new HttpAnalisesGateway(BASE).abrirAnalise("a1")).rejects.toBeInstanceOf(
      AnalisesGatewayError,
    );
  });

  it("payload sem resumo é rejeitado", async () => {
    const semResumo = { ...DETALHE_OK } as Record<string, unknown>;
    delete semResumo.resumo;
    stubFetch({ jsonData: semResumo });
    await expect(new HttpAnalisesGateway(BASE).abrirAnalise("a1")).rejects.toBeInstanceOf(
      AnalisesGatewayError,
    );
  });

  it("falha de rede vira AnalisesGatewayError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    await expect(new HttpAnalisesGateway(BASE).abrirAnalise("a1")).rejects.toBeInstanceOf(
      AnalisesGatewayError,
    );
  });
});

describe("HttpAnalisesGateway.revisarRequisito (contrato PATCH /analises/:id/requisitos/:requisitoId — TSD-008)", () => {
  const ITEM = {
    id: "av-1",
    requisitoId: "req-1",
    codigo: "CHK-001",
    area: "CHECKLIST_DADOS_GERAIS",
    titulo: "Contém a CI do setor?",
    descricao: "…",
    obrigatorio: true,
    ordem: 1,
    norma: { lei: null, artigo: null, inciso: null, paragrafo: null, alinea: null },
    statusSugeridoIa: "NAO_CONFORME",
    statusFinal: "CONFORME",
    verificado: true,
    comentario: "Revisado: consta à fl. 2.",
    paginaReferencia: null,
  };
  const RESUMO = {
    total: 1,
    conforme: 1,
    naoConforme: 0,
    naoSeAplica: 0,
    verificados: 1,
    obrigatoriosPendentes: 0,
  };
  const RESPOSTA_OK = { item: ITEM, resumo: RESUMO };

  function stubFetch(resposta: { ok?: boolean; status?: number; jsonData?: unknown }) {
    const fn = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: resposta.ok ?? true,
      status: resposta.status ?? 200,
      json: async () => resposta.jsonData,
    }));
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("faz PATCH na URL certa com { statusFinal, comentario } em JSON", async () => {
    const fetchSpy = stubFetch({ jsonData: RESPOSTA_OK });
    await new HttpAnalisesGateway(`${BASE}/`).revisarRequisito("a 1", "req-1", {
      statusFinal: "CONFORME",
      comentario: "  ok  ",
    });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${BASE}/analises/a%201/requisitos/req-1`);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({
      statusFinal: "CONFORME",
      comentario: "  ok  ",
    });
  });

  it("mapeia { item, resumo } para RevisaoRequisitoResultado", async () => {
    stubFetch({ jsonData: RESPOSTA_OK });
    const r = await new HttpAnalisesGateway(BASE).revisarRequisito("a1", "req-1", {
      statusFinal: "CONFORME",
      comentario: "ok",
    });
    expect(r).toEqual(RESPOSTA_OK);
  });

  it("422 vira AnaliseValidacaoError com os motivos", async () => {
    stubFetch({ ok: false, status: 422, jsonData: { message: ["comentário obrigatório"] } });
    const erro = await new HttpAnalisesGateway(BASE)
      .revisarRequisito("a1", "req-1", { statusFinal: "CONFORME", comentario: "" })
      .catch((e) => e);
    expect(erro).toBeInstanceOf(AnaliseValidacaoError);
    expect(erro.motivos).toEqual(["comentário obrigatório"]);
  });

  it("409 vira AnaliseConflitoError", async () => {
    stubFetch({ ok: false, status: 409, jsonData: {} });
    await expect(
      new HttpAnalisesGateway(BASE).revisarRequisito("a1", "req-1", {
        statusFinal: "CONFORME",
        comentario: "ok",
      }),
    ).rejects.toBeInstanceOf(AnaliseConflitoError);
  });

  it("404 vira AnaliseNaoEncontradaError", async () => {
    stubFetch({ ok: false, status: 404, jsonData: {} });
    await expect(
      new HttpAnalisesGateway(BASE).revisarRequisito("a1", "req-1", {
        statusFinal: "CONFORME",
        comentario: "ok",
      }),
    ).rejects.toBeInstanceOf(AnaliseNaoEncontradaError);
  });

  it("payload de resposta fora do formato é rejeitado", async () => {
    stubFetch({ jsonData: { item: { ...ITEM, statusFinal: "COM_RESSALVA" }, resumo: RESUMO } });
    await expect(
      new HttpAnalisesGateway(BASE).revisarRequisito("a1", "req-1", {
        statusFinal: "CONFORME",
        comentario: "ok",
      }),
    ).rejects.toBeInstanceOf(AnalisesGatewayError);
  });

  it("falha de rede vira AnalisesGatewayError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    await expect(
      new HttpAnalisesGateway(BASE).revisarRequisito("a1", "req-1", {
        statusFinal: "CONFORME",
        comentario: "ok",
      }),
    ).rejects.toBeInstanceOf(AnalisesGatewayError);
  });
});

describe("HttpAnalisesGateway.marcarVerificado (contrato PATCH { verificado } — TSD-008)", () => {
  const ITEM = {
    id: "av-1",
    requisitoId: "req-1",
    codigo: "CHK-001",
    area: "CHECKLIST_DADOS_GERAIS",
    titulo: "Contém a CI do setor?",
    descricao: "…",
    obrigatorio: true,
    ordem: 1,
    norma: { lei: null, artigo: null, inciso: null, paragrafo: null, alinea: null },
    statusSugeridoIa: "NAO_CONFORME",
    statusFinal: "NAO_CONFORME",
    verificado: true,
    comentario: null,
    paginaReferencia: null,
  };
  const RESUMO = {
    total: 1,
    conforme: 0,
    naoConforme: 1,
    naoSeAplica: 0,
    verificados: 1,
    obrigatoriosPendentes: 0,
  };

  function stubFetch(resposta: { ok?: boolean; status?: number; jsonData?: unknown }) {
    const fn = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: resposta.ok ?? true,
      status: resposta.status ?? 200,
      json: async () => resposta.jsonData,
    }));
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("faz PATCH na URL certa com o corpo exatamente { verificado }", async () => {
    const fetchSpy = stubFetch({ jsonData: { item: ITEM, resumo: RESUMO } });
    await new HttpAnalisesGateway(`${BASE}/`).marcarVerificado("a1", "req-1", true);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${BASE}/analises/a1/requisitos/req-1`);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ verificado: true });
  });

  it("mapeia { item, resumo } para RevisaoRequisitoResultado", async () => {
    stubFetch({ jsonData: { item: ITEM, resumo: RESUMO } });
    const r = await new HttpAnalisesGateway(BASE).marcarVerificado("a1", "req-1", false);
    expect(r).toEqual({ item: ITEM, resumo: RESUMO });
  });

  it("409 vira AnaliseConflitoError; 404 vira AnaliseNaoEncontradaError", async () => {
    stubFetch({ ok: false, status: 409, jsonData: {} });
    await expect(
      new HttpAnalisesGateway(BASE).marcarVerificado("a1", "req-1", true),
    ).rejects.toBeInstanceOf(AnaliseConflitoError);

    stubFetch({ ok: false, status: 404, jsonData: {} });
    await expect(
      new HttpAnalisesGateway(BASE).marcarVerificado("a1", "req-1", true),
    ).rejects.toBeInstanceOf(AnaliseNaoEncontradaError);
  });

  it("payload de resposta fora do formato é rejeitado", async () => {
    stubFetch({ jsonData: { item: { ...ITEM, verificado: "sim" }, resumo: RESUMO } });
    await expect(
      new HttpAnalisesGateway(BASE).marcarVerificado("a1", "req-1", true),
    ).rejects.toBeInstanceOf(AnalisesGatewayError);
  });

  it("422 vira AnaliseValidacaoError com os motivos", async () => {
    stubFetch({ ok: false, status: 422, jsonData: { message: ["estado inválido"] } });
    const erro = await new HttpAnalisesGateway(BASE)
      .marcarVerificado("a1", "req-1", true)
      .catch((e) => e);
    expect(erro).toBeInstanceOf(AnaliseValidacaoError);
    expect(erro.motivos).toEqual(["estado inválido"]);
  });

  it("falha de rede vira AnalisesGatewayError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    await expect(
      new HttpAnalisesGateway(BASE).marcarVerificado("a1", "req-1", true),
    ).rejects.toBeInstanceOf(AnalisesGatewayError);
  });
});

describe("HttpAnalisesGateway.urlPdf / corrigirPaginaReferencia (RF-014 / TSD-009)", () => {
  const ITEM = {
    id: "av-1",
    requisitoId: "req-1",
    codigo: "CHK-001",
    area: "CHECKLIST_DADOS_GERAIS",
    titulo: "t",
    descricao: "d",
    obrigatorio: true,
    ordem: 1,
    norma: { lei: null, artigo: null, inciso: null, paragrafo: null, alinea: null },
    statusSugeridoIa: "NAO_CONFORME",
    statusFinal: "NAO_CONFORME",
    verificado: false,
    comentario: null,
    paginaReferencia: 12,
  };
  const RESUMO = {
    total: 1,
    conforme: 0,
    naoConforme: 1,
    naoSeAplica: 0,
    verificados: 0,
    obrigatoriosPendentes: 1,
  };

  function stubFetch(resposta: { ok?: boolean; status?: number; jsonData?: unknown }) {
    const fn = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: resposta.ok ?? true,
      status: resposta.status ?? 200,
      json: async () => resposta.jsonData,
    }));
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("urlPdf monta {base}/analises/{id}/pdf (id encodado, sem barra dupla)", () => {
    expect(new HttpAnalisesGateway(`${BASE}/`).urlPdf("a 1")).toBe(`${BASE}/analises/a%201/pdf`);
  });

  it("corrigirPaginaReferencia faz PATCH na URL de revisão com o corpo { paginaReferencia }", async () => {
    const fetchSpy = stubFetch({ jsonData: { item: ITEM, resumo: RESUMO } });
    await new HttpAnalisesGateway(BASE).corrigirPaginaReferencia("a1", "req-1", 7);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${BASE}/analises/a1/requisitos/req-1`);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ paginaReferencia: 7 });
  });

  it("corrigirPaginaReferencia com null envia { paginaReferencia: null } e mapeia { item, resumo }", async () => {
    stubFetch({ jsonData: { item: { ...ITEM, paginaReferencia: null }, resumo: RESUMO } });
    const r = await new HttpAnalisesGateway(BASE).corrigirPaginaReferencia("a1", "req-1", null);
    expect(r.item.paginaReferencia).toBeNull();
    expect(r.resumo).toEqual(RESUMO);
  });

  it("422 vira AnaliseValidacaoError; 409 → AnaliseConflitoError; 404 → AnaliseNaoEncontradaError", async () => {
    stubFetch({ ok: false, status: 422, jsonData: { message: ["página fora do intervalo"] } });
    const erro = await new HttpAnalisesGateway(BASE)
      .corrigirPaginaReferencia("a1", "req-1", 99)
      .catch((e) => e);
    expect(erro).toBeInstanceOf(AnaliseValidacaoError);
    expect(erro.motivos).toEqual(["página fora do intervalo"]);

    stubFetch({ ok: false, status: 409, jsonData: {} });
    await expect(
      new HttpAnalisesGateway(BASE).corrigirPaginaReferencia("a1", "req-1", 3),
    ).rejects.toBeInstanceOf(AnaliseConflitoError);

    stubFetch({ ok: false, status: 404, jsonData: {} });
    await expect(
      new HttpAnalisesGateway(BASE).corrigirPaginaReferencia("a1", "req-1", 3),
    ).rejects.toBeInstanceOf(AnaliseNaoEncontradaError);
  });
});
