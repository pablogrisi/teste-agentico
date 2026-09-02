import { describe, expect, it } from "vitest";
import {
  AnaliseConflitoError,
  AnaliseNaoEncontradaError,
  AnaliseRequisitosPendentesError,
  AnaliseValidacaoError,
  calcularResumo,
  FixturesAnalisesGateway,
} from "@/lib/data";
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

  describe("abrirAnalise", () => {
    it("devolve o detalhe de uma análise pronta, com avaliações por área e resumo coerente", async () => {
      const detalhe = await new FixturesAnalisesGateway().abrirAnalise("1");
      expect(detalhe.id).toBe("1");
      expect(detalhe.status).toBe("PRONTA_PARA_REVISAO");
      expect(detalhe.analistaNome).toBeTruthy();
      expect(detalhe.avaliacoesPorArea.length).toBeGreaterThan(0);
      expect(detalhe.resumo).toEqual(calcularResumo(detalhe.avaliacoesPorArea));
    });

    it("sintetiza a partir da listagem para ids sem fixture explícita", async () => {
      const detalhe = await new FixturesAnalisesGateway().abrirAnalise("4"); // CONCLUIDA na listagem
      expect(detalhe.id).toBe("4");
      expect(detalhe.status).toBe("CONCLUIDA");
      expect(detalhe.avaliacoesPorArea.length).toBeGreaterThan(0);
    });

    it("análise em processamento vem sem avaliações", async () => {
      const detalhe = await new FixturesAnalisesGateway().abrirAnalise("2"); // PROCESSANDO
      expect(detalhe.avaliacoesPorArea).toEqual([]);
      expect(detalhe.resumo.total).toBe(0);
    });

    it("id inexistente → AnaliseNaoEncontradaError", async () => {
      await expect(new FixturesAnalisesGateway().abrirAnalise("zzz")).rejects.toBeInstanceOf(
        AnaliseNaoEncontradaError,
      );
    });

    it("não vaza a referência da fixture entre chamadas", async () => {
      const gw = new FixturesAnalisesGateway();
      const primeira = await gw.abrirAnalise("1");
      primeira.avaliacoesPorArea[0].itens.pop();
      const segunda = await gw.abrirAnalise("1");
      expect(segunda.avaliacoesPorArea[0].itens.length).toBeGreaterThan(
        primeira.avaliacoesPorArea[0].itens.length,
      );
    });
  });

  describe("revisarRequisito", () => {
    async function requisitoNaoConforme() {
      const gw = new FixturesAnalisesGateway();
      const detalhe = await gw.abrirAnalise("1");
      const alvo = detalhe.avaliacoesPorArea
        .flatMap((g) => g.itens)
        .find((i) => i.statusFinal === "NAO_CONFORME")!;
      return { gw, alvo, detalhe };
    }

    it("aplica o novo parecer, liga verificado e recalcula o resumo", async () => {
      const { gw, alvo, detalhe } = await requisitoNaoConforme();
      const naoConformeAntes = detalhe.resumo.naoConforme;

      const { item, resumo } = await gw.revisarRequisito("1", alvo.requisitoId, {
        statusFinal: "CONFORME",
        comentario: "  revisado: consta à fl. 2  ",
      });

      expect(item.statusFinal).toBe("CONFORME");
      expect(item.verificado).toBe(true);
      expect(item.comentario).toBe("revisado: consta à fl. 2");
      expect(resumo.naoConforme).toBe(naoConformeAntes - 1);
      expect(resumo.conforme).toBe(detalhe.resumo.conforme + 1);
    });

    it("não persiste — a próxima abrirAnalise volta ao estado das fixtures", async () => {
      const { gw, alvo } = await requisitoNaoConforme();
      await gw.revisarRequisito("1", alvo.requisitoId, {
        statusFinal: "CONFORME",
        comentario: "x",
      });
      const depois = await gw.abrirAnalise("1");
      const mesmo = depois.avaliacoesPorArea
        .flatMap((g) => g.itens)
        .find((i) => i.requisitoId === alvo.requisitoId)!;
      expect(mesmo.statusFinal).toBe("NAO_CONFORME");
    });

    it("comentário vazio quando diverge da IA → AnaliseValidacaoError", async () => {
      const { gw, alvo } = await requisitoNaoConforme();
      await expect(
        gw.revisarRequisito("1", alvo.requisitoId, { statusFinal: "CONFORME", comentario: "" }),
      ).rejects.toBeInstanceOf(AnaliseValidacaoError);
    });

    it("análise fora de PRONTA_PARA_REVISAO → AnaliseConflitoError", async () => {
      await expect(
        new FixturesAnalisesGateway().revisarRequisito("2", "req-1", {
          statusFinal: "CONFORME",
          comentario: "x",
        }),
      ).rejects.toBeInstanceOf(AnaliseConflitoError);
    });

    it("requisito inexistente → AnaliseNaoEncontradaError", async () => {
      await expect(
        new FixturesAnalisesGateway().revisarRequisito("1", "req-inexistente", {
          statusFinal: "CONFORME",
          comentario: "x",
        }),
      ).rejects.toBeInstanceOf(AnaliseNaoEncontradaError);
    });
  });

  describe("marcarVerificado", () => {
    async function primeiroNaoVerificado() {
      const gw = new FixturesAnalisesGateway();
      const detalhe = await gw.abrirAnalise("1");
      const alvo = detalhe.avaliacoesPorArea.flatMap((g) => g.itens).find((i) => !i.verificado)!;
      return { gw, alvo, detalhe };
    }

    it("alterna verificado e recalcula o resumo, sem tocar em statusFinal/comentario", async () => {
      const { gw, alvo, detalhe } = await primeiroNaoVerificado();
      const { item, resumo } = await gw.marcarVerificado("1", alvo.requisitoId, true);
      expect(item.verificado).toBe(true);
      expect(item.statusFinal).toBe(alvo.statusFinal);
      expect(item.comentario).toBe(alvo.comentario);
      expect(resumo.verificados).toBe(detalhe.resumo.verificados + 1);
    });

    it("não persiste — a próxima abrirAnalise volta ao estado das fixtures", async () => {
      const { gw, alvo } = await primeiroNaoVerificado();
      await gw.marcarVerificado("1", alvo.requisitoId, true);
      const depois = await gw.abrirAnalise("1");
      const mesmo = depois.avaliacoesPorArea
        .flatMap((g) => g.itens)
        .find((i) => i.requisitoId === alvo.requisitoId)!;
      expect(mesmo.verificado).toBe(alvo.verificado);
    });

    it("análise fora de PRONTA_PARA_REVISAO → AnaliseConflitoError", async () => {
      await expect(
        new FixturesAnalisesGateway().marcarVerificado("2", "req-1", true),
      ).rejects.toBeInstanceOf(AnaliseConflitoError);
    });

    it("requisito inexistente → AnaliseNaoEncontradaError", async () => {
      await expect(
        new FixturesAnalisesGateway().marcarVerificado("1", "req-inexistente", true),
      ).rejects.toBeInstanceOf(AnaliseNaoEncontradaError);
    });
  });

  describe("urlPdf / corrigirPaginaReferencia (RF-014)", () => {
    it("urlPdf → null (sem PDF real nas fixtures)", () => {
      expect(new FixturesAnalisesGateway().urlPdf("1")).toBeNull();
    });

    it("urlRelatorio → null (sem relatório real nas fixtures) — RF-016", () => {
      expect(new FixturesAnalisesGateway().urlRelatorio("1")).toBeNull();
    });

    it("corrigirPaginaReferencia aplica a página e recalcula o resumo, sem persistir", async () => {
      const gw = new FixturesAnalisesGateway();
      const detalhe = await gw.abrirAnalise("1");
      const alvo = detalhe.avaliacoesPorArea.flatMap((g) => g.itens)[0];

      const { item } = await gw.corrigirPaginaReferencia("1", alvo.requisitoId, 9);
      expect(item.paginaReferencia).toBe(9);
      expect(item.statusFinal).toBe(alvo.statusFinal);

      const depois = await gw.abrirAnalise("1");
      const mesmo = depois.avaliacoesPorArea
        .flatMap((g) => g.itens)
        .find((i) => i.requisitoId === alvo.requisitoId)!;
      expect(mesmo.paginaReferencia).toBe(alvo.paginaReferencia);
    });

    it("null limpa a página", async () => {
      const gw = new FixturesAnalisesGateway();
      const detalhe = await gw.abrirAnalise("1");
      const alvo = detalhe.avaliacoesPorArea
        .flatMap((g) => g.itens)
        .find((i) => i.paginaReferencia !== null)!;
      const { item } = await gw.corrigirPaginaReferencia("1", alvo.requisitoId, null);
      expect(item.paginaReferencia).toBeNull();
    });

    it("análise fora de PRONTA_PARA_REVISAO → AnaliseConflitoError; requisito inexistente → AnaliseNaoEncontradaError", async () => {
      await expect(
        new FixturesAnalisesGateway().corrigirPaginaReferencia("2", "req-1", 3),
      ).rejects.toBeInstanceOf(AnaliseConflitoError);
      await expect(
        new FixturesAnalisesGateway().corrigirPaginaReferencia("1", "req-zzz", 3),
      ).rejects.toBeInstanceOf(AnaliseNaoEncontradaError);
    });
  });

  describe("concluirAnalise (RF-012 / TSD-010)", () => {
    it("análise CONCLUIDA → idempotente (devolve o detalhe como está)", async () => {
      const gw = new FixturesAnalisesGateway();
      const detalhe = await gw.concluirAnalise("4"); // CONCLUIDA na listagem
      expect(detalhe.status).toBe("CONCLUIDA");
    });

    it("análise fora de PRONTA_PARA_REVISAO → AnaliseConflitoError", async () => {
      await expect(new FixturesAnalisesGateway().concluirAnalise("2")).rejects.toBeInstanceOf(
        AnaliseConflitoError,
      );
    });

    it("com obrigatórios não verificados → AnaliseRequisitosPendentesError com a lista", async () => {
      const gw = new FixturesAnalisesGateway();
      const antes = await gw.abrirAnalise("1");
      const esperados = antes.avaliacoesPorArea
        .flatMap((g) => g.itens)
        .filter((i) => i.obrigatorio && !i.verificado);
      expect(esperados.length).toBeGreaterThan(0);

      const erro = await gw.concluirAnalise("1").catch((e) => e);
      expect(erro).toBeInstanceOf(AnaliseRequisitosPendentesError);
      expect(
        (erro as AnaliseRequisitosPendentesError).pendentes.map((p) => p.requisitoId).sort(),
      ).toEqual(esperados.map((i) => i.requisitoId).sort());
      expect((erro as AnaliseRequisitosPendentesError).pendentes[0]).toEqual({
        requisitoId: esperados[0].requisitoId,
        codigo: esperados[0].codigo,
        titulo: esperados[0].titulo,
        area: esperados[0].area,
      });
    });

    it("sem pendentes → detalhe CONCLUIDA com concluidaEm, e não persiste", async () => {
      const gw = new FixturesAnalisesGateway();
      const antes = await gw.abrirAnalise("7"); // PRONTA, todos os obrigatórios verificados
      expect(antes.resumo.obrigatoriosPendentes).toBe(0);

      const concluida = await gw.concluirAnalise("7");
      expect(concluida.status).toBe("CONCLUIDA");
      expect(concluida.concluidaEm).toBeTruthy();
      expect(Date.parse(concluida.concluidaEm as string)).not.toBeNaN();

      const depois = await gw.abrirAnalise("7");
      expect(depois.status).toBe("PRONTA_PARA_REVISAO"); // andaime — não persiste
    });

    it("id inexistente → AnaliseNaoEncontradaError", async () => {
      await expect(new FixturesAnalisesGateway().concluirAnalise("zzz")).rejects.toBeInstanceOf(
        AnaliseNaoEncontradaError,
      );
    });
  });
});
