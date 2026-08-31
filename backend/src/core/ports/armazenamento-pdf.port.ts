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
   * Lê uma página específica do PDF (para o visor com referência de página,
   * RF-014). Implementação real entra no ciclo do RF-014.
   */
  lerPagina(ref: string, pagina: number): Promise<Buffer>;
}
