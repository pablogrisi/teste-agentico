import {
  AnaliseConflitoError,
  AnaliseNaoEncontradaError,
  AnaliseValidacaoError,
  AnalisesGatewayError,
  type AnalisesGateway,
} from "./analises-gateway";
import { queryParaString } from "./analises-query";
import { isStatusAnalise } from "./status-analise";
import { isStatusRequisito } from "./status-requisito";
import type {
  AlteracaoParecerInput,
  AnaliseCriada,
  AnaliseDetalhe,
  AnaliseResumo,
  AnalisesPagina,
  AreaComItens,
  AvaliacaoItem,
  ListarAnalisesQuery,
  NormaReferencia,
  NovaAnaliseInput,
  ResumoAnalise,
  RevisaoRequisitoResultado,
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

  async abrirAnalise(id: string): Promise<AnaliseDetalhe> {
    const url = `${this.baseUrl.replace(/\/+$/, "")}/analises/${encodeURIComponent(id)}`;

    let resposta: Response;
    try {
      resposta = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    } catch (causa) {
      throw new AnalisesGatewayError("Não foi possível contatar o serviço de análises.", causa);
    }

    if (resposta.status === 404) throw new AnaliseNaoEncontradaError(id);
    if (!resposta.ok) {
      throw new AnalisesGatewayError(`Falha ao abrir a análise (HTTP ${resposta.status}).`);
    }

    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch (causa) {
      throw new AnalisesGatewayError("Resposta do serviço de análises não é JSON válido.", causa);
    }
    return validarAnaliseDetalhe(corpo);
  }

  async revisarRequisito(
    analiseId: string,
    requisitoId: string,
    patch: AlteracaoParecerInput,
  ): Promise<RevisaoRequisitoResultado> {
    return this.patchRevisao(analiseId, requisitoId, {
      statusFinal: patch.statusFinal,
      comentario: patch.comentario,
    });
  }

  async marcarVerificado(
    analiseId: string,
    requisitoId: string,
    verificado: boolean,
  ): Promise<RevisaoRequisitoResultado> {
    return this.patchRevisao(analiseId, requisitoId, { verificado });
  }

  urlPdf(analiseId: string): string {
    return `${this.baseUrl.replace(/\/+$/, "")}/analises/${encodeURIComponent(analiseId)}/pdf`;
  }

  async corrigirPaginaReferencia(
    analiseId: string,
    requisitoId: string,
    pagina: number | null,
  ): Promise<RevisaoRequisitoResultado> {
    return this.patchRevisao(analiseId, requisitoId, { paginaReferencia: pagina });
  }

  /** `PATCH /analises/:id/requisitos/:requisitoId` com o corpo dado — comum a revisar e verificar (TSD-008). */
  private async patchRevisao(
    analiseId: string,
    requisitoId: string,
    body: Record<string, unknown>,
  ): Promise<RevisaoRequisitoResultado> {
    const base = this.baseUrl.replace(/\/+$/, "");
    const url = `${base}/analises/${encodeURIComponent(analiseId)}/requisitos/${encodeURIComponent(
      requisitoId,
    )}`;

    let resposta: Response;
    try {
      resposta = await fetch(url, {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", accept: "application/json" },
        cache: "no-store",
      });
    } catch (causa) {
      throw new AnalisesGatewayError("Não foi possível contatar o serviço de análises.", causa);
    }

    if (resposta.status === 422) throw new AnaliseValidacaoError(await extrairMotivos(resposta));
    if (resposta.status === 409) throw new AnaliseConflitoError();
    if (resposta.status === 404) throw new AnaliseNaoEncontradaError(analiseId);
    if (!resposta.ok) {
      throw new AnalisesGatewayError(`Falha ao revisar o requisito (HTTP ${resposta.status}).`);
    }

    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch (causa) {
      throw new AnalisesGatewayError("Resposta do serviço de análises não é JSON válido.", causa);
    }
    return validarRevisaoResultado(corpo);
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

function erroFormatoDetalhe(): never {
  throw new AnalisesGatewayError("Formato inesperado no detalhe da análise.");
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function lerNorma(v: unknown): NormaReferencia {
  const n = (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
  return {
    lei: str(n.lei),
    artigo: str(n.artigo),
    inciso: str(n.inciso),
    paragrafo: str(n.paragrafo),
    alinea: str(n.alinea),
  };
}

function lerItem(v: unknown): AvaliacaoItem {
  if (typeof v !== "object" || v === null) erroFormatoDetalhe();
  const it = v as Record<string, unknown>;
  if (
    typeof it.id !== "string" ||
    typeof it.requisitoId !== "string" ||
    typeof it.codigo !== "string" ||
    typeof it.area !== "string" ||
    typeof it.titulo !== "string" ||
    typeof it.descricao !== "string" ||
    typeof it.obrigatorio !== "boolean" ||
    typeof it.ordem !== "number" ||
    typeof it.statusSugeridoIa !== "string" ||
    !isStatusRequisito(it.statusSugeridoIa) ||
    typeof it.statusFinal !== "string" ||
    !isStatusRequisito(it.statusFinal) ||
    typeof it.verificado !== "boolean" ||
    (it.comentario !== null && typeof it.comentario !== "string") ||
    (it.paginaReferencia !== null && typeof it.paginaReferencia !== "number")
  ) {
    erroFormatoDetalhe();
  }
  return {
    id: it.id,
    requisitoId: it.requisitoId,
    codigo: it.codigo,
    area: it.area,
    titulo: it.titulo,
    descricao: it.descricao,
    obrigatorio: it.obrigatorio,
    ordem: it.ordem,
    norma: lerNorma(it.norma),
    statusSugeridoIa: it.statusSugeridoIa,
    statusFinal: it.statusFinal,
    verificado: it.verificado,
    comentario: (it.comentario as string | null) ?? null,
    paginaReferencia: (it.paginaReferencia as number | null) ?? null,
  };
}

function lerResumo(v: unknown): ResumoAnalise {
  if (typeof v !== "object" || v === null) erroFormatoDetalhe();
  const r = v as Record<string, unknown>;
  const campos = [
    "total",
    "conforme",
    "naoConforme",
    "naoSeAplica",
    "verificados",
    "obrigatoriosPendentes",
  ] as const;
  for (const c of campos) if (typeof r[c] !== "number") erroFormatoDetalhe();
  return {
    total: r.total as number,
    conforme: r.conforme as number,
    naoConforme: r.naoConforme as number,
    naoSeAplica: r.naoSeAplica as number,
    verificados: r.verificados as number,
    obrigatoriosPendentes: r.obrigatoriosPendentes as number,
  };
}

/** Valida a resposta `{ item, resumo }` de `PATCH /analises/:id/requisitos/:requisitoId` (TSD-008). */
export function validarRevisaoResultado(corpo: unknown): RevisaoRequisitoResultado {
  if (typeof corpo !== "object" || corpo === null) {
    throw new AnalisesGatewayError("Formato inesperado na alteração do parecer.");
  }
  const c = corpo as Record<string, unknown>;
  return { item: lerItem(c.item), resumo: lerResumo(c.resumo) };
}

/** Valida o payload de `GET /analises/:id` (SDD §7 — TSD-004 + TSD-007 + TSD-009 + TSD-010). */
export function validarAnaliseDetalhe(corpo: unknown): AnaliseDetalhe {
  if (typeof corpo !== "object" || corpo === null) erroFormatoDetalhe();
  const c = corpo as Record<string, unknown>;
  if (
    typeof c.id !== "string" ||
    typeof c.nup !== "string" ||
    typeof c.objeto !== "string" ||
    typeof c.status !== "string" ||
    !isStatusAnalise(c.status) ||
    (c.motivoErro !== null && typeof c.motivoErro !== "string") ||
    typeof c.analistaId !== "string" ||
    typeof c.analistaNome !== "string" ||
    typeof c.iniciadaEm !== "string" ||
    (c.concluidaEm !== null && typeof c.concluidaEm !== "string") ||
    !Array.isArray(c.avaliacoesPorArea)
  ) {
    erroFormatoDetalhe();
  }

  const avaliacoesPorArea: AreaComItens[] = c.avaliacoesPorArea.map((grupo) => {
    if (typeof grupo !== "object" || grupo === null) erroFormatoDetalhe();
    const g = grupo as Record<string, unknown>;
    if (typeof g.area !== "string" || !Array.isArray(g.itens)) erroFormatoDetalhe();
    return { area: g.area, itens: g.itens.map(lerItem) };
  });

  return {
    id: c.id,
    nup: c.nup,
    objeto: c.objeto,
    status: c.status,
    motivoErro: (c.motivoErro as string | null) ?? null,
    analistaId: c.analistaId,
    analistaNome: c.analistaNome,
    iniciadaEm: c.iniciadaEm,
    concluidaEm: (c.concluidaEm as string | null) ?? null,
    totalPaginasPdf: num(c.totalPaginasPdf),
    resumo: lerResumo(c.resumo),
    avaliacoesPorArea,
  };
}
