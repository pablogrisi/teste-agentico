import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalisesListaVazia } from "@/components/analises/AnalisesListaVazia";

describe("AnalisesListaVazia", () => {
  it("variante 'sem-analises' orienta a criar a primeira análise, sem link de limpar filtros", () => {
    render(<AnalisesListaVazia variante="sem-analises" />);
    expect(screen.getByText("Você ainda não tem análises.")).toBeInTheDocument();
    expect(screen.getByText(/Crie uma nova análise/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("variante 'sem-resultado' oferece limpar busca e filtros", () => {
    render(<AnalisesListaVazia variante="sem-resultado" />);
    expect(screen.getByText("Nenhuma análise corresponde aos filtros.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /limpar busca e filtros/i });
    expect(link).toHaveAttribute("href", "/");
  });
});
