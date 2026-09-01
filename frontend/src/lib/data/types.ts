/**
 * Tipos de domínio da camada de dados do frontend.
 *
 * Espelham o glossário (docs/product/glossario.md) e as decisões do PRD/SDD.
 * O contrato REST consumido é o de `GET /analises` (TSD-005 / SDD §7).
 */

/** Ciclo de vida de uma análise (SDD §8 / glossário). */
export type StatusAnalise =
  "PENDENTE" | "PROCESSANDO" | "PRONTA_PARA_REVISAO" | "ERRO_PROCESSAMENTO" | "CONCLUIDA";

/**
 * Status de conformidade de uma avaliação de requisito.
 * MVP: exatamente três valores (PRD §8). O "Com ressalva"/"warning" do protótipo
 * NÃO existe no MVP (ver TSD-002 §10.2 e .ai-dev/context-map.md).
 */
export type StatusRequisito = "CONFORME" | "NAO_CONFORME" | "NAO_SE_APLICA";

/** Campo de ordenação aceito por `GET /analises` (TSD-005). */
export type OrdenarAnalisesPor = "iniciadaEm" | "nup";

/** Direção de ordenação. */
export type OrdemListagem = "asc" | "desc";

/** Linha da lista de análises (`itens[]` de `GET /analises`). */
export interface AnaliseResumo {
  id: string;
  nup: string;
  /** Objeto/descrição da contratação. */
  objeto: string;
  status: StatusAnalise;
  /** ISO 8601. */
  iniciadaEm: string;
  /** ISO 8601, ou `null` enquanto não concluída. */
  concluidaEm: string | null;
}

/** Envelope paginado de `GET /analises`. */
export interface AnalisesPagina {
  itens: AnaliseResumo[];
  total: number;
  pagina: number;
  tamanho: number;
}

/** Parâmetros de consulta de `GET /analises` (TSD-005). */
export interface ListarAnalisesQuery {
  /** Busca em `nup` + `objeto`, contém, case/acento-insensitive. */
  q: string;
  /** Multi-seleção; vazio = todos. */
  status: StatusAnalise[];
  ordenarPor: OrdenarAnalisesPor;
  ordem: OrdemListagem;
  /** 1-based. */
  pagina: number;
  tamanho: number;
}
