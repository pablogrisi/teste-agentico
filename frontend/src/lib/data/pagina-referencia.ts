/** Valor "campo vazio" do editor de página — vira `paginaReferencia: null` (limpar). */
export const PAGINA_REFERENCIA_VAZIO = "";

export interface ResultadoValidacaoPagina {
  /** Valor a enviar no `PATCH { paginaReferencia }` (ou `null` para limpar). */
  pagina: number | null;
  /** Mensagem quando o valor não passa; nesse caso não se deve enviar. */
  erro?: string;
}

/**
 * Valida a página que o analista digitou no editor inline (RF-014), espelhando o backend
 * (TSD-009): inteiro `1..totalPaginas` quando o total é conhecido, `≥ 1` quando `null`, ou
 * string vazia → `null` (limpar a referência).
 */
export function validarPaginaReferencia(
  valor: string,
  totalPaginas: number | null,
): ResultadoValidacaoPagina {
  if (valor.trim() === "") return { pagina: null };

  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) {
    return { pagina: null, erro: "Informe um número de página válido (inteiro ≥ 1)." };
  }
  if (totalPaginas !== null && n > totalPaginas) {
    return { pagina: null, erro: `O documento tem ${totalPaginas} páginas.` };
  }
  return { pagina: n };
}
