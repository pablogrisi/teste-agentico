import { Analise, AvaliacaoRequisito, Requisito } from '@prisma/client';
import { StatusRequisito } from '../core/domain/status-requisito';

export type AvaliacaoComRequisito = AvaliacaoRequisito & {
  requisito: Requisito;
};

export interface NormaReferencia {
  lei: string | null;
  artigo: string | null;
  inciso: string | null;
  paragrafo: string | null;
  alinea: string | null;
}

export interface AvaliacaoItem {
  id: string;
  requisitoId: string;
  codigo: string;
  area: string;
  titulo: string;
  descricao: string;
  obrigatorio: boolean;
  ordem: number;
  norma: NormaReferencia;
  statusSugeridoIa: string;
  statusFinal: string;
  verificado: boolean;
  comentario: string | null;
  paginaReferencia: number | null;
}

export interface AreaComItens {
  area: string;
  itens: AvaliacaoItem[];
}

export interface ResumoAnalise {
  total: number;
  conforme: number;
  naoConforme: number;
  naoSeAplica: number;
  verificados: number;
  obrigatoriosPendentes: number;
}

export interface AnaliseDetalhe {
  id: string;
  nup: string;
  objeto: string;
  status: string;
  motivoErro: string | null;
  iniciadaEm: Date;
  concluidaEm: Date | null;
  totalPaginasPdf: number | null;
  resumo: ResumoAnalise;
  avaliacoesPorArea: AreaComItens[];
}

const NAO_CONFORME: StatusRequisito = 'NAO_CONFORME';

export function toItem(a: AvaliacaoComRequisito): AvaliacaoItem {
  const r = a.requisito;
  return {
    id: a.id,
    requisitoId: a.requisitoId,
    codigo: r.codigo,
    area: r.area,
    titulo: r.titulo,
    descricao: r.descricao,
    obrigatorio: r.obrigatorio,
    ordem: r.ordem,
    norma: {
      lei: r.normaLei,
      artigo: r.normaArtigo,
      inciso: r.normaInciso,
      paragrafo: r.normaParagrafo,
      alinea: r.normaAlinea,
    },
    statusSugeridoIa: a.statusSugeridoIa,
    statusFinal: a.statusFinal,
    verificado: a.verificado,
    comentario: a.comentario,
    paginaReferencia: a.paginaReferencia,
  };
}

/** Contagens da análise (RF-009 / RF-012), por `statusFinal`. */
export function calcularResumo(
  avaliacoes: AvaliacaoComRequisito[],
): ResumoAnalise {
  return {
    total: avaliacoes.length,
    conforme: avaliacoes.filter((a) => a.statusFinal === 'CONFORME').length,
    naoConforme: avaliacoes.filter((a) => a.statusFinal === 'NAO_CONFORME')
      .length,
    naoSeAplica: avaliacoes.filter((a) => a.statusFinal === 'NAO_SE_APLICA')
      .length,
    verificados: avaliacoes.filter((a) => a.verificado).length,
    obrigatoriosPendentes: avaliacoes.filter(
      (a) => a.requisito.obrigatorio && !a.verificado,
    ).length,
  };
}

/**
 * Monta o payload de leitura da análise (RF-009): avaliações agrupadas por área
 * (alfabética), cada grupo com os não conformes (por `statusFinal`) primeiro e
 * depois por `ordem`; mais um resumo de contagens.
 */
export function montarAnaliseDetalhe(
  analise: Analise,
  avaliacoes: AvaliacaoComRequisito[],
): AnaliseDetalhe {
  const porArea = new Map<string, AvaliacaoItem[]>();
  for (const a of avaliacoes) {
    const item = toItem(a);
    const lista = porArea.get(item.area) ?? [];
    lista.push(item);
    porArea.set(item.area, lista);
  }

  const avaliacoesPorArea: AreaComItens[] = [...porArea.keys()]
    .sort((x, y) => x.localeCompare(y))
    .map((area) => ({
      area,
      itens: porArea.get(area)!.sort((a, b) => {
        const pa = a.statusFinal === NAO_CONFORME ? 0 : 1;
        const pb = b.statusFinal === NAO_CONFORME ? 0 : 1;
        return pa !== pb ? pa - pb : a.ordem - b.ordem;
      }),
    }));

  return {
    id: analise.id,
    nup: analise.nup,
    objeto: analise.objeto,
    status: analise.status,
    motivoErro: analise.motivoErro,
    iniciadaEm: analise.iniciadaEm,
    concluidaEm: analise.concluidaEm,
    totalPaginasPdf: analise.totalPaginasPdf,
    resumo: calcularResumo(avaliacoes),
    avaliacoesPorArea,
  };
}
