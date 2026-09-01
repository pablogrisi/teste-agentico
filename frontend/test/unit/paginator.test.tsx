import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Paginator } from "@/components/analises/Paginator";
import type { ListarAnalisesQuery } from "@/lib/data";

const QUERY: ListarAnalisesQuery = {
  q: "",
  status: [],
  ordenarPor: "iniciadaEm",
  ordem: "desc",
  pagina: 1,
  tamanho: 20,
};

describe("Paginator", () => {
  it("informa o intervalo mostrado e o total", () => {
    render(
      <Paginator
        pagina={{ itens: [], total: 45, pagina: 2, tamanho: 20 }}
        query={{ ...QUERY, pagina: 2 }}
      />,
    );
    expect(screen.getByText("Mostrando 21–40 de 45")).toBeInTheDocument();
  });

  it("na página do meio, 'anterior' e 'próxima' são links", () => {
    render(
      <Paginator
        pagina={{ itens: [], total: 45, pagina: 2, tamanho: 20 }}
        query={{ ...QUERY, pagina: 2 }}
      />,
    );
    const anterior = screen.getByRole("link", { name: "Página anterior" });
    expect(anterior.getAttribute("href")).toBe("/"); // página 1 → querystring vazia
    expect(screen.getByRole("link", { name: "Próxima página" }).getAttribute("href")).toContain(
      "pagina=3",
    );
    expect(screen.getByRole("link", { name: "Página 2" })).toHaveAttribute("aria-current", "page");
  });

  it("na primeira página, 'primeira' e 'anterior' não são links", () => {
    render(<Paginator pagina={{ itens: [], total: 45, pagina: 1, tamanho: 20 }} query={QUERY} />);
    expect(screen.queryByRole("link", { name: "Primeira página" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Página anterior" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Próxima página" })).toBeInTheDocument();
  });

  it("com uma única página, não há navegação para frente", () => {
    render(<Paginator pagina={{ itens: [], total: 3, pagina: 1, tamanho: 20 }} query={QUERY} />);
    expect(screen.getByText("Mostrando 1–3 de 3")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Próxima página" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Última página" })).not.toBeInTheDocument();
  });
});
