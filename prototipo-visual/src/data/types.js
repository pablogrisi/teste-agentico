/**
 * Modelos de domínio da Analisadora.
 *
 * Os formatos abaixo são JSDoc: documentação que o editor lê para dar
 * autocomplete, mas que **nada verifica** no build. Se um campo mudar aqui,
 * nada quebra sozinho — atualize também quem usa.
 */

/**
 * Situação de um item de checklist conforme avaliação da Licia.
 * @typedef {"success" | "warning" | "error" | "na"} ChecklistStatus
 */

/** Rótulo exibido para cada situação. */
export const STATUS_LABEL = {
  success: "Conforme",
  warning: "Com ressalva",
  error: "Não-conforme",
  na: "Não se aplica",
};

/**
 * Filtros disponíveis na aba Checklist.
 * @typedef {"nao-conforme" | "conforme" | "nao-aplica" | "todos"} ChecklistFilter
 */

/**
 * Item individual do checklist (uma verificação).
 * @typedef {object} ChecklistItem
 * @property {string} id
 * @property {string} question
 * @property {ChecklistStatus} status
 * @property {string} detail        Análise textual da Licia.
 * @property {string} [pages]       Referência de páginas no PDF, ex.: "p. 18–22".
 * @property {string} [viewLabel]   Rótulo do botão "Ver p. …" quando há referência navegável.
 */

/**
 * Agrupamento de itens do checklist (ex.: DADOS GERAIS).
 * @typedef {object} ChecklistGroup
 * @property {string} id
 * @property {string} label
 * @property {ChecklistItem[]} items
 */

/**
 * Observação da aba Técnica (item neutro, sem situação).
 * @typedef {object} Observation
 * @property {string} id
 * @property {string} question
 * @property {string} detail
 */

/**
 * Grupo de observações técnicas.
 * @typedef {object} ObservationGroup
 * @property {string} id
 * @property {string} label
 * @property {Observation[]} items
 */

/**
 * Linha da lista de análises (página inicial).
 * @typedef {object} AnalysisSummary
 * @property {string} id
 * @property {string} nup
 * @property {string} subject   Objeto da contratação.
 * @property {string} addedAt   Data e hora de adição, ex.: "20/03/2024 - 14:30".
 * @property {string} addedBy   Responsável pela adição.
 */

/**
 * Documento exibido no visor de PDF.
 * @typedef {object} AnalysisDocument
 * @property {string} fileName
 * @property {number} totalPages
 */

/**
 * Estados da linha da tabela de documentos (componente `Sumário/Linha-peça`).
 * - `idle`       — documento localizado pela Licia
 * - `atual`      — em edição (nome e páginas viram campos)
 * - `ausente`    — documento esperado que não foi localizado no caderno
 * - `foraEscopo` — intervalo entre dois documentos, com material de instrução
 *                  que a análise não usa (~40% do caderno)
 * @typedef {"idle" | "atual" | "ausente" | "foraEscopo"} SumarioItemState
 */

/**
 * Item do sumário do documento compilado: um documento ou um trecho fora do
 * escopo. Não há ordenação — a posição no caderno é dada por `startPage`.
 * @typedef {object} SumarioItem
 * @property {string} id
 * @property {string} name
 * @property {string} shortName          Rótulo curto, usado só nos segmentos do mapa.
 * @property {number | null} startPage   Página inicial no PDF; `null` quando não localizado.
 * @property {number | null} endPage     Página final no PDF; `null` quando não localizado.
 * @property {SumarioItemState} state
 */
