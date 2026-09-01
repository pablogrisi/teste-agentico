import type { StatusRequisito } from "./types";

/** Rótulo em português do status de conformidade de um requisito (PRD §8 — 3 valores). */
export const STATUS_REQUISITO_LABEL: Record<StatusRequisito, string> = {
  CONFORME: "Conforme",
  NAO_CONFORME: "Não conforme",
  NAO_SE_APLICA: "Não se aplica",
};

/** Tom visual do badge (mapeado para tokens de cor na UI). */
export type StatusRequisitoTone = "sucesso" | "erro" | "neutro";

export const STATUS_REQUISITO_TONE: Record<StatusRequisito, StatusRequisitoTone> = {
  CONFORME: "sucesso",
  NAO_CONFORME: "erro",
  NAO_SE_APLICA: "neutro",
};

export function isStatusRequisito(valor: string): valor is StatusRequisito {
  return valor === "CONFORME" || valor === "NAO_CONFORME" || valor === "NAO_SE_APLICA";
}
