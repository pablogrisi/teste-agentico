import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BaixarRelatorio } from "@/components/analise/BaixarRelatorio";
import { FixturesAnalisesGateway } from "@/lib/data";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BaixarRelatorio", () => {
  it("com urlRelatorio → link 'Baixar relatório' que abre o relatório em nova aba", () => {
    vi.spyOn(FixturesAnalisesGateway.prototype, "urlRelatorio").mockReturnValue(
      "https://api.test/analises/a1/relatorio",
    );
    render(<BaixarRelatorio analiseId="a1" />);

    const link = screen.getByRole("link", { name: "Baixar relatório" });
    expect(link).toHaveAttribute("href", "https://api.test/analises/a1/relatorio");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("sem urlRelatorio (fixtures) → texto desabilitado + aviso, sem link", () => {
    render(<BaixarRelatorio analiseId="a1" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Baixar relatório")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("note")).toHaveTextContent(/conectada ao backend/i);
  });
});
