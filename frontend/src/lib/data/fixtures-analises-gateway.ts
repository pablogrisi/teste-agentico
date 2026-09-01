import {
  AnaliseNaoEncontradaError,
  AnaliseValidacaoError,
  type AnalisesGateway,
} from "./analises-gateway";
import { TAMANHO_MAX, TAMANHO_PADRAO } from "./analises-query";
import { ANALISES_FIXTURE } from "./fixtures";
import {
  ANALISES_DETALHE_FIXTURE,
  clonarDetalhe,
  sintetizarDetalhe,
} from "./fixtures-analise-detalhe";
import { validarNovaAnalise } from "./nova-analise";
import type {
  AnaliseCriada,
  AnaliseDetalhe,
  AnaliseResumo,
  AnalisesPagina,
  ListarAnalisesQuery,
  NovaAnaliseInput,
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
}
