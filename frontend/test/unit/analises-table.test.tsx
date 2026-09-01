import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalisesTable } from "@/components/analises/AnalisesTable";
import type { AnaliseResumo, ListarAnalisesQuery } from "@/lib/data";

const QUERY: ListarAnalisesQuery = {
  q: "",
  status: [],
  ordenarPor: "iniciadaEm",
  ordem: "desc",
  pagina: 1,
  tamanho: 20,
};

const ITENS: AnaliseResumo[] = [
  {
    id: "42",
    nup: "74037.000634/2024-22",
    objeto: "EQUIPAMENTOS E MATERIAL PERMANENTE - MATERIAL HOSPITALAR",
    status: "PRONTA_PARA_REVISAO",
    iniciadaEm: "2024-03-20T14:30:00.000Z",
    concluidaEm: null,
  },
  {
    id: "7",
    nup: "27647.000278/2022-02",
    objeto: "MATERIAL LABORATORIAL",
    status: "CONCLUIDA",
    iniciadaEm: "2022-10-06T16:00:00.000Z",
    concluidaEm: "2022-10-07T10:12:00.000Z",
  },
];

describe("AnalisesTable", () => {
  it("renderiza uma linha por análise, com NUP linkando para /analise/:id", () => {
    render(<AnalisesTable itens={ITENS} query={QUERY} />);

    const linhas = screen.getAllByRole("row").slice(1); // pula o cabeçalho
    expect(linhas).toHaveLength(2);

    const link = screen.getByRole("link", { name: "74037.000634/2024-22" });
    expect(link).toHaveAttribute("href", "/analise/42");
    expect(screen.getByRole("link", { name: "27647.000278/2022-02" })).toHaveAttribute(
      "href",
      "/analise/7",
    );
  });

  it("mostra o rótulo de status e o objeto", () => {
    render(<AnalisesTable itens={ITENS} query={QUERY} />);
    expect(screen.getByText("Pronta para revisão")).toBeInTheDocument();
    expect(screen.getByText("Concluída")).toBeInTheDocument();
    expect(
      screen.getByText("EQUIPAMENTOS E MATERIAL PERMANENTE - MATERIAL HOSPITALAR"),
    ).toBeInTheDocument();
  });

  it("cabeçalho NUP alterna a ordem e marca aria-sort", () => {
    render(<AnalisesTable itens={ITENS} query={{ ...QUERY, ordenarPor: "nup", ordem: "asc" }} />);
    const th = screen.getByRole("columnheader", { name: /NUP/ });
    expect(th).toHaveAttribute("aria-sort", "ascending");
    // já ordenado por nup asc → o link deve alternar para desc (que é o default,
    // então some da querystring — o importante é não continuar em asc).
    const link = within(th).getByRole("link");
    expect(link.getAttribute("href")).toContain("ordenarPor=nup");
    expect(link.getAttribute("href")).not.toContain("ordem=asc");
  });

  it("cabeçalho de coluna não ordenada tem aria-sort none e link para asc", () => {
    render(<AnalisesTable itens={ITENS} query={QUERY} />);
    const th = screen.getByRole("columnheader", { name: /Iniciada em/ });
    expect(th).toHaveAttribute("aria-sort", "descending"); // é a coluna default
    const thNup = screen.getByRole("columnheader", { name: /NUP/ });
    expect(thNup).toHaveAttribute("aria-sort", "none");
    expect(within(thNup).getByRole("link").getAttribute("href")).toContain("ordem=asc");
  });
});
