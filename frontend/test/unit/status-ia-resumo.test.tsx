import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusIaResumo } from "@/components/analise/StatusIaResumo";
import type { AvaliacaoItem } from "@/lib/data";

function item(over: Partial<AvaliacaoItem> = {}): AvaliacaoItem {
  return {
    id: "av-1",
    requisitoId: "req-1",
    codigo: "CHK-001",
    area: "CHECKLIST_DADOS_GERAIS",
    titulo: "t",
    descricao: "d",
    obrigatorio: false,
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

describe("StatusIaResumo — justificativa da alteração (RF-017)", () => {
  it("parecer diverge da IA + comentário → mostra 'Justificativa da alteração' com o texto", () => {
    render(
      <StatusIaResumo
        item={item({
          statusSugeridoIa: "NAO_CONFORME",
          statusFinal: "CONFORME",
          comentario: "Documento localizado à fl. 2 após nova leitura.",
        })}
      />,
    );
    const linha = screen.getByText("Justificativa da alteração:").closest("p") as HTMLElement;
    expect(linha).toHaveTextContent("Documento localizado à fl. 2 após nova leitura.");
  });

  it("parecer diverge mas comentário vazio/nulo → não mostra a linha", () => {
    render(
      <StatusIaResumo
        item={item({
          statusSugeridoIa: "NAO_CONFORME",
          statusFinal: "CONFORME",
          comentario: "   ",
        })}
      />,
    );
    expect(screen.queryByText(/Justificativa da alteração/)).not.toBeInTheDocument();
  });

  it("parecer = sugestão da IA → não mostra a justificativa mesmo com comentário", () => {
    render(
      <StatusIaResumo
        item={item({
          statusSugeridoIa: "CONFORME",
          statusFinal: "CONFORME",
          comentario: "comentário qualquer",
        })}
      />,
    );
    expect(screen.queryByText(/Justificativa da alteração/)).not.toBeInTheDocument();
    expect(screen.queryByText("Parecer atual:")).not.toBeInTheDocument();
  });
});
