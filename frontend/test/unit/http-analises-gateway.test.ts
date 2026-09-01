import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalisesGatewayError, HttpAnalisesGateway } from "@/lib/data";

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
