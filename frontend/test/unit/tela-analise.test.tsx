import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TelaAnalise } from "@/components/analise/TelaAnalise";
import { calcularResumo, FixturesAnalisesGateway } from "@/lib/data";
import type { AnaliseDetalhe, AvaliacaoItem } from "@/lib/data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/analise/1",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

function item(over: Partial<AvaliacaoItem> = {}): AvaliacaoItem {
  return {
    id: "av-1",
    requisitoId: "req-1",
    codigo: "C-1",
    area: "CHECKLIST_A",
    titulo: "Requisito 1",
    descricao: "…",
    obrigatorio: false,
    ordem: 1,
    norma: { lei: null, artigo: null, inciso: null, paragrafo: null, alinea: null },
    statusSugeridoIa: "NAO_CONFORME",
    statusFinal: "NAO_CONFORME",
    verificado: false,
    comentario: null,
    paginaReferencia: 8,
    ...over,
  };
}

function detalhe(): AnaliseDetalhe {
  const grupos = [{ area: "CHECKLIST_A", itens: [item()] }];
  return {
    id: "1",
    nup: "n",
    objeto: "o",
    status: "PRONTA_PARA_REVISAO",
    motivoErro: null,
    analistaId: "u",
    analistaNome: "Analista",
    iniciadaEm: "2024-01-01T00:00:00.000Z",
    concluidaEm: null,
    totalPaginasPdf: 24,
    resumo: calcularResumo(grupos),
    avaliacoesPorArea: grupos,
  };
}

describe("TelaAnalise", () => {
  it("clicar na referência de página de um requisito move o visor (#page=N)", async () => {
    const user = userEvent.setup();
    vi.spyOn(FixturesAnalisesGateway.prototype, "urlPdf").mockReturnValue(
      "https://api.test/analises/1/pdf",
    );
    render(<TelaAnalise detalhe={detalhe()} />);

    expect(screen.getByTitle("PDF do processo")).toHaveAttribute(
      "src",
      "https://api.test/analises/1/pdf#page=1&view=FitH",
    );

    await user.click(screen.getByRole("button", { name: /Requisito 1/ }));
    await user.click(screen.getByRole("button", { name: "Página 8" }));

    expect(screen.getByTitle("PDF do processo")).toHaveAttribute(
      "src",
      "https://api.test/analises/1/pdf#page=8&view=FitH",
    );
  });

  it("sem backend (urlPdf null) mostra o aviso no lugar do visor", () => {
    render(<TelaAnalise detalhe={detalhe()} />);
    expect(screen.getByText(/O visor abre o PDF/)).toBeInTheDocument();
    expect(screen.queryByTitle("PDF do processo")).not.toBeInTheDocument();
  });

  describe("conclusão (RF-012)", () => {
    function detalhePendente(): AnaliseDetalhe {
      const grupos = [
        { area: "CHECKLIST_A", itens: [item({ obrigatorio: true, verificado: false })] },
      ];
      return {
        id: "1",
        nup: "74037.000634/2024-22",
        objeto: "o",
        status: "PRONTA_PARA_REVISAO",
        motivoErro: null,
        analistaId: "u",
        analistaNome: "Analista",
        iniciadaEm: "2024-01-01T00:00:00.000Z",
        concluidaEm: null,
        totalPaginasPdf: 24,
        resumo: calcularResumo(grupos),
        avaliacoesPorArea: grupos,
      };
    }

    it("verificar o último obrigatório habilita 'Concluir análise'; concluir deixa a tela read-only", async () => {
      const user = userEvent.setup();
      const verificado = item({ obrigatorio: true, verificado: true });
      vi.spyOn(FixturesAnalisesGateway.prototype, "marcarVerificado").mockResolvedValue({
        item: verificado,
        resumo: calcularResumo([{ area: "CHECKLIST_A", itens: [verificado] }]),
      });
      const concluida: AnaliseDetalhe = {
        ...detalhePendente(),
        status: "CONCLUIDA",
        concluidaEm: "2024-01-03T10:00:00.000Z",
        avaliacoesPorArea: [{ area: "CHECKLIST_A", itens: [verificado] }],
      };
      vi.spyOn(FixturesAnalisesGateway.prototype, "concluirAnalise").mockResolvedValue(concluida);

      render(<TelaAnalise detalhe={detalhePendente()} />);

      const botao = screen.getByRole("button", { name: "Concluir análise" });
      expect(botao).toBeDisabled();

      await user.click(screen.getByRole("checkbox", { name: /Marcar como verificado/ }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Concluir análise" })).toBeEnabled(),
      );

      await user.click(screen.getByRole("button", { name: "Concluir análise" }));
      await user.click(screen.getByRole("button", { name: "Concluir" }));

      await waitFor(() => expect(screen.getByText("Concluída")).toBeInTheDocument());
      expect(screen.queryByRole("button", { name: "Concluir análise" })).not.toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /^Verificado —/ })).toBeInTheDocument();
      expect(
        screen.queryByRole("checkbox", { name: /Marcar como verificado/ }),
      ).not.toBeInTheDocument();
      // RF-016: o slot do cabeçalho troca "Concluir análise" → "Baixar relatório"
      expect(screen.getByText("Baixar relatório")).toBeInTheDocument();
    });

    it("análise já CONCLUIDA não mostra o botão 'Concluir análise'", () => {
      render(
        <TelaAnalise
          detalhe={{
            ...detalhePendente(),
            status: "CONCLUIDA",
            concluidaEm: "2024-01-03T10:00:00.000Z",
          }}
        />,
      );
      expect(screen.queryByRole("button", { name: "Concluir análise" })).not.toBeInTheDocument();
    });
  });

  describe("relatório (RF-016)", () => {
    function detalhe(status: AnaliseDetalhe["status"]): AnaliseDetalhe {
      const grupos = [{ area: "CHECKLIST_A", itens: [item({ verificado: true })] }];
      return {
        id: "1",
        nup: "n",
        objeto: "o",
        status,
        motivoErro: null,
        analistaId: "u",
        analistaNome: "Analista",
        iniciadaEm: "2024-01-01T00:00:00.000Z",
        concluidaEm: status === "CONCLUIDA" ? "2024-01-03T10:00:00.000Z" : null,
        totalPaginasPdf: 24,
        resumo: calcularResumo(grupos),
        avaliacoesPorArea: grupos,
      };
    }

    it("análise CONCLUIDA mostra 'Baixar relatório' no cabeçalho, não 'Concluir análise'", () => {
      render(<TelaAnalise detalhe={detalhe("CONCLUIDA")} />);
      expect(screen.getByText("Baixar relatório")).toBeInTheDocument();
      expect(screen.queryByText("Concluir análise")).not.toBeInTheDocument();
    });

    it("análise PRONTA_PARA_REVISAO não mostra 'Baixar relatório'", () => {
      render(<TelaAnalise detalhe={detalhe("PRONTA_PARA_REVISAO")} />);
      expect(screen.queryByText("Baixar relatório")).not.toBeInTheDocument();
    });

    it.each(["PENDENTE", "PROCESSANDO", "ERRO_PROCESSAMENTO"] as const)(
      "análise %s não mostra nem 'Baixar relatório' nem 'Concluir análise'",
      (status) => {
        render(<TelaAnalise detalhe={detalhe(status)} />);
        expect(screen.queryByText("Baixar relatório")).not.toBeInTheDocument();
        expect(screen.queryByText("Concluir análise")).not.toBeInTheDocument();
      },
    );

    it("com backend (urlRelatorio) o 'Baixar relatório' é um link para GET /analises/:id/relatorio", () => {
      vi.spyOn(FixturesAnalisesGateway.prototype, "urlRelatorio").mockReturnValue(
        "https://api.test/analises/1/relatorio",
      );
      render(<TelaAnalise detalhe={detalhe("CONCLUIDA")} />);
      expect(screen.getByRole("link", { name: "Baixar relatório" })).toHaveAttribute(
        "href",
        "https://api.test/analises/1/relatorio",
      );
    });
  });
});
