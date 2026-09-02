import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnaliseVisor } from "@/components/analise/AnaliseVisor";
import { FixturesAnalisesGateway } from "@/lib/data";

afterEach(() => {
  vi.restoreAllMocks();
});

function comUrlPdf(url: string | null) {
  vi.spyOn(FixturesAnalisesGateway.prototype, "urlPdf").mockReturnValue(url);
}

describe("AnaliseVisor", () => {
  it("sem urlPdf → aviso + total de páginas, sem iframe", () => {
    comUrlPdf(null);
    render(<AnaliseVisor analiseId="1" totalPaginas={24} pagina={1} onPagina={vi.fn()} />);
    expect(screen.getByText(/O visor abre o PDF/)).toBeInTheDocument();
    expect(screen.getByText("24 páginas no documento.")).toBeInTheDocument();
    expect(screen.queryByTitle("PDF do processo")).not.toBeInTheDocument();
  });

  it("com urlPdf → iframe apontando para #page=<pagina>", () => {
    comUrlPdf("https://api.test/analises/1/pdf");
    render(<AnaliseVisor analiseId="1" totalPaginas={24} pagina={7} onPagina={vi.fn()} />);
    const frame = screen.getByTitle("PDF do processo");
    expect(frame).toHaveAttribute("src", "https://api.test/analises/1/pdf#page=7&view=FitH");
  });

  it("‹ desabilitado na página 1; › desabilitado na última", () => {
    comUrlPdf("https://api.test/analises/1/pdf");
    const { rerender } = render(
      <AnaliseVisor analiseId="1" totalPaginas={3} pagina={1} onPagina={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeEnabled();

    rerender(<AnaliseVisor analiseId="1" totalPaginas={3} pagina={3} onPagina={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeDisabled();
  });

  it("digitar no campo e sair chama onPagina com o valor limitado ao total", async () => {
    comUrlPdf("https://api.test/analises/1/pdf");
    const onPagina = vi.fn();
    render(<AnaliseVisor analiseId="1" totalPaginas={10} pagina={1} onPagina={onPagina} />);
    const input = screen.getByLabelText("Número da página");
    await userEvent.clear(input);
    await userEvent.type(input, "99");
    await userEvent.tab();
    expect(onPagina).toHaveBeenCalledWith(10);
  });

  it("› chama onPagina com pagina + 1", async () => {
    comUrlPdf("https://api.test/analises/1/pdf");
    const onPagina = vi.fn();
    render(<AnaliseVisor analiseId="1" totalPaginas={10} pagina={4} onPagina={onPagina} />);
    await userEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(onPagina).toHaveBeenCalledWith(5);
  });
});
