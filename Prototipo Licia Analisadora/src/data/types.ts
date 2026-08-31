/** Modelos de domínio da Analisadora. */

/** Situação de um item de checklist conforme avaliação da Licia. */
export type ChecklistStatus = "success" | "warning" | "error" | "na";

/** Rótulo exibido para cada situação. */
export const STATUS_LABEL: Record<ChecklistStatus, string> = {
  success: "Conforme",
  warning: "Com ressalva",
  error: "Não-conforme",
  na: "Não se aplica",
};

/** Filtros disponíveis na aba Checklist. */
export type ChecklistFilter = "nao-conforme" | "conforme" | "nao-aplica" | "todos";

/** Item individual do checklist (uma verificação). */
export interface ChecklistItem {
  id: string;
  question: string;
  status: ChecklistStatus;
  /** Análise textual da Licia. */
  detail: string;
  /** Referência de páginas no PDF, ex.: "p. 18–22". */
  pages?: string;
  /** Rótulo do botão "Ver p. …" quando há referência navegável. */
  viewLabel?: string;
}

/** Agrupamento de itens do checklist (ex.: DADOS GERAIS). */
export interface ChecklistGroup {
  id: string;
  label: string;
  items: ChecklistItem[];
}

/** Observação da aba Técnica (item neutro, sem situação). */
export interface Observation {
  id: string;
  question: string;
  detail: string;
}

/** Grupo de observações técnicas. */
export interface ObservationGroup {
  id: string;
  label: string;
  items: Observation[];
}

/** Linha da lista de análises (página inicial). */
export interface AnalysisSummary {
  id: string;
  nup: string;
  /** Objeto da contratação. */
  subject: string;
  /** Data e hora de adição, ex.: "20/03/2024 - 14:30". */
  addedAt: string;
  /** Responsável pela adição. */
  addedBy: string;
}

/** Documento exibido no visor de PDF. */
export interface AnalysisDocument {
  fileName: string;
  totalPages: number;
}
