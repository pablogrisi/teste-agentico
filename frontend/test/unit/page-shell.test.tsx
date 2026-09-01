import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageShell } from "@/components/layout/PageShell";

describe("PageShell", () => {
  it("renderiza a Topbar institucional e o conteúdo filho", () => {
    render(
      <PageShell>
        <p>conteúdo de teste</p>
      </PageShell>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Governo do Estado do Ceará" })).toBeInTheDocument();
    expect(screen.getByText("conteúdo de teste")).toBeInTheDocument();
  });

  it("aplica o modo `fill` sem quebrar a renderização do conteúdo", () => {
    render(
      <PageShell fill>
        <p>painel</p>
      </PageShell>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("painel")).toBeInTheDocument();
  });
});
