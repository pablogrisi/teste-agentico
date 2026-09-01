import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PainelRevisao } from "@/components/analise/PainelRevisao";
import { calcularResumo } from "@/lib/data";
import type { AnaliseDetalhe, AreaComItens, AvaliacaoItem } from "@/lib/data";

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
    expect(screen.getByText("Não conforme")).toBeInTheDocument();
  });

  it("PROCESSANDO → mensagem de processamento, sem lista nem progresso", () => {
    render(<PainelRevisao detalhe={detalhe("PROCESSANDO", [])} />);
    expect(screen.getByText(/Processando a análise/)).toBeInTheDocument();
    expect(screen.queryByText(/verificados/)).not.toBeInTheDocument();
  });

  it("ERRO_PROCESSAMENTO → mostra o motivo do erro", () => {
    render(<PainelRevisao detalhe={detalhe("ERRO_PROCESSAMENTO", [])} />);
    expect(screen.getByRole("alert")).toHaveTextContent("IA fora do ar.");
  });
});
