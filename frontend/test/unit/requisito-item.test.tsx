import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RequisitoItem } from "@/components/analise/RequisitoItem";
import type { AvaliacaoItem } from "@/lib/data";

function item(over: Partial<AvaliacaoItem> = {}): AvaliacaoItem {
  return {
    id: "av-1",
    requisitoId: "req-1",
    codigo: "CHK-001",
    area: "CHECKLIST_DADOS_GERAIS",
    titulo: "O processo contém a solicitação (CI) do setor interessado?",
    descricao: "Deve constar comunicação interna do setor demandante.",
    obrigatorio: true,
    ordem: 1,
    norma: { lei: "Lei 14.133/2021", artigo: "18", inciso: "I", paragrafo: null, alinea: null },
    statusSugeridoIa: "NAO_CONFORME",
    statusFinal: "NAO_CONFORME",
    verificado: false,
    comentario: "CI não localizada.",
    paginaReferencia: 3,
    ...over,
  };
}

describe("RequisitoItem", () => {
  it("recolhido: mostra título e badge de status, detalhe escondido", () => {
    render(<RequisitoItem item={item()} />);
    expect(screen.getByText(/solicitação \(CI\) do setor/)).toBeInTheDocument();
    expect(screen.getByText("Não conforme")).toBeInTheDocument();
    expect(screen.queryByText(/comunicação interna do setor/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
  });

  it("expandido: mostra descrição, norma, comentário e página", async () => {
    const user = userEvent.setup();
    render(<RequisitoItem item={item()} />);
    await user.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText(/comunicação interna do setor/)).toBeInTheDocument();
    expect(screen.getByText("Lei 14.133/2021, art. 18, inciso I")).toBeInTheDocument();
    expect(screen.getByText("CI não localizada.")).toBeInTheDocument();
    expect(screen.getByText("Página 3")).toBeInTheDocument();
  });

  it("sem página → 'não informada'", async () => {
    const user = userEvent.setup();
    render(<RequisitoItem item={item({ paginaReferencia: null, comentario: null })} />);
    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("não informada")).toBeInTheDocument();
  });

  it("o checkbox de verificado está desabilitado (RF-011)", () => {
    render(<RequisitoItem item={item({ verificado: true })} />);
    const cb = screen.getByRole("checkbox");
    expect(cb).toBeDisabled();
    expect(cb).toBeChecked();
  });
});
