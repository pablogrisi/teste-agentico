import { SUMARIO_DOCUMENTS } from "./sumario";

/** Folhas em que o NUP aparece grafado errado (origem da Obs. 23 da análise). */
const NUP_TYPO_PAGES = [15, 91, 152];

const ITENS = [
  "Monitor multiparamétrico de sinais vitais",
  "Bomba de infusão volumétrica",
  "Desfibrilador bifásico com marcapasso",
  "Ventilador pulmonar de transporte",
  "Eletrocardiógrafo de 12 canais",
  "Oxímetro de pulso portátil",
  "Aspirador cirúrgico elétrico",
  "Foco cirúrgico de teto LED",
  "Autoclave horizontal 100 litros",
  "Carro de emergência com desfibrilador",
  "Berço aquecido para recém-nascido",
  "Bisturi eletrônico 400 W",
];

const FORNECEDORES = [
  "Medtec Hospitalar Ltda.",
  "Cearense Distribuidora de Equipamentos S.A.",
  "Vita Nordeste Comércio de Produtos Médicos",
  "Hospitalar Brasil Importação Ltda.",
];

const SPECS = {
  d01: {
    title: "Estudo Técnico Preliminar",
    layout: "texto",
    sections: [
      "Descrição da necessidade da contratação",
      "Área requisitante e alinhamento ao planejamento",
      "Requisitos da contratação",
      "Estimativa das quantidades a serem contratadas",
      "Levantamento de mercado",
      "Estimativa do valor da contratação",
      "Descrição da solução como um todo",
      "Justificativa para o parcelamento do objeto",
      "Resultados pretendidos",
      "Providências prévias ao contrato",
      "Contratações correlatas e interdependentes",
      "Declaração de viabilidade da contratação",
    ],
    paragraphs: [
      "A rede hospitalar estadual registra crescimento sustentado da demanda por leitos de terapia intensiva, com taxa média de ocupação de 92% no último exercício, o que evidencia a insuficiência do parque de equipamentos atualmente instalado.",
      "O levantamento realizado junto às unidades da Coordenadoria de Assistência Hospitalar apontou 47 equipamentos com vida útil expirada, dos quais 19 encontram-se inoperantes e sem possibilidade técnica de recuperação.",
      "A aquisição pretendida guarda aderência ao Plano Estadual de Saúde e ao Plano de Contratações Anual da SESA, estando contemplada na dotação orçamentária da unidade gestora 24001.",
      "Foram consultadas três soluções alternativas: locação de equipamentos, recuperação do parque existente e aquisição direta. A análise de custo total de propriedade em cinco anos indicou a aquisição como a alternativa mais vantajosa.",
      "Os quantitativos foram dimensionados a partir da série histórica de consumo dos últimos 24 meses, acrescida da projeção de abertura de 32 novos leitos previstos para o exercício seguinte.",
      "A contratação não gera dependência tecnológica de fornecedor único, uma vez que as especificações foram redigidas em termos de desempenho e não de marca ou modelo.",
    ],
  },
  d02: {
    title: "Termo de Referência",
    layout: "tabela",
    sections: [
      "Objeto da contratação",
      "Fundamentação e descrição da necessidade",
      "Especificação técnica dos itens",
      "Modelo de execução do objeto",
      "Modelo de gestão do contrato",
      "Critérios de medição e pagamento",
      "Forma e critérios de seleção do fornecedor",
      "Estimativas do valor da contratação",
      "Adequação orçamentária",
      "Obrigações da contratada",
      "Obrigações da contratante",
      "Sanções administrativas",
    ],
    paragraphs: [
      "Aquisição de equipamentos e material permanente médico-hospitalar destinados ao reaparelhamento das unidades de terapia intensiva da rede própria da Secretaria da Saúde do Estado do Ceará.",
      "Os equipamentos deverão ser entregues novos, de primeiro uso, acondicionados em embalagem original do fabricante, acompanhados de manual em língua portuguesa e certificado de registro na ANVISA vigente.",
      "O prazo de entrega é de até 60 (sessenta) dias corridos, contados do recebimento da ordem de fornecimento, no almoxarifado central da SESA, situado em Fortaleza/CE.",
      "A garantia mínima exigida é de 24 (vinte e quatro) meses on-site, com atendimento técnico em até 48 horas úteis da abertura do chamado e substituição do equipamento em caso de indisponibilidade superior a 15 dias.",
      "O recebimento provisório será realizado por servidor designado, no prazo de até 5 dias úteis; o definitivo, por comissão, em até 15 dias úteis, após a verificação de conformidade e o teste de funcionamento assistido.",
    ],
  },
  d03: {
    title: "Mapa de Preço",
    layout: "tabela",
    sections: [
      "Consolidação dos preços por item",
      "Metodologia de cálculo adotada",
      "Tratamento de valores discrepantes",
      "Preço de referência apurado",
    ],
    paragraphs: [
      "O preço de referência de cada item foi apurado pela mediana das cotações válidas, em observância ao art. 6º da IN SEGES/ME nº 65/2021, com descarte prévio dos valores excessivamente elevados ou inexequíveis.",
      "Foram consideradas válidas as cotações obtidas em painéis oficiais de preços, contratações similares de outros entes e pesquisa direta com fornecedores do ramo, todas com data-base dos últimos 180 dias.",
    ],
  },
  d04: {
    title: "Pesquisa de Preços",
    layout: "tabela",
    sections: [
      "Fontes consultadas",
      "Cotações recebidas de fornecedores",
      "Contratações similares de outros entes",
      "Painel de Preços do Governo Federal",
      "Análise crítica das cotações",
    ],
    paragraphs: [
      "A pesquisa foi conduzida entre 03/02/2026 e 21/02/2026, tendo sido enviadas solicitações formais de cotação a 11 fornecedores do ramo, com retorno efetivo de 4 empresas.",
      "As atas de registro de preços consultadas foram as do Ministério da Saúde (ARP 128/2025), do Estado de Pernambuco (ARP 44/2025) e do Município de Fortaleza (ARP 09/2026).",
      "Não foram identificadas cotações inexequíveis. Duas propostas foram descartadas por apresentarem valores superiores a 25% da mediana apurada.",
    ],
  },
  d09: {
    title: "Edital de Pregão Eletrônico nº 001/2026",
    layout: "clausula",
    sections: [
      "Do objeto",
      "Da participação no pregão",
      "Do credenciamento no sistema",
      "Da apresentação das propostas",
      "Da abertura da sessão pública",
      "Da formulação de lances",
      "Do julgamento das propostas",
      "Da negociação e aceitabilidade",
      "Da habilitação jurídica",
      "Da qualificação econômico-financeira",
      "Da qualificação técnica",
      "Dos recursos administrativos",
      "Da adjudicação e homologação",
      "Da contratação e do reajuste",
      "Das sanções administrativas",
      "Das disposições finais",
    ],
    paragraphs: [
      "A sessão pública será realizada por meio do sistema eletrônico oficial, com abertura das propostas às 09h00 (horário de Brasília) da data indicada no preâmbulo deste edital.",
      "O critério de julgamento é o de menor preço por item, observadas as especificações técnicas mínimas e os prazos de entrega e garantia fixados no Termo de Referência.",
      "A licitante deverá declarar, em campo próprio do sistema, o cumprimento dos requisitos de habilitação e a inexistência de fato impeditivo, sob pena de responsabilização administrativa.",
      "Encerrada a etapa de lances, o pregoeiro poderá encaminhar contraproposta à licitante de menor preço, vedada a negociação em condições diversas das previstas neste edital.",
      "Os recursos deverão ser manifestados de forma imediata e motivada, em campo próprio do sistema, no prazo de 10 (dez) minutos após a declaração do vencedor de cada item.",
    ],
  },
  d10: {
    title: "Parecer Jurídico Referencial",
    layout: "texto",
    sections: [
      "Relatório",
      "Da competência da assessoria jurídica",
      "Dos pressupostos formais do procedimento",
      "Da análise do Termo de Referência",
      "Da análise da pesquisa de preços",
      "Da minuta do edital",
      "Da minuta do contrato",
      "Conclusão e ressalvas",
    ],
    paragraphs: [
      "Trata-se de processo administrativo instaurado pela Secretaria da Saúde com vistas à aquisição de equipamentos médico-hospitalares, submetido a esta assessoria jurídica na forma do art. 53 da Lei nº 14.133/2021.",
      "A análise ora empreendida restringe-se aos aspectos jurídico-formais do procedimento, não alcançando os elementos de natureza técnica, econômica ou discricionária, cuja aferição compete à área requisitante.",
      "Verifica-se que a minuta de edital contempla as cláusulas obrigatórias do art. 25 da Lei nº 14.133/2021, bem como os prazos recursais e os critérios de julgamento exigidos pela legislação de regência.",
      "Recomenda-se, antes da publicação, o saneamento da divergência de numeração do NUP identificada em folhas do caderno processual, de modo a preservar a unicidade da autuação.",
    ],
    signature: { name: "Dra. Helena Vasconcelos Aragão", role: "Procuradora do Estado — PGE/CE" },
  },
};

/** Molde padrão dos documentos curtos de justificativa. */
const JUSTIFICATIVA = {
  d05: {
    title: "Justificativa de Natureza Continuada",
    paragraphs: [
      "O objeto não se enquadra como serviço de natureza continuada, tratando-se de aquisição de bens permanentes com entrega única, razão pela qual não se aplica a vigência plurianual prevista no art. 106 da Lei nº 14.133/2021.",
      "Registre-se que a manutenção corretiva dos equipamentos está compreendida no prazo de garantia contratual, não constituindo contratação autônoma de serviço continuado.",
    ],
  },
  d06: {
    title: "Justificativa de Qualificação Técnica",
    paragraphs: [
      "A exigência de atestado de capacidade técnica limitada a 30% do quantitativo licitado é proporcional ao vulto da contratação e não restringe indevidamente a competitividade do certame.",
      "Adota-se, ainda, a exigência de registro do produto na ANVISA, requisito de natureza sanitária cuja dispensa acarretaria risco direto à segurança dos pacientes atendidos pela rede estadual.",
    ],
  },
  d07: {
    title: "Justificativa de Consórcio",
    paragraphs: [
      "Não se admite a participação de empresas em consórcio, uma vez que o objeto é de baixa complexidade técnica e o mercado apresenta número suficiente de fornecedores aptos a atender individualmente aos quantitativos licitados.",
      "A vedação encontra amparo no art. 15 da Lei nº 14.133/2021, que confere à Administração margem de discricionariedade motivada quanto à admissão de consórcios.",
    ],
  },
  d08: {
    title: "Justificativa de Qualificação Econômico-Financeira",
    paragraphs: [
      "Exige-se capital social ou patrimônio líquido mínimo equivalente a 5% do valor estimado da contratação, percentual inferior ao teto legal de 10% previsto no art. 69, §4º, da Lei nº 14.133/2021.",
      "A exigência mostra-se necessária diante do prazo de garantia de 24 meses, que demanda da contratada capacidade financeira para sustentar o atendimento técnico durante toda a vigência.",
    ],
  },
  d11: {
    title: "Justificativa de Amostras",
    paragraphs: [
      "Não haverá exigência de apresentação de amostras, tendo em vista que as especificações técnicas foram descritas em termos objetivos e mensuráveis, verificáveis por meio de catálogo técnico do fabricante.",
      "A dispensa evita a oneração desnecessária das licitantes e a dilação do prazo de conclusão do certame, sem prejuízo da verificação de conformidade no recebimento definitivo.",
    ],
  },
  d12: {
    title: "Justificativa de Agrupamento",
    paragraphs: [
      "Os itens foram licitados individualmente, sem formação de lotes, de modo a ampliar a competitividade e permitir a participação de fornecedores especializados em linhas específicas de equipamentos.",
      "Não se identificou ganho de escala ou economia processual que justificasse o agrupamento, tampouco interdependência técnica entre os itens que impusesse fornecimento por um único contratado.",
    ],
  },
};

/** Parágrafos genéricos usados para diferenciar as folhas das justificativas. */
const JUSTIFICATIVA_EXTRA = [
  "A motivação ora exposta observa o dever de fundamentação do art. 5º da Lei nº 14.133/2021 e integra o conjunto instrutório do processo, ficando disponível para consulta pelos interessados.",
  "Não se identificou, no levantamento de mercado, restrição que decorra da opção adotada, tampouco fornecedor exclusivo capaz de se beneficiar da presente definição.",
  "A área técnica declara que a escolha aqui registrada não altera o objeto licitado nem os quantitativos estimados no Estudo Técnico Preliminar.",
  "Eventual alteração do entendimento aqui firmado dependerá de nova manifestação técnica, com registro nos autos e comunicação prévia à autoridade competente.",
  "Registre-se que o presente ato foi submetido à conferência da assessoria de licitações, que não apontou óbice à sua juntada ao caderno processual.",
  "Os elementos de convicção utilizados nesta manifestação encontram-se arquivados na Coordenadoria de Assistência Hospitalar, à disposição dos órgãos de controle.",
];

/** Hash determinístico — mantém o conteúdo estável entre renderizações. */
function hash(n) {
  let h = (n * 2654435761) % 4294967296;
  h ^= h >>> 15;
  return Math.abs(h);
}

/** Escolha ciclada pela página — garante que folhas vizinhas nunca coincidam. */
function pick(pool, seed, offset = 0) {
  return pool[(seed + offset) % pool.length];
}

/** Tabela de itens/preços variando por folha. */
function itemTable(page, withPrice) {
  const first = hash(page) % (ITENS.length - 3);
  const rows = Array.from({ length: 4 }, (_, i) => {
    const idx = (first + i) % ITENS.length;
    const qty = 4 + ((hash(page + i) % 12) * 2);
    const unit = 8500 + (hash(page * 7 + i) % 42000);
    const base = [String(idx + 1).padStart(3, "0"), ITENS[idx], String(qty)];
    return withPrice
      ? [...base, unit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })]
      : base;
  });
  return {
    kind: "table",
    columns: withPrice ? ["ITEM", "DESCRIÇÃO", "QTD.", "VALOR UNIT."] : ["ITEM", "DESCRIÇÃO", "QTD."],
    rows,
  };
}

/** Tabela de cotações por fornecedor. */
function quoteTable(page) {
  const item = ITENS[hash(page) % ITENS.length];
  return {
    kind: "table",
    columns: ["FORNECEDOR", "ITEM", "VALOR"],
    rows: FORNECEDORES.map((f, i) => [
      f,
      item,
      (9200 + (hash(page * 3 + i) % 38000)).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    ]),
  };
}

/** Folhas de um trecho fora do escopo: material de instrução entre dois documentos. */
function outOfScopeBlocks(page) {
  const variants = [
    [
      { kind: "paragraph", text: "Folha digitalizada sem cabeçalho identificável. Conteúdo ilegível na margem superior." },
      { kind: "paragraph", text: "Carimbo parcial: “RECEBIDO EM ___/___/2026 — PROTOCOLO GERAL”." },
    ],
    [
      { kind: "paragraph", text: "Cópia de comprovante de publicação em Diário Oficial, sem indicação do documento a que se refere." },
      { kind: "list", items: ["Edição nº 2.418", "Caderno único — página 37", "Data de circulação ilegível"] },
    ],
    [
      { kind: "paragraph", text: "Reprodução de e-mail impresso, sem assinatura e sem número de referência do processo." },
      { kind: "paragraph", text: "Assunto: “Re: Encaminhamento de documentação complementar — sem anexos”." },
    ],
    [
      { kind: "paragraph", text: "Folha em branco no original digitalizado. Mantida na numeração sequencial do caderno." },
    ],
  ];
  return [
    { kind: "alert", title: "Trecho fora do escopo", text: "Folha de instrução do processo, entre dois documentos. A análise não usa este conteúdo." },
    { kind: "paragraph", text: `Lote de digitalização 2026/${page} · lida em ${1 + (hash(page) % 3)} passagem(ns) do scanner.` },
    ...variants[page % variants.length],
  ];
}

/** Conteúdo da folha `page` do documento compilado. */
export function getDocumentPage(page) {
  const doc = SUMARIO_DOCUMENTS.find(
    (d) => d.startPage !== null && d.endPage !== null && page >= d.startPage && page <= d.endPage,
  );

  if (!doc || doc.state === "foraEscopo") {
    return {
      page,
      documentName: null,
      title: null,
      section: "Trecho fora do escopo",
      blocks: outOfScopeBlocks(page),
    };
  }

  const offset = page - (doc.startPage);
  const isFirst = offset === 0;
  const isLast = page === doc.endPage;

  const justificativa = JUSTIFICATIVA[doc.id];
  if (justificativa) {
    // Documentos de 2 a 4 folhas: rotaciona os parágrafos próprios e acrescenta um
    // genérico, de modo que folhas vizinhas não fiquem idênticas.
    const own = justificativa.paragraphs.map(
      (_, i) => justificativa.paragraphs[(i + offset) % justificativa.paragraphs.length],
    );
    return {
      page,
      documentName: doc.name,
      title: isFirst ? justificativa.title : null,
      section: `Fundamentação — item ${offset + 1}`,
      blocks: [
        ...own.map((text, i) => ({
          kind: "paragraph",
          text: `Art. ${offset + i + 1}º ${text}`,
        })),
        { kind: "paragraph", text: pick(JUSTIFICATIVA_EXTRA, page) },
        ...(isLast
          ? [
              {
                kind: "signature",
                name: "Ricardo Antunes de Melo",
                role: "Coordenador de Assistência Hospitalar — SESA",
              },
            ]
          : []),
      ],
    };
  }

  const spec = SPECS[doc.id];
  const sectionIndex = offset % spec.sections.length;
  const round = Math.floor(offset / spec.sections.length);
  const prefix = spec.layout === "clausula" ? "CLÁUSULA" : "SEÇÃO";
  const section = `${prefix} ${sectionIndex + 1}${round > 0 ? `.${round}` : ""} — ${spec.sections[sectionIndex]}`;

  const blocks = [
    { kind: "paragraph", text: pick(spec.paragraphs, page) },
    { kind: "paragraph", text: pick(spec.paragraphs, page, 1) },
  ];

  if (spec.layout === "tabela" && offset % 2 === 0) {
    blocks.push({ kind: "heading", text: `Quadro ${offset + 1} — itens do lote` });
    blocks.push(doc.id === "d04" ? quoteTable(page) : itemTable(page, doc.id !== "d02"));
  }

  if (spec.layout === "clausula") {
    blocks.push({
      kind: "list",
      items: [
        `${sectionIndex + 1}.1. ${pick(spec.paragraphs, page, 2)}`,
        `${sectionIndex + 1}.2. ${pick(spec.paragraphs, page, 3)}`,
      ],
    });
  }

  if (NUP_TYPO_PAGES.includes(page)) {
    blocks.push({
      kind: "alert",
      title: "Atenção — Inconsistência",
      text: "Esta folha registra o NUP como “242001.028501/2025-75”. O número correto da autuação é “24001.028501/2025-75”.",
    });
  }

  if (isLast && spec.signature) {
    blocks.push({ kind: "signature", ...spec.signature });
  }

  return {
    page,
    documentName: doc.name,
    title: isFirst ? spec.title : null,
    section,
    blocks,
  };
}
