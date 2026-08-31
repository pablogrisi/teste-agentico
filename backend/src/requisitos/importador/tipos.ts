/** Uma linha do arquivo de importação, já com tipos coerentes. */
export interface LinhaRequisito {
  codigo: string;
  area: string;
  titulo: string;
  descricao: string;
  obrigatorio: boolean;
  ordem: number;
  ativo: boolean;
  normaLei: string | null;
  normaArtigo: string | null;
  normaInciso: string | null;
  normaParagrafo: string | null;
  normaAlinea: string | null;
}

/** Campos que NÃO podem ser reescritos num requisito já existente (TSD-003). */
export const CAMPOS_IMUTAVEIS = [
  'titulo',
  'descricao',
  'obrigatorio',
  'normaLei',
  'normaArtigo',
  'normaInciso',
  'normaParagrafo',
  'normaAlinea',
] as const satisfies readonly (keyof LinhaRequisito)[];

export interface ErroLinha {
  linha: number;
  mensagem: string;
}

export interface ResultadoValidacao {
  ok: boolean;
  erros: ErroLinha[];
}

export interface ResumoImportacao {
  inseridos: number;
  atualizados: number;
  inalterados: number;
}

/** Lançado quando a importação não pode prosseguir; nada é gravado. */
export class ImportacaoInvalidaError extends Error {
  constructor(public readonly motivos: string[]) {
    super(`Importação de requisitos rejeitada:\n- ${motivos.join('\n- ')}`);
    this.name = 'ImportacaoInvalidaError';
  }
}
