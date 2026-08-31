import { parse } from 'csv-parse/sync';
import { LinhaRequisito } from './tipos';

const COLUNAS_ESPERADAS = [
  'codigo',
  'area',
  'titulo',
  'descricao',
  'obrigatorio',
  'ordem',
  'ativo',
  'norma_lei',
  'norma_artigo',
  'norma_inciso',
  'norma_paragrafo',
  'norma_alinea',
] as const;

type ColunaCsv = (typeof COLUNAS_ESPERADAS)[number];
type RegistroCru = Record<ColunaCsv, string>;

export class CsvInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'CsvInvalidoError';
  }
}

/** Linha crua + o número da linha no arquivo (1 = cabeçalho). */
export interface LinhaCrua {
  numeroLinha: number;
  registro: RegistroCru;
}

/**
 * Faz o parse do CSV e devolve as linhas cruas, preservando o número de cada
 * uma para mensagens de erro. Não valida conteúdo — isso é de `validarLinhas`.
 */
type RegistroComInfo = { record: RegistroCru; info: { lines: number } };

export function parseRequisitosCsv(conteudo: string): LinhaCrua[] {
  let registros: RegistroComInfo[];
  try {
    registros = parse(conteudo, {
      columns: (cabecalho: string[]) => {
        const faltando = COLUNAS_ESPERADAS.filter(
          (c) => !cabecalho.includes(c),
        );
        if (faltando.length > 0) {
          throw new CsvInvalidoError(
            `Colunas ausentes no CSV: ${faltando.join(', ')}`,
          );
        }
        return cabecalho;
      },
      skip_empty_lines: true,
      trim: true,
      comment: '#',
      info: true,
    }) as RegistroComInfo[];
  } catch (erro) {
    if (erro instanceof CsvInvalidoError) throw erro;
    throw new CsvInvalidoError(
      `Falha ao ler o CSV: ${(erro as Error).message}`,
    );
  }

  return registros.map(({ record, info }) => ({
    numeroLinha: info.lines,
    registro: record,
  }));
}

const vazioParaNull = (v: string): string | null => {
  const t = v.trim();
  return t === '' ? null : t;
};

/**
 * Converte uma linha crua para `LinhaRequisito`. Não decide se os valores são
 * válidos além do que é preciso para tipar (booleans/números); a validação
 * semântica fica em `validarLinhas`, que recebe também o resultado daqui.
 */
export function coercirLinha(crua: LinhaCrua): {
  linha: LinhaRequisito | null;
  erros: string[];
} {
  const r = crua.registro;
  const erros: string[] = [];

  const parseBool = (nome: string, valor: string): boolean => {
    const v = valor.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    erros.push(`${nome} deve ser "true" ou "false" (recebido: "${valor}")`);
    return false;
  };

  const ordemNum = Number(r.ordem);
  if (!Number.isInteger(ordemNum)) {
    erros.push(`ordem deve ser um inteiro (recebido: "${r.ordem}")`);
  }

  const obrigatorio = parseBool('obrigatorio', r.obrigatorio);
  const ativo = parseBool('ativo', r.ativo);

  if (erros.length > 0) {
    return { linha: null, erros };
  }

  return {
    linha: {
      codigo: r.codigo.trim(),
      area: r.area.trim(),
      titulo: r.titulo.trim(),
      descricao: r.descricao.trim(),
      obrigatorio,
      ordem: ordemNum,
      ativo,
      normaLei: vazioParaNull(r.norma_lei),
      normaArtigo: vazioParaNull(r.norma_artigo),
      normaInciso: vazioParaNull(r.norma_inciso),
      normaParagrafo: vazioParaNull(r.norma_paragrafo),
      normaAlinea: vazioParaNull(r.norma_alinea),
    },
    erros: [],
  };
}
