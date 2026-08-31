/** Observações da aba Técnica (dados de demonstração). */
export const OBSERVATION_GROUPS = [
  {
    id: "modalidade",
    label: "MODALIDADE",
    items: [
      {
        id: "divergencia-srp",
        question:
          "Divergência entre ETP e edital sobre adoção do Sistema de Registro de Preços",
        detail:
          'O ETP (item 13.1) prevê contratação via Pregão Eletrônico com Registro de Preços, enquanto o edital e demais despachos indicam pregão sem RP. A contradição exige harmonização antes da publicação. Trecho analisado: "a aquisição será realizada através de licitação na modalidade Pregão Eletrônico com sistema de Registro de Preço".',
      },
    ],
  },
  {
    id: "preco",
    label: "PREÇO",
    items: [
      {
        id: "dispersao-40",
        question:
          "Justificativa insuficiente para dispersão superior a 40% na pesquisa de preços",
        detail:
          'A IN SEGES nº 65/2021 exige fundamentação específica quando a dispersão entre cotações supera 40%. A justificativa apresentada é genérica e não atende ao §3º do art. 5º. Valores identificados: R$ 170,00, R$ 190,00 e R$ 245,00 (dispersão ≈ 44%). Justificativa: "Apesar de a disparidade apresentar percentual acima de 40%, esclarecemos que a pesquisa baseia-se nos preços praticados no mercado atual."',
      },
      {
        id: "cotacoes-validade",
        question:
          "Cotações com validade vencida ou próxima do vencimento antes da publicação do edital",
        detail:
          "Risco de pesquisa desatualizada na data de publicação. Perboyre Castelo: validade 90 dias a partir de 23/01/2026 (vence ~23/04/2026). Imagem Odonto: válida até 25/05/2026. Dental Imagem: validade 365 dias. Recomenda-se confirmar vigência das cotações antes da publicação.",
      },
    ],
  },
  {
    id: "dados-processo",
    label: "DADOS DO PROCESSO",
    items: [
      {
        id: "erro-nup",
        question:
          "Erros recorrentes no número do processo administrativo ao longo dos autos",
        detail:
          'Diversas peças do processo referenciam "242001.028501/2025-75" ou variações, enquanto o NUP correto é "24001.028501/2025-75". O erro recorrente compromete a rastreabilidade e pode dificultar buscas e vinculações no sistema.',
      },
    ],
  },
];

/** Total de observações técnicas. */
export const OBSERVATIONS_TOTAL = OBSERVATION_GROUPS.flatMap((g) => g.items).length;
