import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RequisitoItem } from "@/components/analise/RequisitoItem";
import { AnaliseConflitoError, AnaliseNaoEncontradaError, AnaliseValidacaoError } from "@/lib/data";
import type { AvaliacaoItem } from "@/lib/data";

function item(over: Partial<AvaliacaoItem> = {}): AvaliacaoItem {
  return {
    id: "av-1",
    requisitoId: "req-1",
    codigo: "CHK-001",
    area: "CHECKLIST_DADOS_GERAIS",
    titulo: "O processo contém a solicitação (CI) do setor interessado?",
    descricao: "Deve constar comunicação interna do setor demandante.",
    obrigatorio: true,
    ordem: 1,
    norma: { lei: "Lei 14.133/2021", artigo: "18", inciso: "I", paragrafo: null, alinea: null },
    statusSugeridoIa: "NAO_CONFORME",
    statusFinal: "NAO_CONFORME",
    verificado: false,
    comentario: "CI não localizada.",
    paginaReferencia: 3,
    ...over,
  };
}

describe("RequisitoItem", () => {
  it("recolhido: mostra título e badge de status, detalhe escondido", () => {
    render(<RequisitoItem item={item()} />);
    expect(screen.getByText(/solicitação \(CI\) do setor/)).toBeInTheDocument();
    expect(screen.getByText("Não conforme")).toBeInTheDocument();
    expect(screen.queryByText(/comunicação interna do setor/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
  });

  it("expandido: mostra descrição, norma, comentário e página", async () => {
    const user = userEvent.setup();
    render(<RequisitoItem item={item()} />);
    await user.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText(/comunicação interna do setor/)).toBeInTheDocument();
    expect(screen.getByText("Lei 14.133/2021, art. 18, inciso I")).toBeInTheDocument();
    expect(screen.getByText("CI não localizada.")).toBeInTheDocument();
    expect(screen.getByText("Página 3")).toBeInTheDocument();
  });

  it("sem página → 'não informada'", async () => {
    const user = userEvent.setup();
    render(<RequisitoItem item={item({ paginaReferencia: null, comentario: null })} />);
    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("não informada")).toBeInTheDocument();
  });

  describe("comentário / justificativa (RF-017)", () => {
    it("item não divergente com comentário → linha 'Comentário:'", async () => {
      const user = userEvent.setup();
      render(
        <RequisitoItem
          item={item({
            statusSugeridoIa: "NAO_CONFORME",
            statusFinal: "NAO_CONFORME",
            comentario: "CI não localizada.",
          })}
        />,
      );
      await user.click(screen.getByRole("button", { expanded: false }));
      expect(screen.getByText("Comentário:")).toBeInTheDocument();
      expect(screen.queryByText("Justificativa da alteração:")).not.toBeInTheDocument();
    });

    it("item divergente com comentário → 'Justificativa da alteração:' uma vez, sem 'Comentário:'", async () => {
      const user = userEvent.setup();
      render(
        <RequisitoItem
          item={item({
            statusSugeridoIa: "NAO_CONFORME",
            statusFinal: "CONFORME",
            comentario: "Documento localizado à fl. 2.",
          })}
        />,
      );
      await user.click(screen.getByRole("button", { expanded: false }));
      expect(screen.queryByText("Comentário:")).not.toBeInTheDocument();
      expect(screen.getByText("Justificativa da alteração:")).toBeInTheDocument();
      expect(screen.getAllByText("Documento localizado à fl. 2.")).toHaveLength(1);
    });
  });

  it("o checkbox de verificado fica desabilitado sem o callback (ex.: análise concluída)", () => {
    render(<RequisitoItem item={item({ verificado: true })} />);
    const cb = screen.getByRole("checkbox");
    expect(cb).toBeDisabled();
    expect(cb).toBeChecked();
  });

  describe("checkbox de 'verificado' (RF-011)", () => {
    it("com onToggleVerificado: fica operável e chama a prop com o valor invertido", async () => {
      const user = userEvent.setup();
      const onToggleVerificado = vi.fn().mockResolvedValue(undefined);
      render(
        <RequisitoItem
          item={item({ verificado: false })}
          onToggleVerificado={onToggleVerificado}
        />,
      );
      const cb = screen.getByRole("checkbox");
      expect(cb).toBeEnabled();
      await user.click(cb);
      expect(onToggleVerificado).toHaveBeenCalledWith(true);
    });

    it("desabilita o checkbox enquanto a chamada não resolve", async () => {
      const user = userEvent.setup();
      let resolver: () => void = () => {};
      const onToggleVerificado = vi.fn(() => new Promise<void>((r) => (resolver = r)));
      render(
        <RequisitoItem
          item={item({ verificado: false })}
          onToggleVerificado={onToggleVerificado}
        />,
      );
      const cb = screen.getByRole("checkbox");
      await user.click(cb);
      expect(cb).toBeDisabled();
      resolver();
      await waitFor(() => expect(cb).toBeEnabled());
    });

    it("no erro genérico mostra a mensagem padrão e o checkbox reflete de novo o valor da prop", async () => {
      const user = userEvent.setup();
      const onToggleVerificado = vi.fn().mockRejectedValue(new AnaliseConflitoError());
      render(
        <RequisitoItem
          item={item({ verificado: false })}
          onToggleVerificado={onToggleVerificado}
        />,
      );
      const cb = screen.getByRole("checkbox");
      await user.click(cb);
      expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível salvar/i);
      // o pai não mudou o item → o checkbox continua desmarcado
      expect(cb).not.toBeChecked();
      expect(cb).toBeEnabled();
    });

    it("erro 404 (AnaliseNaoEncontradaError) também cai na mensagem genérica", async () => {
      const user = userEvent.setup();
      const onToggleVerificado = vi.fn().mockRejectedValue(new AnaliseNaoEncontradaError("1"));
      render(
        <RequisitoItem
          item={item({ verificado: false })}
          onToggleVerificado={onToggleVerificado}
        />,
      );
      await user.click(screen.getByRole("checkbox"));
      expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível salvar/i);
    });

    it("no 422 (AnaliseValidacaoError) mostra a mensagem do backend, não a genérica (RF-017)", async () => {
      const user = userEvent.setup();
      const onToggleVerificado = vi
        .fn()
        .mockRejectedValue(
          new AnaliseValidacaoError(["Comentário obrigatório quando o parecer difere da IA."]),
        );
      render(
        <RequisitoItem
          item={item({ verificado: false })}
          onToggleVerificado={onToggleVerificado}
        />,
      );
      await user.click(screen.getByRole("checkbox"));
      const alerta = await screen.findByRole("alert");
      expect(alerta).toHaveTextContent("Comentário obrigatório quando o parecer difere da IA.");
      expect(alerta).not.toHaveTextContent(/não foi possível salvar/i);
    });
  });

  describe("ação 'Alterar parecer' (RF-008)", () => {
    it("não aparece sem o callback", async () => {
      const user = userEvent.setup();
      render(<RequisitoItem item={item()} />);
      await user.click(screen.getByRole("button", { expanded: false }));
      expect(screen.queryByRole("button", { name: "Alterar parecer" })).not.toBeInTheDocument();
    });

    it("aparece no bloco expandido quando o callback vem e o dispara ao clicar", async () => {
      const user = userEvent.setup();
      const onAlterarParecer = vi.fn();
      render(<RequisitoItem item={item()} onAlterarParecer={onAlterarParecer} />);
      // recolhido: ainda não há botão
      expect(screen.queryByRole("button", { name: "Alterar parecer" })).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { expanded: false }));
      await user.click(screen.getByRole("button", { name: "Alterar parecer" }));
      expect(onAlterarParecer).toHaveBeenCalledTimes(1);
    });
  });

  describe("status sugerido pela IA (RF-007)", () => {
    it("parecer = sugestão: marca 'IA' no recolhido, sem chip de divergência", () => {
      render(
        <RequisitoItem item={item({ statusSugeridoIa: "CONFORME", statusFinal: "CONFORME" })} />,
      );
      expect(screen.getByText("IA")).toBeInTheDocument();
      expect(screen.queryByText(/^IA:/)).not.toBeInTheDocument();
    });

    it("parecer ≠ sugestão: chip 'IA: <sugestão>' + badge principal segue o parecer atual", () => {
      render(
        <RequisitoItem
          item={item({ statusSugeridoIa: "CONFORME", statusFinal: "NAO_CONFORME" })}
        />,
      );
      expect(screen.getByText("IA: Conforme")).toBeInTheDocument();
      // o badge grande continua sendo o statusFinal (TSD-014 §9)
      expect(screen.getByText("Não conforme")).toBeInTheDocument();
    });

    it("expandido, parecer = sugestão: mostra só 'Sugestão da IA'", async () => {
      const user = userEvent.setup();
      render(
        <RequisitoItem item={item({ statusSugeridoIa: "CONFORME", statusFinal: "CONFORME" })} />,
      );
      await user.click(screen.getByRole("button", { expanded: false }));
      expect(screen.getByText("Sugestão da IA:")).toBeInTheDocument();
      expect(screen.queryByText("Parecer atual:")).not.toBeInTheDocument();
    });

    it("expandido, parecer ≠ sugestão: mostra 'Sugestão da IA' e 'Parecer atual'", async () => {
      const user = userEvent.setup();
      render(
        <RequisitoItem
          item={item({ statusSugeridoIa: "CONFORME", statusFinal: "NAO_CONFORME" })}
        />,
      );
      await user.click(screen.getByRole("button", { expanded: false }));
      expect(screen.getByText("Sugestão da IA:")).toBeInTheDocument();
      expect(screen.getByText("Parecer atual:")).toBeInTheDocument();
      expect(screen.getByText("alterado na revisão")).toBeInTheDocument();
    });
  });
});
