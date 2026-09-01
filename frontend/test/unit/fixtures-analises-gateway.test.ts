import { describe, expect, it } from "vitest";
import { AnaliseValidacaoError, FixturesAnalisesGateway } from "@/lib/data";
import type { AnaliseResumo } from "@/lib/data";
import { ANALISES_FIXTURE } from "@/lib/data/fixtures";

function pdf(nome = "processo.pdf"): File {
  return new File(["%PDF-1.4"], nome, { type: "application/pdf" });
}

function make(over: Partial<AnaliseResumo> & { id: string }): AnaliseResumo {
  return {
    nup: "00000.000000/2020-00",
    objeto: "OBJETO GENÉRICO",
    status: "PENDENTE",
    iniciadaEm: "2020-01-01T00:00:00.000Z",
    concluidaEm: null,
    ...over,
  };
}

describe("FixturesAnalisesGateway", () => {
  it("sem query, devolve a 1ª página (20) ordenada por iniciadaEm desc", async () => {
    const pagina = await new FixturesAnalisesGateway().listarAnalises();
    expect(pagina.total).toBe(ANALISES_FIXTURE.length);
    expect(pagina.pagina).toBe(1);
    expect(pagina.tamanho).toBe(20);
    expect(pagina.itens).toHaveLength(20);
    const datas = pagina.itens.map((i) => i.iniciadaEm);
    expect([...datas]).toEqual([...datas].sort().reverse());
  });

  it("pagina: 2ª página traz o resto e total reflete o conjunto todo", async () => {
    const gw = new FixturesAnalisesGateway();
    const p2 = await gw.listarAnalises({ pagina: 2, tamanho: 20 });
    expect(p2.itens).toHaveLength(ANALISES_FIXTURE.length - 20);
    expect(p2.total).toBe(ANALISES_FIXTURE.length);
  });

  it("busca em nup e objeto, sem acento e sem caixa", async () => {
    const gw = new FixturesAnalisesGateway([
      make({ id: "a", nup: "12345.000001/2024-11", objeto: "AQUISIÇÃO DE PRÓTESES" }),
      make({ id: "b", nup: "99999.000002/2024-22", objeto: "SERVIÇOS DE LIMPEZA" }),
    ]);
    expect((await gw.listarAnalises({ q: "protese" })).itens.map((i) => i.id)).toEqual(["a"]);
    expect((await gw.listarAnalises({ q: "12345" })).itens.map((i) => i.id)).toEqual(["a"]);
    expect((await gw.listarAnalises({ q: "LIMPEZA" })).itens.map((i) => i.id)).toEqual(["b"]);
    expect((await gw.listarAnalises({ q: "nada" })).total).toBe(0);
  });

  it("filtra por múltiplos status (união)", async () => {
    const gw = new FixturesAnalisesGateway([
      make({ id: "p", status: "PENDENTE" }),
      make({ id: "c", status: "CONCLUIDA" }),
      make({ id: "e", status: "ERRO_PROCESSAMENTO" }),
    ]);
    const r = await gw.listarAnalises({ status: ["PENDENTE", "ERRO_PROCESSAMENTO"] });
    expect(r.itens.map((i) => i.id).sort()).toEqual(["e", "p"]);
    expect(r.total).toBe(2);
  });

  it("ordena por nup asc e desc", async () => {
    const gw = new FixturesAnalisesGateway([
      make({ id: "1", nup: "30000.0/2024-1" }),
      make({ id: "2", nup: "10000.0/2024-1" }),
      make({ id: "3", nup: "20000.0/2024-1" }),
    ]);
    expect(
      (await gw.listarAnalises({ ordenarPor: "nup", ordem: "asc" })).itens.map((i) => i.id),
    ).toEqual(["2", "3", "1"]);
    expect(
      (await gw.listarAnalises({ ordenarPor: "nup", ordem: "desc" })).itens.map((i) => i.id),
    ).toEqual(["1", "3", "2"]);
  });

  it("limita tamanho a 100 e trata pagina < 1 como 1", async () => {
    const gw = new FixturesAnalisesGateway();
    expect((await gw.listarAnalises({ tamanho: 9999 })).tamanho).toBe(100);
    expect((await gw.listarAnalises({ pagina: 0 })).pagina).toBe(1);
  });

  it("não muta a fonte entre chamadas", async () => {
    const gw = new FixturesAnalisesGateway();
    const primeira = await gw.listarAnalises();
    primeira.itens.splice(0, primeira.itens.length);
    const segunda = await gw.listarAnalises();
    expect(segunda.itens).toHaveLength(20);
  });

  describe("criarAnalise", () => {
    it("devolve uma análise sintética PENDENTE com os dados trimados", async () => {
      const criada = await new FixturesAnalisesGateway().criarAnalise({
        nup: "  74037.000634/2024-22  ",
        objeto: "  Aquisição de equipamentos  ",
        arquivo: pdf(),
      });
      expect(criada.status).toBe("PENDENTE");
      expect(criada.nup).toBe("74037.000634/2024-22");
      expect(criada.objeto).toBe("Aquisição de equipamentos");
      expect(criada.id).toMatch(/^nova-/);
      expect(Date.parse(criada.iniciadaEm)).not.toBeNaN();
    });

    it("rejeita entrada inválida com AnaliseValidacaoError", async () => {
      await expect(
        new FixturesAnalisesGateway().criarAnalise({
          nup: "",
          objeto: "",
          arquivo: new File(["x"], "nota.txt", { type: "text/plain" }),
        }),
      ).rejects.toBeInstanceOf(AnaliseValidacaoError);
    });
  });
});
