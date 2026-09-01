import type { NovaAnaliseInput } from "./types";

/** Limite de tamanho do PDF, em MB — espelha `ANALISE_PDF_TAMANHO_MAX_MB` do backend (TSD-004). */
export const ANALISE_PDF_TAMANHO_MAX_MB = 25;
export const NUP_MAX = 60;
export const OBJETO_MAX = 2000;

const TAMANHO_MAX_BYTES = ANALISE_PDF_TAMANHO_MAX_MB * 1024 * 1024;

export interface ErrosNovaAnalise {
  nup?: string;
  objeto?: string;
  arquivo?: string;
}

export interface ResultadoValidacao {
  ok: boolean;
  erros: ErrosNovaAnalise;
}

/** Formata bytes em KB/MB no padrão pt-BR (ex.: "30,4 KB", "12,0 MB"). */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Valida o arquivo: precisa ser PDF (tipo/extensão) e ≤ 25 MB. Devolve o motivo, ou `null`. */
export function validarArquivoPdf(arquivo: File | null | undefined): string | null {
  if (!arquivo) return "Anexe o PDF do processo.";
  const ehPdf = arquivo.type === "application/pdf" || /\.pdf$/i.test(arquivo.name);
  if (!ehPdf) return "O arquivo precisa estar em PDF.";
  if (arquivo.size > TAMANHO_MAX_BYTES) {
    return `O PDF excede o limite de ${ANALISE_PDF_TAMANHO_MAX_MB} MB.`;
  }
  if (arquivo.size === 0) return "O arquivo está vazio.";
  return null;
}

/** Valida a entrada do modal. Client-side: obrigatórios + tipo/tamanho do arquivo. */
export function validarNovaAnalise(input: {
  nup: string;
  objeto: string;
  arquivo: File | null;
}): ResultadoValidacao {
  const erros: ErrosNovaAnalise = {};

  const nup = input.nup.trim();
  if (nup === "") erros.nup = "Informe o NUP.";
  else if (nup.length > NUP_MAX) erros.nup = `O NUP deve ter até ${NUP_MAX} caracteres.`;

  const objeto = input.objeto.trim();
  if (objeto === "") erros.objeto = "Informe o objeto da contratação.";
  else if (objeto.length > OBJETO_MAX)
    erros.objeto = `O objeto deve ter até ${OBJETO_MAX} caracteres.`;

  const erroArquivo = validarArquivoPdf(input.arquivo);
  if (erroArquivo) erros.arquivo = erroArquivo;

  return { ok: Object.keys(erros).length === 0, erros };
}

/** Normaliza a entrada validada para o formato que o gateway envia. */
export function toNovaAnaliseInput(input: {
  nup: string;
  objeto: string;
  arquivo: File;
}): NovaAnaliseInput {
  return { nup: input.nup.trim(), objeto: input.objeto.trim(), arquivo: input.arquivo };
}
