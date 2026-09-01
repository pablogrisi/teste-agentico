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

  describe("status sugerido pela IA (RF-007)", () => {
    it("parecer = sugestão: marca 'IA' no recolhido, sem chip de divergência", () => {
      render(
        <RequisitoItem item={item({ statusSugeridoIa: "CONFORME", statusFinal: "CONFORME" })} />,
      );
      expect(screen.getByText("IA")).toBeInTheDocument();
      expect(screen.queryByText(/^IA:/)).not.toBeInTheDocument();
    });

    it("parecer ≠ sugestão: chip 'IA: <sugestão>' + badge principal segue o parecer atual", () => {
      render(
        <RequisitoItem
          item={item({ statusSugeridoIa: "CONFORME", statusFinal: "NAO_CONFORME" })}
        />,
      );
      expect(screen.getByText("IA: Conforme")).toBeInTheDocument();
      // o badge grande continua sendo o statusFinal (TSD-014 §9)
      expect(screen.getByText("Não conforme")).toBeInTheDocument();
    });

    it("expandido, parecer = sugestão: mostra só 'Sugestão da IA'", async () => {
      const user = userEvent.setup();
      render(
        <RequisitoItem item={item({ statusSugeridoIa: "CONFORME", statusFinal: "CONFORME" })} />,
      );
      await user.click(screen.getByRole("button", { expanded: false }));
      expect(screen.getByText("Sugestão da IA:")).toBeInTheDocument();
      expect(screen.queryByText("Parecer atual:")).not.toBeInTheDocument();
    });

    it("expandido, parecer ≠ sugestão: mostra 'Sugestão da IA' e 'Parecer atual'", async () => {
      const user = userEvent.setup();
      render(
        <RequisitoItem
          item={item({ statusSugeridoIa: "CONFORME", statusFinal: "NAO_CONFORME" })}
        />,
      );
      await user.click(screen.getByRole("button", { expanded: false }));
      expect(screen.getByText("Sugestão da IA:")).toBeInTheDocument();
      expect(screen.getByText("Parecer atual:")).toBeInTheDocument();
      expect(screen.getByText("alterado na revisão")).toBeInTheDocument();
    });
  });
});
