import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlterarParecerModal } from "@/components/analise/AlterarParecerModal";
import { AnaliseConflitoError, AnaliseValidacaoError, FixturesAnalisesGateway } from "@/lib/data";
import type { AvaliacaoItem, ResumoAnalise } from "@/lib/data";

function item(over: Partial<AvaliacaoItem> = {}): AvaliacaoItem {
  return {
    id: "av-1",
    requisitoId: "req-1",
    codigo: "CHK-001",
    area: "CHECKLIST_DADOS_GERAIS",
    titulo: "O processo contém a solicitação (CI) do setor interessado?",
    descricao: "d",
    obrigatorio: true,
    ordem: 1,
    norma: { lei: null, artigo: null, inciso: null, paragrafo: null, alinea: null },
    statusSugeridoIa: "NAO_CONFORME",
    statusFinal: "NAO_CONFORME",
    verificado: false,
    comentario: null,
    paginaReferencia: null,
    ...over,
  };
}

const RESUMO: ResumoAnalise = {
  total: 1,
  conforme: 1,
  naoConforme: 0,
  naoSeAplica: 0,
  verificados: 1,
  obrigatoriosPendentes: 0,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AlterarParecerModal", () => {
  it("mostra o parecer atual (read-only) e o select sem o status atual", () => {
    render(
      <AlterarParecerModal analiseId="1" item={item()} onFechar={vi.fn()} onAlterado={vi.fn()} />,
    );
    const atual = screen.getByText("Parecer atual").closest("section") as HTMLElement;
    expect(within(atual).getByText("Não conforme")).toBeInTheDocument();

    const select = screen.getByLabelText(/^Parecer/) as HTMLSelectElement;
    const opcoes = [...select.options].map((o) => o.textContent);
    expect(opcoes).toEqual(["Selecione", "Conforme", "Não se aplica"]);
  });

  it("Confirmar fica desabilitado até haver parecer e comentário", async () => {
    const user = userEvent.setup();
    render(
      <AlterarParecerModal analiseId="1" item={item()} onFechar={vi.fn()} onAlterado={vi.fn()} />,
    );
    const confirmar = screen.getByRole("button", { name: "Confirmar" });
    expect(confirmar).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/^Parecer/), "CONFORME");
    expect(confirmar).toBeDisabled();

    await user.type(screen.getByLabelText(/Comentário/), "consta à fl. 2");
    expect(confirmar).toBeEnabled();
  });

  it("mostra a dica 'a IA sugeriu…' quando o novo parecer diverge da sugestão", async () => {
    const user = userEvent.setup();
    render(
      <AlterarParecerModal analiseId="1" item={item()} onFechar={vi.fn()} onAlterado={vi.fn()} />,
    );
    await user.selectOptions(screen.getByLabelText(/^Parecer/), "CONFORME");
    expect(screen.getByText(/A IA sugeriu/)).toHaveTextContent("Não conforme");
  });

  it("no sucesso chama onAlterado com { item, resumo } do gateway", async () => {
    const user = userEvent.setup();
    const atualizado = item({ statusFinal: "CONFORME", verificado: true, comentario: "ok" });
    vi.spyOn(FixturesAnalisesGateway.prototype, "revisarRequisito").mockResolvedValue({
      item: atualizado,
      resumo: RESUMO,
    });
    const onAlterado = vi.fn();
    render(
      <AlterarParecerModal
        analiseId="1"
        item={item()}
        onFechar={vi.fn()}
        onAlterado={onAlterado}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/^Parecer/), "CONFORME");
    await user.type(screen.getByLabelText(/Comentário/), "consta à fl. 2");
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(onAlterado).toHaveBeenCalledTimes(1));
    expect(onAlterado.mock.calls[0][0]).toEqual({ item: atualizado, resumo: RESUMO });
  });

  it("422 do backend → mensagem no modal, sem chamar onAlterado, dados preservados", async () => {
    const user = userEvent.setup();
    vi.spyOn(FixturesAnalisesGateway.prototype, "revisarRequisito").mockRejectedValue(
      new AnaliseValidacaoError(["Comentário obrigatório quando o parecer difere da IA."]),
    );
    const onAlterado = vi.fn();
    render(
      <AlterarParecerModal
        analiseId="1"
        item={item()}
        onFechar={vi.fn()}
        onAlterado={onAlterado}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/^Parecer/), "CONFORME");
    await user.type(screen.getByLabelText(/Comentário/), "curto");
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Comentário obrigatório/);
    expect(onAlterado).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Comentário/)).toHaveValue("curto");
  });

  it("409 do backend → mensagem de análise fora de revisão", async () => {
    const user = userEvent.setup();
    vi.spyOn(FixturesAnalisesGateway.prototype, "revisarRequisito").mockRejectedValue(
      new AnaliseConflitoError(),
    );
    render(
      <AlterarParecerModal analiseId="1" item={item()} onFechar={vi.fn()} onAlterado={vi.fn()} />,
    );
    await user.selectOptions(screen.getByLabelText(/^Parecer/), "CONFORME");
    await user.type(screen.getByLabelText(/Comentário/), "ok");
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/não está mais em revisão/i);
  });

  it("Escape fecha o modal", async () => {
    const user = userEvent.setup();
    const onFechar = vi.fn();
    render(
      <AlterarParecerModal analiseId="1" item={item()} onFechar={onFechar} onAlterado={vi.fn()} />,
    );
    await user.keyboard("{Escape}");
    expect(onFechar).toHaveBeenCalled();
  });
});
