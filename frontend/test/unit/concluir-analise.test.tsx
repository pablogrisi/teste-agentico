import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConcluirAnalise } from "@/components/analise/ConcluirAnalise";
import {
  AnaliseConflitoError,
  AnaliseNaoEncontradaError,
  AnaliseRequisitosPendentesError,
  FixturesAnalisesGateway,
} from "@/lib/data";
import type { AnaliseDetalhe } from "@/lib/data";

function detalheConcluida(): AnaliseDetalhe {
  return {
    id: "1",
    nup: "n",
    objeto: "o",
    status: "CONCLUIDA",
    motivoErro: null,
    analistaId: "u",
    analistaNome: "Analista",
    iniciadaEm: "2024-01-01T00:00:00.000Z",
    concluidaEm: "2024-01-03T10:00:00.000Z",
    totalPaginasPdf: 24,
    resumo: {
      total: 1,
      conforme: 1,
      naoConforme: 0,
      naoSeAplica: 0,
      verificados: 1,
      obrigatoriosPendentes: 0,
    },
    avaliacoesPorArea: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ConcluirAnalise", () => {
  it("com obrigatórios pendentes → botão desabilitado e o motivo à vista", () => {
    render(<ConcluirAnalise analiseId="1" obrigatoriosPendentes={3} onConcluida={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Concluir análise" })).toBeDisabled();
    expect(
      screen.getByText(/Faltam 3 requisitos obrigatórios não verificados/),
    ).toBeInTheDocument();
  });

  it("singular no motivo quando falta 1", () => {
    render(<ConcluirAnalise analiseId="1" obrigatoriosPendentes={1} onConcluida={vi.fn()} />);
    expect(screen.getByText("Faltam 1 requisito obrigatório não verificado.")).toBeInTheDocument();
  });

  it("sem pendentes → botão habilitado e sem motivo", () => {
    render(<ConcluirAnalise analiseId="1" obrigatoriosPendentes={0} onConcluida={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Concluir análise" })).toBeEnabled();
    expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();
  });

  it("clicar abre o modal de confirmação", async () => {
    const user = userEvent.setup();
    render(<ConcluirAnalise analiseId="1" obrigatoriosPendentes={0} onConcluida={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Concluir análise" }));
    expect(screen.getByRole("dialog", { name: "Concluir análise?" })).toBeInTheDocument();
  });

  it("Concluir → chama o gateway e, no sucesso, onConcluida com o detalhe", async () => {
    const user = userEvent.setup();
    const detalhe = detalheConcluida();
    const spy = vi
      .spyOn(FixturesAnalisesGateway.prototype, "concluirAnalise")
      .mockResolvedValue(detalhe);
    const onConcluida = vi.fn();
    render(<ConcluirAnalise analiseId="1" obrigatoriosPendentes={0} onConcluida={onConcluida} />);

    await user.click(screen.getByRole("button", { name: "Concluir análise" }));
    await user.click(screen.getByRole("button", { name: "Concluir" }));

    await waitFor(() => expect(onConcluida).toHaveBeenCalledWith(detalhe));
    expect(spy).toHaveBeenCalledWith("1");
  });

  it("422 → lista os requisitosPendentes (código — título) e mantém o modal aberto", async () => {
    const user = userEvent.setup();
    vi.spyOn(FixturesAnalisesGateway.prototype, "concluirAnalise").mockRejectedValue(
      new AnaliseRequisitosPendentesError([
        {
          requisitoId: "req-3",
          codigo: "CHK-010",
          titulo: "Pesquisa de preços",
          area: "CHECKLIST_ORCAMENTO",
        },
        {
          requisitoId: "req-5",
          codigo: "TEC-004",
          titulo: "Quantitativos justificados",
          area: "TECNICA",
        },
      ]),
    );
    const onConcluida = vi.fn();
    render(<ConcluirAnalise analiseId="1" obrigatoriosPendentes={0} onConcluida={onConcluida} />);

    await user.click(screen.getByRole("button", { name: "Concluir análise" }));
    await user.click(screen.getByRole("button", { name: "Concluir" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/faltam requisitos obrigatórios/i);
    expect(alerta).toHaveTextContent("CHK-010");
    expect(alerta).toHaveTextContent("Pesquisa de preços");
    expect(alerta).toHaveTextContent("TEC-004");
    expect(onConcluida).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("409 → mensagem de análise fora de revisão", async () => {
    const user = userEvent.setup();
    vi.spyOn(FixturesAnalisesGateway.prototype, "concluirAnalise").mockRejectedValue(
      new AnaliseConflitoError(),
    );
    render(<ConcluirAnalise analiseId="1" obrigatoriosPendentes={0} onConcluida={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Concluir análise" }));
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/não está mais em revisão/i);
  });

  it("404 → mensagem de análise não encontrada", async () => {
    const user = userEvent.setup();
    vi.spyOn(FixturesAnalisesGateway.prototype, "concluirAnalise").mockRejectedValue(
      new AnaliseNaoEncontradaError("1"),
    );
    render(<ConcluirAnalise analiseId="1" obrigatoriosPendentes={0} onConcluida={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Concluir análise" }));
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/não encontrada/i);
  });

  it("Cancelar fecha o modal sem chamar o gateway", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(FixturesAnalisesGateway.prototype, "concluirAnalise");
    render(<ConcluirAnalise analiseId="1" obrigatoriosPendentes={0} onConcluida={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Concluir análise" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});
