import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnaliseValidacaoError, AnalisesGatewayError, HttpAnalisesGateway } from "@/lib/data";

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
