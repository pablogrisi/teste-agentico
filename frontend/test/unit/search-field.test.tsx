import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchField } from "@/components/analises/SearchField";

const replace = vi.fn();
let searchParamsString = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));

beforeEach(() => {
  replace.mockClear();
  searchParamsString = "";
});

describe("SearchField", () => {
  it("reflete o termo em `q` na URL após o debounce, zerando a página", async () => {
    const user = userEvent.setup();
    searchParamsString = "pagina=3";

    render(<SearchField valorInicial="" />);
    await user.type(screen.getByRole("searchbox"), "hospital");

    await waitFor(() => expect(replace).toHaveBeenCalled(), { timeout: 1500 });

    const destino = replace.mock.calls.at(-1)?.[0] as string;
    const sp = new URLSearchParams(destino.split("?")[1] ?? "");
    expect(sp.get("q")).toBe("hospital");
    expect(sp.has("pagina")).toBe(false);
  });

  it("limpar o campo remove `q` da URL", async () => {
    const user = userEvent.setup();
    searchParamsString = "q=hospital";

    render(<SearchField valorInicial="hospital" />);
    await user.clear(screen.getByRole("searchbox"));

    await waitFor(() => expect(replace).toHaveBeenCalled(), { timeout: 1500 });
    expect(replace.mock.calls.at(-1)?.[0]).toBe("/");
  });

  it("não navega no primeiro render (sem digitação)", async () => {
    render(<SearchField valorInicial="algo" />);
    await new Promise((r) => setTimeout(r, 600));
    expect(replace).not.toHaveBeenCalled();
  });
});
