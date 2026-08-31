import { UnprocessableEntityException } from '@nestjs/common';
import { isStatusAnalise, StatusAnalise } from './status-analise';

export type OrdenarPor = 'iniciadaEm' | 'nup';
export type Ordem = 'asc' | 'desc';

export interface ListarAnalisesParams {
  q?: string;
  status?: StatusAnalise[];
  ordenarPor: OrdenarPor;
  ordem: Ordem;
  pagina: number;
  tamanho: number;
}

const ORDENAR_POR: OrdenarPor[] = ['iniciadaEm', 'nup'];
const ORDEM: Ordem[] = ['asc', 'desc'];
const TAMANHO_MAX = 100;
const TAMANHO_DEFAULT = 20;

/** Query crua do `GET /analises` (tudo string, como chega na URL). */
export interface ListarAnalisesQueryRaw {
  q?: string;
  status?: string;
  ordenarPor?: string;
  ordem?: string;
  pagina?: string;
  tamanho?: string;
}

function inteiro(valor: string | undefined, padrao: number): number | null {
  if (valor === undefined || valor.trim() === '') return padrao;
  if (!/^-?\d+$/.test(valor.trim())) return null;
  return Number(valor.trim());
}

/**
 * Valida e normaliza a query da listagem. Lança 422 com a lista de erros se
 * algo estiver fora do contrato — sem tocar no banco.
 */
export function parseListarAnalisesQuery(
  raw: ListarAnalisesQueryRaw,
): ListarAnalisesParams {
  const erros: string[] = [];

  const q = raw.q?.trim() ? raw.q.trim() : undefined;

  let status: StatusAnalise[] | undefined;
  if (raw.status?.trim()) {
    const valores = raw.status
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');
    const invalidos = valores.filter((v) => !isStatusAnalise(v));
    if (invalidos.length > 0) {
      erros.push(`status inválido(s): ${invalidos.join(', ')}`);
    } else {
      status = valores as StatusAnalise[];
    }
  }

  const ordenarPorRaw = raw.ordenarPor?.trim() || 'iniciadaEm';
  if (!ORDENAR_POR.includes(ordenarPorRaw as OrdenarPor)) {
    erros.push(`ordenarPor deve ser um de: ${ORDENAR_POR.join(', ')}`);
  }

  const ordemRaw = raw.ordem?.trim() || 'desc';
  if (!ORDEM.includes(ordemRaw as Ordem)) {
    erros.push(`ordem deve ser "asc" ou "desc"`);
  }

  const pagina = inteiro(raw.pagina, 1);
  if (pagina === null || pagina < 1) {
    erros.push('pagina deve ser um inteiro >= 1');
  }

  const tamanho = inteiro(raw.tamanho, TAMANHO_DEFAULT);
  if (tamanho === null || tamanho < 1 || tamanho > TAMANHO_MAX) {
    erros.push(`tamanho deve ser um inteiro entre 1 e ${TAMANHO_MAX}`);
  }

  if (erros.length > 0) {
    throw new UnprocessableEntityException({
      message: 'Parâmetros de listagem inválidos',
      erros,
    });
  }

  return {
    q,
    status,
    ordenarPor: ordenarPorRaw as OrdenarPor,
    ordem: ordemRaw as Ordem,
    pagina: pagina as number,
    tamanho: tamanho as number,
  };
}
