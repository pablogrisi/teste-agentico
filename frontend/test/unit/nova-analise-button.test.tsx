import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NovaAnaliseButton } from "@/components/analises/NovaAnaliseButton";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

afterEach(() => {
  push.mockClear();
});

function pdf(): File {
  const f = new File(["%PDF-1.4"], "processo.pdf", { type: "application/pdf" });
  Object.defineProperty(f, "size", { value: 2048 });
  return f;
}

describe("NovaAnaliseButton", () => {
  it("está habilitado e abre o modal ao clicar", async () => {
    const user = userEvent.setup();
    render(<NovaAnaliseButton />);

    const botao = screen.getByRole("button", { name: /nova análise/i });
    expect(botao).toBeEnabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(botao);
    expect(screen.getByRole("dialog", { name: "Nova análise" })).toBeInTheDocument();
  });

  it("após criar, fecha o modal e navega para /analise/[id]", async () => {
    const user = userEvent.setup();
    render(<NovaAnaliseButton />);

    await user.click(screen.getByRole("button", { name: /nova análise/i }));
    await user.type(screen.getByLabelText(/NUP/), "74037.000634/2024-22");
    await user.type(screen.getByLabelText(/Objeto da contratação/), "Aquisição");
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, pdf());
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push.mock.calls[0][0]).toMatch(/^\/analise\/nova-/);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
