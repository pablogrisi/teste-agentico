import {
  AnaliseValidacaoError,
  AnalisesGatewayError,
  type AnalisesGateway,
} from "./analises-gateway";
import { queryParaString } from "./analises-query";
import { isStatusAnalise } from "./status-analise";
import type {
  AnaliseCriada,
  AnaliseResumo,
  AnalisesPagina,
  ListarAnalisesQuery,
  NovaAnaliseInput,
} from "./types";

/**
 * Consumidor do contrato REST `GET /analises` (TSD-005 / SDD §7).
 * Usado quando `NEXT_PUBLIC_API_BASE_URL` está definida.
 */
export class HttpAnalisesGateway implements AnalisesGateway {
  constructor(private readonly baseUrl: string) {}

  async listarAnalises(query: Partial<ListarAnalisesQuery> = {}): Promise<AnalisesPagina> {
    const qs = queryParaString(query);
    const url = `${this.baseUrl.replace(/\/+$/, "")}/analises${qs ? `?${qs}` : ""}`;

    let resposta: Response;
    try {
      resposta = await fetch(url, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
    } catch (causa) {
      throw new AnalisesGatewayError("Não foi possível contatar o serviço de análises.", causa);
    }

    if (!resposta.ok) {
      throw new AnalisesGatewayError(`Falha ao listar análises (HTTP ${resposta.status}).`);
    }

    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch (causa) {
      throw new AnalisesGatewayError("Resposta do serviço de análises não é JSON válido.", causa);
    }

    return validarAnalisesPagina(corpo);
  }

  async criarAnalise(input: NovaAnaliseInput): Promise<AnaliseCriada> {
    const url = `${this.baseUrl.replace(/\/+$/, "")}/analises`;
    const form = new FormData();
    form.append("nup", input.nup);
    form.append("objeto", input.objeto);
    form.append("arquivo", input.arquivo, input.arquivo.name);

    let resposta: Response;
    try {
      resposta = await fetch(url, {
        method: "POST",
        body: form,
        headers: { accept: "application/json" },
        cache: "no-store",
      });
    } catch (causa) {
      throw new AnalisesGatewayError("Não foi possível contatar o serviço de análises.", causa);
    }

    if (resposta.status === 422) {
      throw new AnaliseValidacaoError(await extrairMotivos(resposta));
    }
    if (!resposta.ok) {
      throw new AnalisesGatewayError(`Falha ao criar a análise (HTTP ${resposta.status}).`);
    }

    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch (causa) {
      throw new AnalisesGatewayError("Resposta do serviço de análises não é JSON válido.", causa);
    }
    return validarAnaliseCriada(corpo);
  }
}

/** Lê a lista de motivos de um corpo de erro `422` (padrão Nest: `message: string | string[]`). */
async function extrairMotivos(resposta: Response): Promise<string[]> {
  try {
    const corpo = (await resposta.json()) as { message?: unknown };
    if (Array.isArray(corpo.message)) return corpo.message.map(String);
    if (typeof corpo.message === "string") return [corpo.message];
  } catch {
    // corpo não-JSON — cai no motivo genérico
  }
  return ["Não foi possível validar os dados da análise."];
}

/** Valida a resposta `201` de `POST /analises` (TSD-004). */
export function validarAnaliseCriada(corpo: unknown): AnaliseCriada {
  if (typeof corpo !== "object" || corpo === null) {
    throw new AnalisesGatewayError("Formato inesperado na criação da análise.");
  }
  const c = corpo as Record<string, unknown>;
  if (
    typeof c.id !== "string" ||
    typeof c.nup !== "string" ||
    typeof c.objeto !== "string" ||
    typeof c.status !== "string" ||
    !isStatusAnalise(c.status) ||
    typeof c.iniciadaEm !== "string"
  ) {
    throw new AnalisesGatewayError("Formato inesperado na criação da análise.");
  }
  return { id: c.id, nup: c.nup, objeto: c.objeto, status: c.status, iniciadaEm: c.iniciadaEm };
}

/** Valida que o corpo bate com o contrato `{ itens, total, pagina, tamanho }` (TSD-005). */
export function validarAnalisesPagina(corpo: unknown): AnalisesPagina {
  if (typeof corpo !== "object" || corpo === null) {
    throw new AnalisesGatewayError("Formato inesperado na listagem de análises.");
  }
  const envelope = corpo as Record<string, unknown>;
  if (
    !Array.isArray(envelope.itens) ||
    typeof envelope.total !== "number" ||
    typeof envelope.pagina !== "number" ||
    typeof envelope.tamanho !== "number"
  ) {
    throw new AnalisesGatewayError("Formato inesperado na listagem de análises.");
  }

  const itens: AnaliseResumo[] = envelope.itens.map((item, indice) => {
    if (typeof item !== "object" || item === null) {
      throw new AnalisesGatewayError(`Item ${indice} da listagem em formato inesperado.`);
    }
    const it = item as Record<string, unknown>;
    if (
      typeof it.id !== "string" ||
      typeof it.nup !== "string" ||
      typeof it.objeto !== "string" ||
      typeof it.status !== "string" ||
      !isStatusAnalise(it.status) ||
      typeof it.iniciadaEm !== "string" ||
      (it.concluidaEm !== null && typeof it.concluidaEm !== "string")
    ) {
      throw new AnalisesGatewayError(`Item ${indice} da listagem em formato inesperado.`);
    }
    return {
      id: it.id,
      nup: it.nup,
      objeto: it.objeto,
      status: it.status,
      iniciadaEm: it.iniciadaEm,
      concluidaEm: (it.concluidaEm as string | null) ?? null,
    };
  });

  return { itens, total: envelope.total, pagina: envelope.pagina, tamanho: envelope.tamanho };
}
