import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { createElement } from "react";

afterEach(() => {
  cleanup();
});

// `next/font` só roda dentro do build do Next; stub inócuo para os testes de componente.
vi.mock("next/font/google", () => ({
  Kanit: () => ({
    className: "kanit",
    variable: "--font-kanit",
    style: { fontFamily: "Kanit" },
  }),
}));

// `next/link` precisa do contexto de router do App Router, ausente no RTL puro.
// Stub para um <a> simples — os testes verificam o `href` resultante.
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname?: string };
    children: React.ReactNode;
  }) =>
    createElement(
      "a",
      { href: typeof href === "string" ? href : (href?.pathname ?? "#"), ...rest },
      children,
    ),
}));
