import type { StatusAnalise } from "./types";

/** Todos os status de análise, na ordem do ciclo de vida (SDD §8). */
export const STATUS_ANALISE: readonly StatusAnalise[] = [
  "PENDENTE",
  "PROCESSANDO",
  "PRONTA_PARA_REVISAO",
  "ERRO_PROCESSAMENTO",
  "CONCLUIDA",
];

/** Rótulo em português para exibição. */
export const STATUS_ANALISE_LABEL: Record<StatusAnalise, string> = {
  PENDENTE: "Pendente",
  PROCESSANDO: "Processando",
  PRONTA_PARA_REVISAO: "Pronta para revisão",
  ERRO_PROCESSAMENTO: "Erro no processamento",
  CONCLUIDA: "Concluída",
};

/** Tom visual do badge de status (mapeado para tokens de cor na UI). */
export type StatusTone = "neutro" | "info" | "sucesso" | "erro";

export const STATUS_ANALISE_TONE: Record<StatusAnalise, StatusTone> = {
  PENDENTE: "neutro",
  PROCESSANDO: "info",
  PRONTA_PARA_REVISAO: "info",
  ERRO_PROCESSAMENTO: "erro",
  CONCLUIDA: "sucesso",
};

export function isStatusAnalise(valor: string): valor is StatusAnalise {
  return (STATUS_ANALISE as readonly string[]).includes(valor);
}
