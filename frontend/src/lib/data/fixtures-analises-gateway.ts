import {
  AnaliseConflitoError,
  AnaliseNaoEncontradaError,
  AnaliseRequisitosPendentesError,
  AnaliseValidacaoError,
  type AnalisesGateway,
} from "./analises-gateway";
import { calcularResumo } from "./analise-detalhe";
import { resolverAlteracaoParecer, validarAlteracaoParecer } from "./alterar-parecer";
import { TAMANHO_MAX, TAMANHO_PADRAO } from "./analises-query";
import { ANALISES_FIXTURE } from "./fixtures";
import {
  ANALISES_DETALHE_FIXTURE,
  clonarDetalhe,
  sintetizarDetalhe,
} from "./fixtures-analise-detalhe";
import { validarNovaAnalise } from "./nova-analise";
import type {
  AlteracaoParecerInput,
  AnaliseCriada,
  AnaliseDetalhe,
  AnaliseResumo,
  AnalisesPagina,
  AreaComItens,
  AvaliacaoItem,
  ListarAnalisesQuery,
  NovaAnaliseInput,
  RevisaoRequisitoResultado,
} from "./types";

/** Remove acentos e caixa para comparação de busca (equivale ao "insensitive" do backend). */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Implementação de `AnalisesGateway` servida por fixtures locais (sem backend).
 * Aplica as mesmas semânticas de busca/filtro/ordenação/paginação do contrato TSD-005,
 * para que a tela seja exercitada de verdade.
 */
export class FixturesAnalisesGateway implements AnalisesGateway {
  constructor(private readonly fonte: readonly AnaliseResumo[] = ANALISES_FIXTURE) {}

  async listarAnalises(query: Partial<ListarAnalisesQuery> = {}): Promise<AnalisesPagina> {
    const termo = normalizar((query.q ?? "").trim());
    const status = query.status ?? [];
    const ordenarPor = query.ordenarPor ?? "iniciadaEm";
    const ordem = query.ordem ?? "desc";
    const pagina = query.pagina && query.pagina >= 1 ? Math.floor(query.pagina) : 1;
    const tamanho = query.tamanho
      ? Math.min(Math.max(Math.floor(query.tamanho), 1), TAMANHO_MAX)
      : TAMANHO_PADRAO;

    const filtradas = this.fonte.filter((a) => {
      const casaBusca =
        termo === "" || normalizar(a.nup).includes(termo) || normalizar(a.objeto).includes(termo);
      const casaStatus = status.length === 0 || status.includes(a.status);
      return casaBusca && casaStatus;
    });

    const ordenadas = [...filtradas].sort((a, b) => {
      const base =
        ordenarPor === "nup"
          ? a.nup.localeCompare(b.nup, "pt-BR")
          : a.iniciadaEm.localeCompare(b.iniciadaEm);
      return ordem === "asc" ? base : -base;
    });

    const total = ordenadas.length;
    const inicio = (pagina - 1) * tamanho;
    const itens = ordenadas.slice(inicio, inicio + tamanho).map((a) => ({ ...a }));

    return { itens, total, pagina, tamanho };
  }

  /**
   * Sem backend: revalida e devolve uma análise sintética `PENDENTE`.
   * Andaime — a análise criada NÃO entra na lista de fixtures (ver TSD-012 §9).
   */
  async criarAnalise(input: NovaAnaliseInput): Promise<AnaliseCriada> {
    const { ok, erros } = validarNovaAnalise(input);
    if (!ok) {
      throw new AnaliseValidacaoError(Object.values(erros).filter(Boolean) as string[]);
    }
    return {
      id: `nova-${crypto.randomUUID()}`,
      nup: input.nup.trim(),
      objeto: input.objeto.trim(),
      status: "PENDENTE",
      iniciadaEm: new Date().toISOString(),
    };
  }

  async abrirAnalise(id: string): Promise<AnaliseDetalhe> {
    const explicito = ANALISES_DETALHE_FIXTURE[id];
    if (explicito) return clonarDetalhe(explicito);

    const linha = this.fonte.find((a) => a.id === id);
    if (!linha) throw new AnaliseNaoEncontradaError(id);
    return sintetizarDetalhe(linha);
  }

  /**
   * Sem backend: aplica a regra de alteração de parecer (TSD-008) sobre o detalhe das
   * fixtures e devolve `{ item, resumo }`. **Não persiste** — a próxima `abrirAnalise`
   * volta ao estado das fixtures (andaime; ver TSD-016 §9).
   */
  async revisarRequisito(
    analiseId: string,
    requisitoId: string,
    patch: AlteracaoParecerInput,
  ): Promise<RevisaoRequisitoResultado> {
    const { grupos, atual } = await this.localizarAvaliacao(analiseId, requisitoId);

    const { ok, erros } = validarAlteracaoParecer({
      statusFinal: patch.statusFinal,
      statusAtual: atual.statusFinal,
      statusSugeridoIa: atual.statusSugeridoIa,
      comentario: patch.comentario,
    });
    if (!ok) {
      throw new AnaliseValidacaoError(Object.values(erros).filter(Boolean) as string[]);
    }

    return resultadoComItem(grupos, resolverAlteracaoParecer(atual, patch));
  }

  /**
   * Sem backend: alterna `verificado` de um requisito (TSD-008, corpo `{ verificado }`).
   * **Não persiste** (andaime; ver TSD-017 §9).
   */
  async marcarVerificado(
    analiseId: string,
    requisitoId: string,
    verificado: boolean,
  ): Promise<RevisaoRequisitoResultado> {
    const { grupos, atual } = await this.localizarAvaliacao(analiseId, requisitoId);
    return resultadoComItem(grupos, { ...atual, verificado });
  }

  /** Sem backend não há PDF real — a tela mostra um aviso no lugar do visor. */
  urlPdf(_analiseId: string): string | null {
    return null;
  }

  /** Sem backend não há relatório real — o botão "Baixar relatório" fica desabilitado. */
  urlRelatorio(_analiseId: string): string | null {
    return null;
  }

  /**
   * Sem backend: aplica `paginaReferencia` (TSD-009). **Não persiste** (andaime; ver TSD-019 §9).
   */
  async corrigirPaginaReferencia(
    analiseId: string,
    requisitoId: string,
    pagina: number | null,
  ): Promise<RevisaoRequisitoResultado> {
    const { grupos, atual } = await this.localizarAvaliacao(analiseId, requisitoId);
    return resultadoComItem(grupos, { ...atual, paginaReferencia: pagina });
  }

  /**
   * Sem backend: aplica as regras de `POST /analises/:id/concluir` (TSD-010) sobre o detalhe
   * das fixtures. **Não persiste** — a próxima `abrirAnalise` volta ao estado das fixtures
   * (andaime; ver TSD-020 §9).
   */
  async concluirAnalise(analiseId: string): Promise<AnaliseDetalhe> {
    const detalhe = await this.abrirAnalise(analiseId);

    if (detalhe.status === "CONCLUIDA") return detalhe; // idempotente
    if (detalhe.status !== "PRONTA_PARA_REVISAO") throw new AnaliseConflitoError();

    const pendentes = detalhe.avaliacoesPorArea
      .flatMap((g) => g.itens)
      .filter((i) => i.obrigatorio && !i.verificado)
      .map((i) => ({
        requisitoId: i.requisitoId,
        codigo: i.codigo,
        titulo: i.titulo,
        area: i.area,
      }));
    if (pendentes.length > 0) throw new AnaliseRequisitosPendentesError(pendentes);

    return {
      ...clonarDetalhe(detalhe),
      status: "CONCLUIDA",
      concluidaEm: new Date().toISOString(),
    };
  }

  /** `409` se a análise não está em revisão; `404` se a avaliação não existe. */
  private async localizarAvaliacao(analiseId: string, requisitoId: string) {
    const detalhe = await this.abrirAnalise(analiseId);
    if (detalhe.status !== "PRONTA_PARA_REVISAO") throw new AnaliseConflitoError();

    const grupos = detalhe.avaliacoesPorArea;
    const atual = grupos.flatMap((g) => g.itens).find((i) => i.requisitoId === requisitoId);
    if (!atual) throw new AnaliseNaoEncontradaError(analiseId);
    return { grupos, atual };
  }
}

/** Recompõe os grupos com o item atualizado e devolve `{ item, resumo }`. */
function resultadoComItem(grupos: AreaComItens[], item: AvaliacaoItem): RevisaoRequisitoResultado {
  const gruposAtualizados = grupos.map((g) => ({
    area: g.area,
    itens: g.itens.map((i) => (i.id === item.id ? item : i)),
  }));
  return { item, resumo: calcularResumo(gruposAtualizados) };
}
