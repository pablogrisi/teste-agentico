import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NovaAnaliseModal } from "@/components/analises/NovaAnaliseModal";
import { AnaliseValidacaoError, FixturesAnalisesGateway } from "@/lib/data";

function pdf(nome = "processo.pdf", tamanho = 2048): File {
  const file = new File(["%PDF-1.4 conteudo"], nome, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: tamanho });
  return file;
}

function inputArquivo(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NovaAnaliseModal", () => {
  it("mostra os três campos e o Confirmar desabilitado", () => {
    render(<NovaAnaliseModal onFechar={vi.fn()} onCriada={vi.fn()} />);
    expect(screen.getByLabelText(/NUP/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Objeto da contratação/)).toBeInTheDocument();
    expect(screen.getByText(/arraste e solte o arquivo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("habilita o Confirmar quando nup, objeto e um PDF válido estão preenchidos", async () => {
    const user = userEvent.setup();
    render(<NovaAnaliseModal onFechar={vi.fn()} onCriada={vi.fn()} />);

    await user.type(screen.getByLabelText(/NUP/), "74037.000634/2024-22");
    await user.type(screen.getByLabelText(/Objeto da contratação/), "Aquisição de equipamentos");
    await user.upload(inputArquivo(), pdf());

    expect(await screen.findByText("processo.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });

  it("recusa arquivo não-PDF (arrastar e soltar) e mantém o Confirmar desabilitado", async () => {
    const user = userEvent.setup();
    render(<NovaAnaliseModal onFechar={vi.fn()} onCriada={vi.fn()} />);

    await user.type(screen.getByLabelText(/NUP/), "n");
    await user.type(screen.getByLabelText(/Objeto da contratação/), "o");

    const dropzone = screen.getByRole("button", { name: /arraste e solte/i });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [new File(["x"], "nota.txt", { type: "text/plain" })] },
    });

    expect(await screen.findByText(/precisa estar em pdf/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("recusa PDF acima de 25 MB", async () => {
    const user = userEvent.setup();
    render(<NovaAnaliseModal onFechar={vi.fn()} onCriada={vi.fn()} />);
    await user.upload(inputArquivo(), pdf("grande.pdf", 26 * 1024 * 1024));
    expect(await screen.findByText(/limite de 25 mb/i)).toBeInTheDocument();
  });

  it("no sucesso, chama onCriada com o id devolvido pelo gateway", async () => {
    const user = userEvent.setup();
    const onCriada = vi.fn();
    render(<NovaAnaliseModal onFechar={vi.fn()} onCriada={onCriada} />);

    await user.type(screen.getByLabelText(/NUP/), "74037.000634/2024-22");
    await user.type(screen.getByLabelText(/Objeto da contratação/), "Aquisição");
    await user.upload(inputArquivo(), pdf());
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(onCriada).toHaveBeenCalledTimes(1));
    expect(onCriada.mock.calls[0][0]).toMatch(/^nova-/);
  });

  it("no erro do servidor, mostra banner, não navega e preserva os dados digitados", async () => {
    vi.spyOn(FixturesAnalisesGateway.prototype, "criarAnalise").mockRejectedValue(
      new AnaliseValidacaoError(["PDF protegido por senha"]),
    );
    const user = userEvent.setup();
    const onCriada = vi.fn();
    render(<NovaAnaliseModal onFechar={vi.fn()} onCriada={onCriada} />);

    await user.type(screen.getByLabelText(/NUP/), "74037.000634/2024-22");
    await user.type(screen.getByLabelText(/Objeto da contratação/), "Aquisição");
    await user.upload(inputArquivo(), pdf());
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/recusou os dados/i);
    expect(screen.getByText("PDF protegido por senha")).toBeInTheDocument();
    expect(onCriada).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/NUP/)).toHaveValue("74037.000634/2024-22");
    expect(screen.getByText("processo.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });

  it("Escape fecha o modal", async () => {
    const user = userEvent.setup();
    const onFechar = vi.fn();
    render(<NovaAnaliseModal onFechar={onFechar} onCriada={vi.fn()} />);
    await user.keyboard("{Escape}");
    expect(onFechar).toHaveBeenCalled();
  });
});
