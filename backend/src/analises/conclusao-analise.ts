import { AvaliacaoComRequisito } from './analise-detalhe';

export interface RequisitoPendente {
  requisitoId: string;
  codigo: string;
  titulo: string;
  area: string;
}

/**
 * Requisitos que travam a conclusão da análise (RF-012): os **obrigatórios**
 * ainda não verificados. A regra olha só `verificado` (decisão do ciclo, fiel ao
 * PRD) — um obrigatório com `statusFinal = NAO_SE_APLICA` mas `verificado = false`
 * também entra na lista. Ordenado por área e depois `requisito.ordem`.
 */
export function requisitosObrigatoriosPendentes(
  avaliacoes: AvaliacaoComRequisito[],
): RequisitoPendente[] {
  return avaliacoes
    .filter((a) => a.requisito.obrigatorio && !a.verificado)
    .sort((a, b) => {
      const area = a.requisito.area.localeCompare(b.requisito.area);
      return area !== 0 ? area : a.requisito.ordem - b.requisito.ordem;
    })
    .map((a) => ({
      requisitoId: a.requisitoId,
      codigo: a.requisito.codigo,
      titulo: a.requisito.titulo,
      area: a.requisito.area,
    }));
}
