/** Total de documentos esperados para o tipo de processo (não conta os trechos fora do escopo). */
export const EXPECTED_DOCUMENTS = 15;

/**
 * Sumário pré-preenchido pela Licia para o documento de demonstração
 * (24001.028501/2025-75, 214 páginas).
 *
 * O caderno compilado intercala documentos com material de instrução que a
 * análise não usa — comprovantes de envio, declarações de recebimento,
 * despachos, folhas de protocolo. Esses intervalos entram como `foraEscopo` e
 * respondem por ~40% das páginas. Como toda página entre o primeiro e o último
 * documento cai num documento ou num trecho fora do escopo, não existe mais página
 * órfã.
 *
 * Estados: `idle` (documento localizado, a conferir), `foraEscopo` (intervalo
 * entre documentos) e `ausente` (documento esperado que não foi encontrado).
 *
 * `shortName` é o rótulo do mapa, onde o segmento tem 48px e o nome inteiro não
 * cabe. A tabela sempre usa `name`.
 */
export const SUMARIO_DOCUMENTS = [
  { id: "d01", name: "Estudo Técnico Preliminar", shortName: "Estudo Técnico Preliminar", startPage: 1, endPage: 10, state: "idle" },
  { id: "f01", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 11, endPage: 18, state: "foraEscopo" },

  { id: "d02", name: "Termo de Referência", shortName: "Termo de Referência", startPage: 19, endPage: 40, state: "idle" },
  { id: "f02", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 41, endPage: 46, state: "foraEscopo" },

  { id: "d03", name: "Mapa de Preço", shortName: "Mapa de Preço", startPage: 47, endPage: 51, state: "idle" },
  { id: "f03", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 52, endPage: 60, state: "foraEscopo" },

  { id: "d04", name: "Pesquisa de Preços", shortName: "Pesquisa de Preços", startPage: 61, endPage: 75, state: "idle" },
  { id: "f04", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 76, endPage: 79, state: "foraEscopo" },

  { id: "d05", name: "Justificativa de Natureza Continuada", shortName: "J. Natureza Continuada", startPage: 80, endPage: 81, state: "idle" },
  { id: "f05", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 82, endPage: 92, state: "foraEscopo" },

  { id: "d06", name: "Justificativa de Qualificação Técnica", shortName: "J. Qualificação Técnica", startPage: 93, endPage: 94, state: "idle" },
  { id: "f06", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 95, endPage: 99, state: "foraEscopo" },

  { id: "d07", name: "Justificativa de Consórcio", shortName: "J. Consórcio", startPage: 100, endPage: 101, state: "idle" },
  { id: "f07", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 102, endPage: 108, state: "foraEscopo" },

  { id: "d08", name: "Justificativa de Qualificação Econômico-Financeira", shortName: "J. Qualif. Econ.-Financeira", startPage: 109, endPage: 116, state: "idle" },
  { id: "f08", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 117, endPage: 128, state: "foraEscopo" },

  { id: "d09", name: "Edital", shortName: "Edital", startPage: 129, endPage: 173, state: "idle" },
  { id: "f09", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 174, endPage: 179, state: "foraEscopo" },

  { id: "d10", name: "Parecer Jurídico", shortName: "Parecer Jurídico", startPage: 180, endPage: 193, state: "idle" },
  { id: "f10", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 194, endPage: 203, state: "foraEscopo" },

  { id: "d11", name: "Justificativa de Amostras", shortName: "J. Amostras", startPage: 204, endPage: 204, state: "idle" },
  { id: "f11", name: "Trecho fora do escopo", shortName: "fora do escopo", startPage: 205, endPage: 212, state: "foraEscopo" },

  { id: "d12", name: "Justificativa de Agrupamento", shortName: "J. Agrupamento", startPage: 213, endPage: 214, state: "idle" },

  { id: "d13", name: "Justificativa de Cota Reservada", shortName: "J. Cota Reservada", startPage: null, endPage: null, state: "ausente" },
  { id: "d14", name: "Justificativa para Subcontratação", shortName: "J. Subcontratação", startPage: null, endPage: null, state: "ausente" },
  { id: "d15", name: "Justificativa para Indicação de Marca", shortName: "J. Indicação de Marca", startPage: null, endPage: null, state: "ausente" },
];
