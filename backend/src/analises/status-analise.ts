/**
 * Ciclo de vida de uma análise (SDD §7).
 *
 * String validada em código, não enum de banco — as transições são dirigidas
 * pela aplicação (worker de RF-005, conclusão de RF-012). Estender é uma
 * mudança de uma linha aqui, sem migration.
 */
export const STATUS_ANALISE = [
  'PENDENTE',
  'PROCESSANDO',
  'PRONTA_PARA_REVISAO',
  'ERRO_PROCESSAMENTO',
  'CONCLUIDA',
] as const;

export type StatusAnalise = (typeof STATUS_ANALISE)[number];

export function isStatusAnalise(valor: string): valor is StatusAnalise {
  return (STATUS_ANALISE as readonly string[]).includes(valor);
}
