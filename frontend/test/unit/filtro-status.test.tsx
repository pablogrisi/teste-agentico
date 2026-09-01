import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FiltroStatus } from "@/components/analise/FiltroStatus";

describe("FiltroStatus", () => {
  it("mostra os 4 chips na ordem definida", () => {
    render(<FiltroStatus valor="NAO_CONFORME" onChange={vi.fn()} />);
    const chips = screen.getAllByRole("button").map((b) => b.textContent);
    expect(chips).toEqual(["Não conforme", "Conforme", "Não se aplica", "Todos"]);
  });

  it("marca só o chip do valor atual com aria-pressed", () => {
    render(<FiltroStatus valor="CONFORME" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Conforme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Não conforme" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("dispara onChange com o filtro clicado", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FiltroStatus valor="NAO_CONFORME" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Não se aplica" }));
    expect(onChange).toHaveBeenCalledWith("NAO_SE_APLICA");
  });

  it("expõe o grupo com rótulo acessível", () => {
    render(<FiltroStatus valor="TODOS" onChange={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /Filtrar requisitos por status/i }),
    ).toBeInTheDocument();
  });
});
