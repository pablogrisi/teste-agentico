import {
  AnaliseDetalhe,
  NormaReferencia,
  ResumoAnalise,
} from '../analises/analise-detalhe';

export interface LinhaRelatorio {
  codigo: string;
  titulo: string;
  /** Norma estruturada já formatada; `''` quando não há norma. */
  norma: string;
  paginaReferencia: number | null;
  statusFinal: string;
}

export interface AreaRelatorio {
  area: string;
  itens: LinhaRelatorio[];
}

export interface RelatorioModelo {
  nup: string;
  objeto: string;
  analistaId: string;
  analistaNome: string;
  iniciadaEm: Date;
  concluidaEm: Date | null;
  resumo: ResumoAnalise;
  areas: AreaRelatorio[];
}

/**
 * Junta as partes não nulas da referência normativa numa linha legível:
 * `Lei 14.133/2021, art. 72, inc. I, § 1º, alínea a`. `''` se tudo for nulo.
 */
export function formatarNorma(norma: NormaReferencia): string {
  const partes: string[] = [];
  if (norma.lei) partes.push(norma.lei);
  if (norma.artigo) partes.push(`art. ${norma.artigo}`);
  if (norma.inciso) partes.push(`inc. ${norma.inciso}`);
  if (norma.paragrafo) partes.push(`§ ${norma.paragrafo}`);
  if (norma.alinea) partes.push(`alínea ${norma.alinea}`);
  return partes.join(', ');
}

/**
 * Deriva o modelo do relatório (RF-016) a partir do detalhe da análise. Puro e
 * testável: não renderiza nada. Reordena os itens de cada área por
 * `requisito.ordem` — o `montarAnaliseDetalhe` os traz com `NAO_CONFORME`
 * primeiro (visão de tela), mas o relatório quer a ordem natural do documento.
 */
export function montarModeloRelatorio(
  detalhe: AnaliseDetalhe,
): RelatorioModelo {
  return {
    nup: detalhe.nup,
    objeto: detalhe.objeto,
    analistaId: detalhe.analistaId,
    analistaNome: detalhe.analistaNome,
    iniciadaEm: detalhe.iniciadaEm,
    concluidaEm: detalhe.concluidaEm,
    resumo: detalhe.resumo,
    areas: detalhe.avaliacoesPorArea.map((grupo) => ({
      area: grupo.area,
      itens: [...grupo.itens]
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => ({
          codigo: item.codigo,
          titulo: item.titulo,
          norma: formatarNorma(item.norma),
          paginaReferencia: item.paginaReferencia,
          statusFinal: item.statusFinal,
        })),
    })),
  };
}
