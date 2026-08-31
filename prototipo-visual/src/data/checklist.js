/**
 * Checklist da análise (dados de demonstração — NUP 24001.028501/2025-75).
 * Itens com status "na" representam verificações prejudicadas por dependência
 * de um item anterior e têm o checkbox desabilitado na interface.
 */
export const CHECKLIST_GROUPS = [
  {
    id: "dados-gerais",
    label: "DADOS GERAIS",
    items: [
      {
        id: "ci-setor",
        question:
          "O processo contém solicitação (CI) do setor interessado ou administrativo financeiro?",
        status: "error",
        detail:
          "Solicitação de Compra (CI) não localizada nos autos. Documento obrigatório para dar início formal ao processo licitatório.",
      },
      {
        id: "etp-presente",
        question: "O processo contém Estudo Técnico Preliminar (ETP)?",
        status: "success",
        pages: "p. 18–22",
        viewLabel: "Ver p. 18–22",
        detail:
          "ETP localizado nas p. 18–22 e contempla todos os elementos previstos no art. 18, caput, Lei nº 14.133/2021.",
      },
      {
        id: "etp-assinado",
        question: "O ETP está assinado pelo Ordenador de Despesas?",
        status: "error",
        detail:
          "ETP presente nas p. 18–22, porém sem assinatura do Ordenador de Despesas. Exigência prevista no art. 18, §1º, Lei nº 14.133/2021.",
      },
      {
        id: "tr-inicial",
        question: "O processo contém Termo de Referência inicial?",
        status: "warning",
        pages: "p. 23–31 (inicial) · p. 90–97 (final)",
        viewLabel: "Ver p. 23–31",
        detail:
          "TR inicial (p. 23–31) posteriormente tornado sem efeito. Versão posterior/final do TR nas p. 90–97, devidamente autorizada pelo Ordenador de Despesas.",
      },
      {
        id: "parecer-juridico",
        question: "Há Parecer Jurídico de aprovação do edital?",
        status: "error",
        detail:
          "Parecer jurídico de aprovação do edital não localizado nos autos. Documento obrigatório antes da publicação do instrumento convocatório (art. 53, Lei nº 14.133/2021).",
      },
      {
        id: "edital-assinado",
        question: "Há a última versão do edital assinado?",
        status: "na",
        detail:
          "Verificação prejudicada: a versão final do edital não pode ser validada enquanto o Parecer Jurídico (item anterior) estiver pendente.",
      },
      {
        id: "termo-delegacao",
        question: "Há Termo de Delegação da Coordenadora Geral?",
        status: "success",
        pages: "p. 176",
        viewLabel: "Ver p. 176",
        detail:
          "Termo de Delegação localizado nos autos, dentro do prazo de validade e com competência para o objeto licitado.",
      },
    ],
  },
  {
    id: "autorizacao-designacao",
    label: "AUTORIZAÇÃO E DESIGNAÇÃO",
    items: [
      {
        id: "autoridade-pge",
        question: "Há autorização de Autoridade Competente da PGE?",
        status: "success",
        pages: "p. 178",
        viewLabel: "Ver p. 178",
        detail:
          "Termo de Autorização Inicial de Procedimentos Licitatórios localizado na p. 178.",
      },
      {
        id: "decretos-pregoeiro",
        question: "Há decretos de designação de Pregoeiro ou de equipe de Apoio?",
        status: "success",
        pages: "p. 180–181",
        viewLabel: "Ver p. 180–181",
        detail:
          "Documentos de pregoeiro e equipe de apoio, e decreto de equipe de apoio — p. 180–181.",
      },
      {
        id: "seplag-mo-rp",
        question:
          "O processo é relacionado à MO ou Registro de Preços? Se sim, há parecer ou autorização da SEPLAG?",
        status: "na",
        detail:
          "Verificação prejudicada: a adoção ou não do Registro de Preços está em divergência entre o ETP e o edital — ver Obs. 2 (aba Técnica). Enquanto não resolvida, exigência SEPLAG não pode ser aferida.",
      },
      {
        id: "seplag-ti-cftv",
        question:
          "O processo é relacionado à aquisição de TI ou CFTV-ETICE? Se sim, há parecer da SEPLAG?",
        status: "success",
        pages: "p. 90–97",
        viewLabel: "Ver p. 90–97",
        detail:
          "Objeto é equipamento médico-odontológico; não se enquadra em TI ou CFTV-ETICE. Parecer SEPLAG não exigido para esta categoria.",
      },
    ],
  },
  {
    id: "justificativa",
    label: "JUSTIFICATIVA",
    items: [
      {
        id: "pesquisa-preco-justificativa",
        question: "Há justificativa da Pesquisa de Preço?",
        status: "warning",
        pages: "p. 150–155",
        viewLabel: "Ver p. 150–155",
        detail:
          "Dispersão superior a 40% entre cotações (R$ 170,00, R$ 190,00 e R$ 245,00). Justificativa apresentada é genérica e não atende ao §3º, art. 5º da IN SEGES nº 65/2021 — ver Obs. 5.",
      },
      {
        id: "qual-eco-fin",
        question: "Há justificativa da Qualificação Econômico-Financeira?",
        status: "success",
        pages: "p. 85–88",
        viewLabel: "Ver p. 85–88",
        detail:
          "Justificativa da Qualificação Econômico-Financeira localizada nas p. 85–88, com critérios objetivos e proporcionais ao objeto licitado.",
      },
      {
        id: "qual-tecnica",
        question: "Há justificativa de utilização da Qualificação Técnica?",
        status: "success",
        pages: "p. 77",
        viewLabel: "Ver p. 77",
        detail: "Justificativa de utilização da Qualificação Técnica localizada na p. 77.",
      },
      {
        id: "lc-123",
        question:
          "É aplicável os benefícios da LC 123/2006 para ME e EPP? Se não, há justificativa?",
        status: "warning",
        pages: "p. 112",
        viewLabel: "Ver p. 112",
        detail:
          "Benefícios da LC 123/2006 aplicados, porém o edital não detalha o critério de desempate para MPE/EPP na forma exigida pelo art. 44, §1º.",
      },
      {
        id: "vedacao-consorcio",
        question: "Há justificativa da não participação de empresas em consórcio?",
        status: "error",
        detail:
          "Edital veda participação em consórcio, mas não há justificativa fundamentada para a vedação, contrariando o art. 15, §1º, Lei nº 14.133/2021.",
      },
      {
        id: "carta-solidariedade",
        question: "Há carta de solidariedade?",
        status: "na",
        detail:
          "Verificação prejudicada: como a vedação ao consórcio não está justificada (item anterior), não é possível determinar se a exigência de carta de solidariedade é ou não aplicável.",
      },
    ],
  },
  {
    id: "dados-orcamentarios",
    label: "DADOS ORÇAMENTÁRIOS",
    items: [
      {
        id: "pesquisa-mercadologica",
        question: "Há Pesquisa Mercadológica ou Pré-Contrato?",
        status: "error",
        detail:
          "Cotações com validades vencidas ou próximas do vencimento antes da publicação do edital — ver Obs. 6. Pesquisa não atende aos requisitos da IN SEGES nº 65/2021.",
      },
      {
        id: "mapa-comparativo",
        question: "Há Mapa Comparativo de Preços?",
        status: "na",
        detail:
          "Verificação prejudicada: o mapa comparativo perde validade analítica diante da pesquisa mercadológica não-conforme (item anterior). Necessário refazer as cotações antes de validar.",
      },
      {
        id: "dotacao-orcamentaria",
        question: "Há indicação da Dotação Orçamentária?",
        status: "error",
        detail:
          "Indicação da dotação orçamentária não localizada nos autos. Exigência prevista no art. 40, I, Lei nº 14.133/2021.",
      },
    ],
  },
];

/** Total de itens verificáveis (exclui os de status "na", com checkbox desabilitado). */
export const CHECKLIST_VERIFIABLE_TOTAL = CHECKLIST_GROUPS.flatMap((g) => g.items).filter(
  (i) => i.status !== "na",
).length;
