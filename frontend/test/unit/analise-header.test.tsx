import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnaliseHeader } from "@/components/analise/AnaliseHeader";
import type { AnaliseDetalhe } from "@/lib/data";

const DETALHE: AnaliseDetalhe = {
  id: "1",
  nup: "74037.000634/2024-22",
  objeto: "EQUIPAMENTOS E MATERIAL PERMANENTE - MATERIAL HOSPITALAR",
  status: "PRONTA_PARA_REVISAO",
  motivoErro: null,
  analistaId: "u1",
  analistaNome: "Usuário Analista",
  iniciadaEm: "2024-03-20T14:30:00.000Z",
  concluidaEm: null,
  totalPaginasPdf: 24,
  resumo: {
    total: 0,
    conforme: 0,
    naoConforme: 0,
    naoSeAplica: 0,
    verificados: 0,
    obrigatoriosPendentes: 0,
  },
  avaliacoesPorArea: [],
};

describe("AnaliseHeader", () => {
  it("mostra NUP, objeto, status e responsável", () => {
    render(<AnaliseHeader detalhe={DETALHE} />);
    expect(screen.getByRole("heading", { name: "74037.000634/2024-22" })).toBeInTheDocument();
    expect(screen.getByText(/MATERIAL HOSPITALAR/)).toBeInTheDocument();
    expect(screen.getByText("Pronta para revisão")).toBeInTheDocument();
    expect(screen.getByText("Usuário Analista")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lista de análises/i })).toHaveAttribute("href", "/");
  });

  it("omite 'Concluída em' quando a análise não foi concluída", () => {
    render(<AnaliseHeader detalhe={DETALHE} />);
    expect(screen.queryByText("Concluída em")).not.toBeInTheDocument();
  });
});
