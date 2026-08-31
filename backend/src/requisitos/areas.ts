/**
 * Vocabulário de áreas de requisito conhecido pelo importador.
 *
 * `area` no banco é um campo livre de propósito (o vocabulário deve crescer).
 * Esta allowlist existe só para a importação rejeitar typos — estendê-la é
 * uma mudança de uma linha aqui, sem migration.
 */
export const AREAS_CONHECIDAS = ['CHECKLIST', 'TECNICA'] as const;

export type AreaConhecida = (typeof AREAS_CONHECIDAS)[number];

export function isAreaConhecida(valor: string): valor is AreaConhecida {
  return (AREAS_CONHECIDAS as readonly string[]).includes(valor);
}
