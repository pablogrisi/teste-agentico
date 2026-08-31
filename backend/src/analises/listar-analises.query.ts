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

/**
 * Query crua do `GET /analises`. Cada campo chega como string, mas o Express
 * entrega um array quando o parâmetro é repetido (`?status=A&status=B`) — por
 * isso o tipo aceita `string | string[]`.
 */
export interface ListarAnalisesQueryRaw {
  q?: string | string[];
  status?: string | string[];
  ordenarPor?: string | string[];
  ordem?: string | string[];
  pagina?: string | string[];
  tamanho?: string | string[];
}

/** Normaliza `string | string[]` para uma string. Para listas, junta com vírgula. */
function texto(valor: string | string[] | undefined): string | undefined {
  if (valor === undefined) return undefined;
  return Array.isArray(valor) ? valor.join(',') : valor;
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

  const qRaw = texto(raw.q)?.trim();
  const q = qRaw ? qRaw : undefined;

  let status: StatusAnalise[] | undefined;
  const statusRaw = texto(raw.status)?.trim();
  if (statusRaw) {
    const valores = statusRaw
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

  const ordenarPorRaw = texto(raw.ordenarPor)?.trim() || 'iniciadaEm';
  if (!ORDENAR_POR.includes(ordenarPorRaw as OrdenarPor)) {
    erros.push(`ordenarPor deve ser um de: ${ORDENAR_POR.join(', ')}`);
  }

  const ordemRaw = texto(raw.ordem)?.trim() || 'desc';
  if (!ORDEM.includes(ordemRaw as Ordem)) {
    erros.push(`ordem deve ser "asc" ou "desc"`);
  }

  const pagina = inteiro(texto(raw.pagina), 1);
  if (pagina === null || pagina < 1) {
    erros.push('pagina deve ser um inteiro >= 1');
  }

  const tamanho = inteiro(texto(raw.tamanho), TAMANHO_DEFAULT);
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
