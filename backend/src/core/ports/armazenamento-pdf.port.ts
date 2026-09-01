/** Token de injeção da porta. */
export const ARMAZENAMENTO_PDF_PORT = Symbol('ArmazenamentoPdfPort');

/**
 * Fronteira de armazenamento do PDF de entrada (SDD §8). No MVP o adapter é
 * filesystem; object storage entra depois (questoes-abertas.md A-05).
 */
export interface ArmazenamentoPdfPort {
  /** Persiste os bytes e devolve uma referência opaca para recuperação. */
  salvar(bytes: Buffer): Promise<string>;

  /** Lê o PDF completo a partir da referência. */
  ler(ref: string): Promise<Buffer>;

  /**
   * Lê uma página específica do PDF. Seam deixado deliberadamente sem
   * implementação: no ciclo do RF-014 (TSD-009) decidiu-se que o visor do
   * frontend navega para a página client-side (`#page=N`) contra o PDF inteiro,
   * então não há extração de página no servidor no MVP. Mantido para uma
   * eventual necessidade futura (ex.: recorte/render server-side), sem ciclo
   * agendado.
   */
  lerPagina(ref: string, pagina: number): Promise<Buffer>;
}
