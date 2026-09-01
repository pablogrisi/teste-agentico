import { calcularResumo } from "./analise-detalhe";
import { ANALISES_FIXTURE } from "./fixtures";
import type { AnaliseResumo, AnaliseDetalhe, AreaComItens, NormaReferencia } from "./types";

/**
 * Fixtures de `GET /analises/:id` (sem backend). Espelham o formato do contrato
 * (SDD §7 — TSD-004 + TSD-007 + TSD-009 + TSD-010). Andaime — substituídos pela API real
 * quando `NEXT_PUBLIC_API_BASE_URL` estiver configurada.
 */

const ANALISTA = { id: "analista-unico", nome: "Usuário Analista" };

function norma(over: Partial<NormaReferencia> = {}): NormaReferencia {
  return { lei: null, artigo: null, inciso: null, paragrafo: null, alinea: null, ...over };
}

/** Conjunto de avaliações de exemplo: 2 áreas Checklist + 1 Técnica, já ordenado (NAO_CONFORME antes). */
const AVALIACOES_EXEMPLO: AreaComItens[] = [
  {
    area: "CHECKLIST_DADOS_GERAIS",
    itens: [
      {
        id: "av-1",
        requisitoId: "req-1",
        codigo: "CHK-001",
        area: "CHECKLIST_DADOS_GERAIS",
        titulo: "O processo contém a solicitação (CI) do setor interessado?",
        descricao:
          "Deve constar comunicação interna ou documento equivalente do setor demandante, com identificação do responsável e data.",
        obrigatorio: true,
        ordem: 1,
        norma: norma({ lei: "Lei 14.133/2021", artigo: "18", inciso: "I" }),
        statusSugeridoIa: "NAO_CONFORME",
        statusFinal: "NAO_CONFORME",
        verificado: false,
        comentario: "Não localizada a CI de abertura; há apenas menção indireta na fl. 2.",
        paginaReferencia: 3,
      },
      {
        id: "av-2",
        requisitoId: "req-2",
        codigo: "CHK-002",
        area: "CHECKLIST_DADOS_GERAIS",
        titulo: "O ETP está assinado pelo Ordenador de Despesas?",
        descricao: "O Estudo Técnico Preliminar deve conter assinatura da autoridade competente.",
        obrigatorio: true,
        ordem: 2,
        norma: norma({ lei: "Lei 14.133/2021", artigo: "18", paragrafo: "1º" }),
        statusSugeridoIa: "CONFORME",
        statusFinal: "CONFORME",
        verificado: true,
        comentario: null,
        paginaReferencia: 12,
      },
    ],
  },
  {
    area: "CHECKLIST_ORCAMENTO",
    itens: [
      {
        id: "av-3",
        requisitoId: "req-3",
        codigo: "CHK-010",
        area: "CHECKLIST_ORCAMENTO",
        titulo: "Há pesquisa mercadológica ou pré-contrato?",
        descricao: "A estimativa de preços deve estar fundamentada em pesquisa de mercado.",
        obrigatorio: true,
        ordem: 1,
        norma: norma({ lei: "Lei 14.133/2021", artigo: "23" }),
        statusSugeridoIa: "NAO_CONFORME",
        statusFinal: "NAO_CONFORME",
        verificado: false,
        comentario: null,
        paginaReferencia: null,
      },
      {
        id: "av-4",
        requisitoId: "req-4",
        codigo: "CHK-011",
        area: "CHECKLIST_ORCAMENTO",
        titulo: "Há indicação da dotação orçamentária?",
        descricao: "Deve constar a classificação orçamentária que suportará a despesa.",
        obrigatorio: false,
        ordem: 2,
        norma: norma(),
        statusSugeridoIa: "NAO_SE_APLICA",
        statusFinal: "NAO_SE_APLICA",
        verificado: false,
        comentario: "Contratação sem impacto orçamentário no exercício.",
        paginaReferencia: null,
      },
    ],
  },
  {
    area: "TECNICA_ESPECIFICACOES",
    itens: [
      {
        id: "av-5",
        requisitoId: "req-5",
        codigo: "TEC-004",
        area: "TECNICA_ESPECIFICACOES",
        titulo: "Os quantitativos estão justificados?",
        descricao: "A memória de cálculo deve demonstrar como os quantitativos foram obtidos.",
        obrigatorio: true,
        ordem: 1,
        norma: norma({ lei: "Lei 14.133/2021", artigo: "18", inciso: "II" }),
        statusSugeridoIa: "NAO_CONFORME",
        statusFinal: "NAO_CONFORME",
        verificado: false,
        comentario: "Planilha sem memória de cálculo; quantitativos apresentados sem base.",
        paginaReferencia: 18,
      },
      {
        id: "av-6",
        requisitoId: "req-6",
        codigo: "TEC-001",
        area: "TECNICA_ESPECIFICACOES",
        titulo: "A especificação técnica é compatível com o objeto?",
        descricao:
          "As características exigidas devem guardar pertinência com a necessidade descrita.",
        obrigatorio: false,
        ordem: 2,
        norma: norma(),
        // A IA apontou não conformidade; o analista revisou e considerou conforme (RF-007/RF-008).
        statusSugeridoIa: "NAO_CONFORME",
        statusFinal: "CONFORME",
        verificado: true,
        comentario: "Especificação adequada após leitura do anexo técnico (fl. 21).",
        paginaReferencia: 21,
      },
    ],
  },
];

function detalheBase(resumoLista: AnaliseResumo, avaliacoes: AreaComItens[]): AnaliseDetalhe {
  return {
    id: resumoLista.id,
    nup: resumoLista.nup,
    objeto: resumoLista.objeto,
    status: resumoLista.status,
    motivoErro:
      resumoLista.status === "ERRO_PROCESSAMENTO"
        ? "A capacidade de análise por IA não respondeu a tempo. Tente reprocessar."
        : null,
    analistaId: ANALISTA.id,
    analistaNome: ANALISTA.nome,
    iniciadaEm: resumoLista.iniciadaEm,
    concluidaEm: resumoLista.concluidaEm,
    totalPaginasPdf: resumoLista.status === "PENDENTE" ? null : 24,
    resumo: calcularResumo(avaliacoes),
    avaliacoesPorArea: avaliacoes,
  };
}

const TEM_AVALIACOES = new Set(["PRONTA_PARA_REVISAO", "CONCLUIDA"]);

/** Sintetiza um `AnaliseDetalhe` a partir da linha da listagem (para ids sem fixture explícita). */
export function sintetizarDetalhe(resumoLista: AnaliseResumo): AnaliseDetalhe {
  const avaliacoes = TEM_AVALIACOES.has(resumoLista.status) ? clonarGrupos(AVALIACOES_EXEMPLO) : [];
  return detalheBase(resumoLista, avaliacoes);
}

/** Fixtures explícitas por id (batem com `ANALISES_FIXTURE` da listagem). */
export const ANALISES_DETALHE_FIXTURE: Record<string, AnaliseDetalhe> = Object.fromEntries(
  ["1", "3", "2", "5"]
    .map((id) => ANALISES_FIXTURE.find((a) => a.id === id))
    .filter((a): a is AnaliseResumo => a !== undefined)
    .map((a) => [a.id, sintetizarDetalhe(a)]),
);

function clonarGrupos(grupos: AreaComItens[]): AreaComItens[] {
  return grupos.map((g) => ({
    area: g.area,
    itens: g.itens.map((i) => ({ ...i, norma: { ...i.norma } })),
  }));
}

export function clonarDetalhe(detalhe: AnaliseDetalhe): AnaliseDetalhe {
  return {
    ...detalhe,
    resumo: { ...detalhe.resumo },
    avaliacoesPorArea: clonarGrupos(detalhe.avaliacoesPorArea),
  };
}
