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

/** Entrada de `POST /analises` (multipart) — TSD-004. */
export interface NovaAnaliseInput {
  nup: string;
  objeto: string;
  /** PDF do processo. */
  arquivo: File;
}

/** Resposta `201` de `POST /analises` (TSD-004). */
export interface AnaliseCriada {
  id: string;
  nup: string;
  objeto: string;
  status: StatusAnalise;
  iniciadaEm: string;
}

/** Referência normativa estruturada de um requisito (campos opcionais). */
export interface NormaReferencia {
  lei: string | null;
  artigo: string | null;
  inciso: string | null;
  paragrafo: string | null;
  alinea: string | null;
}

/** Uma avaliação de requisito dentro de uma análise (`avaliacoesPorArea[].itens[]`). */
export interface AvaliacaoItem {
  /** id da avaliação. */
  id: string;
  requisitoId: string;
  codigo: string;
  area: string;
  titulo: string;
  descricao: string;
  obrigatorio: boolean;
  ordem: number;
  norma: NormaReferencia;
  statusSugeridoIa: StatusRequisito;
  statusFinal: StatusRequisito;
  verificado: boolean;
  comentario: string | null;
  paginaReferencia: number | null;
}

/** Grupo de avaliações de uma área. */
export interface AreaComItens {
  area: string;
  itens: AvaliacaoItem[];
}

/** Contagens da análise (`resumo` de `GET /analises/:id`). */
export interface ResumoAnalise {
  total: number;
  conforme: number;
  naoConforme: number;
  naoSeAplica: number;
  verificados: number;
  obrigatoriosPendentes: number;
}

/** Payload de `GET /analises/:id` (SDD §7 — TSD-004 + TSD-007 + TSD-009 + TSD-010). */
export interface AnaliseDetalhe {
  id: string;
  nup: string;
  objeto: string;
  status: StatusAnalise;
  motivoErro: string | null;
  analistaId: string;
  analistaNome: string;
  iniciadaEm: string;
  concluidaEm: string | null;
  totalPaginasPdf: number | null;
  resumo: ResumoAnalise;
  avaliacoesPorArea: AreaComItens[];
}

/** Corpo enviado no fluxo "alterar parecer" da tela de análise (RF-008 — subset do PATCH da TSD-008). */
export interface AlteracaoParecerInput {
  statusFinal: StatusRequisito;
  comentario: string;
}

/** Resposta de `PATCH /analises/:id/requisitos/:requisitoId` (TSD-008): item atualizado + resumo recalculado. */
export interface RevisaoRequisitoResultado {
  item: AvaliacaoItem;
  resumo: ResumoAnalise;
}

/**
 * Requisito obrigatório ainda não verificado, devolvido pelo backend no `422` de
 * `POST /analises/:id/concluir` (`requisitosPendentes[]` — TSD-010). Formato espelha
 * `backend/src/analises/conclusao-analise.ts`.
 */
export interface RequisitoPendente {
  requisitoId: string;
  codigo: string;
  titulo: string;
  area: string;
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
