import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PainelRevisao } from "@/components/analise/PainelRevisao";
import { calcularResumo } from "@/lib/data";
import type { AnaliseDetalhe, AreaComItens, AvaliacaoItem } from "@/lib/data";

const replace = vi.fn();
let searchParamsString = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/analise/1",
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));

beforeEach(() => {
  replace.mockClear();
  searchParamsString = "";
});

function item(id: string, over: Partial<AvaliacaoItem> = {}): AvaliacaoItem {
  return {
    id,
    requisitoId: `r-${id}`,
    codigo: `C-${id}`,
    area: over.area ?? "CHECKLIST_A",
    titulo: `Requisito ${id}`,
    descricao: "…",
    obrigatorio: false,
    ordem: 1,
    norma: { lei: null, artigo: null, inciso: null, paragrafo: null, alinea: null },
    statusSugeridoIa: "CONFORME",
    statusFinal: "CONFORME",
    verificado: false,
    comentario: null,
    paginaReferencia: null,
    ...over,
  };
}

function detalhe(
  status: AnaliseDetalhe["status"],
  avaliacoesPorArea: AreaComItens[],
): AnaliseDetalhe {
  return {
    id: "1",
    nup: "n",
    objeto: "o",
    status,
    motivoErro: status === "ERRO_PROCESSAMENTO" ? "IA fora do ar." : null,
    analistaId: "u",
    analistaNome: "Analista",
    iniciadaEm: "2024-01-01T00:00:00.000Z",
    concluidaEm: null,
    totalPaginasPdf: 10,
    resumo: calcularResumo(avaliacoesPorArea),
    avaliacoesPorArea,
  };
}

const GRUPOS: AreaComItens[] = [
  {
    area: "CHECKLIST_DADOS_GERAIS",
    itens: [
      item("c1", { statusFinal: "NAO_CONFORME", verificado: false }),
      item("c2", { verificado: true }),
    ],
  },
  {
    area: "TECNICA_ESPEC",
    itens: [item("t1", { area: "TECNICA_ESPEC", statusFinal: "NAO_CONFORME" })],
  },
];

describe("PainelRevisao", () => {
  it("renderiza as abas com a contagem de itens e começa em Checklist", () => {
    render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", GRUPOS)} />);
    const checklist = screen.getByRole("tab", { name: /Checklist/ });
    const tecnica = screen.getByRole("tab", { name: /Técnica/ });
    expect(within(checklist).getByText("2")).toBeInTheDocument();
    expect(within(tecnica).getByText("1")).toBeInTheDocument();
    expect(checklist).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Requisito c1")).toBeInTheDocument();
    expect(screen.queryByText("Requisito t1")).not.toBeInTheDocument();
  });

  it("alterna livremente para a aba Técnica ao clicar", async () => {
    const user = userEvent.setup();
    render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", GRUPOS)} />);
    await user.click(screen.getByRole("tab", { name: /Técnica/ }));
    expect(screen.getByRole("tab", { name: /Técnica/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Requisito t1")).toBeInTheDocument();
    expect(screen.queryByText("Requisito c1")).not.toBeInTheDocument();
  });

  it("mostra o progresso a partir do resumo", () => {
    render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", GRUPOS)} />);
    expect(screen.getByText("1/3 verificados")).toBeInTheDocument();
  });

  it("aba Técnica mostra badge de status (fiel ao backend)", async () => {
    const user = userEvent.setup();
    render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", GRUPOS)} />);
    await user.click(screen.getByRole("tab", { name: /Técnica/ }));
    // o badge do requisito (span), não o chip de filtro (button) de mesmo texto
    expect(screen.getByText("Não conforme", { selector: "span" })).toBeInTheDocument();
  });

  it("mostra a legenda de que os status são sugestões da IA quando há itens (RF-007)", () => {
    render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", GRUPOS)} />);
    expect(screen.getByText(/sugestões da IA/)).toBeInTheDocument();
  });

  it("PROCESSANDO → mensagem de processamento, sem lista, sem progresso, sem legenda", () => {
    render(<PainelRevisao detalhe={detalhe("PROCESSANDO", [])} />);
    expect(screen.getByText(/Processando a análise/)).toBeInTheDocument();
    expect(screen.queryByText(/verificados/)).not.toBeInTheDocument();
    expect(screen.queryByText(/sugestões da IA/)).not.toBeInTheDocument();
  });

  it("ERRO_PROCESSAMENTO → mostra o motivo do erro, sem legenda de sugestões da IA", () => {
    render(<PainelRevisao detalhe={detalhe("ERRO_PROCESSAMENTO", [])} />);
    expect(screen.getByRole("alert")).toHaveTextContent("IA fora do ar.");
    expect(screen.queryByText(/sugestões da IA/)).not.toBeInTheDocument();
  });

  describe("filtro por status (RF-009)", () => {
    const COM_CONFORMES: AreaComItens[] = [
      {
        area: "CHECKLIST_DADOS_GERAIS",
        itens: [
          item("c1", { statusFinal: "NAO_CONFORME" }),
          item("c2", { statusFinal: "CONFORME" }),
        ],
      },
      {
        area: "CHECKLIST_ORCAMENTO",
        itens: [item("c3", { area: "CHECKLIST_ORCAMENTO", statusFinal: "CONFORME" })],
      },
    ];

    it("abre com o chip 'Não conforme' ativo e esconde os itens conformes", () => {
      render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", COM_CONFORMES)} />);
      expect(screen.getByRole("button", { name: "Não conforme" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByText("Requisito c1")).toBeInTheDocument();
      expect(screen.queryByText("Requisito c2")).not.toBeInTheDocument();
    });

    it("grupo sem itens no filtro atual continua visível com uma linha de placeholder", () => {
      render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", COM_CONFORMES)} />);
      // "Orcamento" só tem conforme → o grupo aparece, mas sem itens
      expect(screen.getByText("Orcamento")).toBeInTheDocument();
      expect(
        screen.getByText("Nenhum requisito neste grupo com o filtro atual."),
      ).toBeInTheDocument();
    });

    it("clicar em 'Todos' revela todos os requisitos e grava ?requisitos=todos na URL", async () => {
      const user = userEvent.setup();
      render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", COM_CONFORMES)} />);
      await user.click(screen.getByRole("button", { name: "Todos" }));

      expect(screen.getByText("Requisito c1")).toBeInTheDocument();
      expect(screen.getByText("Requisito c2")).toBeInTheDocument();
      expect(screen.getByText("Requisito c3")).toBeInTheDocument();
      expect(replace).toHaveBeenCalledWith("/analise/1?requisitos=todos", { scroll: false });
    });

    it("lê o filtro inicial de ?requisitos= na URL", () => {
      searchParamsString = "requisitos=conforme";
      render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", COM_CONFORMES)} />);
      expect(screen.getByRole("button", { name: "Conforme" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByText("Requisito c2")).toBeInTheDocument();
      expect(screen.queryByText("Requisito c1")).not.toBeInTheDocument();
    });

    it("mantém o filtro ao trocar de aba", async () => {
      const user = userEvent.setup();
      render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", GRUPOS)} />);
      await user.click(screen.getByRole("button", { name: "Conforme" }));
      await user.click(screen.getByRole("tab", { name: /Técnica/ }));
      expect(screen.getByRole("button", { name: "Conforme" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      // t1 é NAO_CONFORME → nada passa no filtro "Conforme" na aba Técnica
      expect(screen.getByText("Nenhum requisito neste filtro.")).toBeInTheDocument();
    });

    it("aba sem não conformes no filtro padrão → mensagem + 'Ver todos os requisitos'", async () => {
      const user = userEvent.setup();
      const soConformes: AreaComItens[] = [
        {
          area: "CHECKLIST_DADOS_GERAIS",
          itens: [
            item("k1", { statusFinal: "CONFORME" }),
            item("k2", { statusFinal: "NAO_SE_APLICA" }),
          ],
        },
      ];
      render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", soConformes)} />);

      expect(screen.getByText("Nenhum requisito não conforme nesta aba.")).toBeInTheDocument();
      expect(screen.queryByText("Requisito k1")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Ver todos os requisitos" }));
      expect(screen.getByText("Requisito k1")).toBeInTheDocument();
      expect(replace).toHaveBeenCalledWith("/analise/1?requisitos=todos", { scroll: false });
    });

    it("voltar ao filtro padrão remove o ?requisitos= da URL", async () => {
      const user = userEvent.setup();
      searchParamsString = "requisitos=conforme";
      render(<PainelRevisao detalhe={detalhe("PRONTA_PARA_REVISAO", COM_CONFORMES)} />);
      await user.click(screen.getByRole("button", { name: "Não conforme" }));
      expect(replace).toHaveBeenCalledWith("/analise/1", { scroll: false });
    });
  });
});
