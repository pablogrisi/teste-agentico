/**
 * Únicos status válidos para um requisito no MVP (PRD RF-007, glossário).
 * "Com ressalva" do protótipo NÃO faz parte do MVP.
 */
export const STATUS_REQUISITO = [
  'CONFORME',
  'NAO_CONFORME',
  'NAO_SE_APLICA',
] as const;

export type StatusRequisito = (typeof STATUS_REQUISITO)[number];
