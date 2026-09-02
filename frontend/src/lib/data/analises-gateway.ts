import type {
  AlteracaoParecerInput,
  AnaliseCriada,
  AnaliseDetalhe,
  AnalisesPagina,
  ListarAnalisesQuery,
  NovaAnaliseInput,
  RequisitoPendente,
  RevisaoRequisitoResultado,
} from "./types";

/** Erro de qualquer implementação de `AnalisesGateway` (transporte, contrato, formato). */
export class AnalisesGatewayError extends Error {
  constructor(
    message: string,
    readonly causa?: unknown,
  ) {
    super(message);
    this.name = "AnalisesGatewayError";
  }
}

/** Entrada rejeitada pela validação do backend (`422` de `POST /analises`). */
export class AnaliseValidacaoError extends AnalisesGatewayError {
  constructor(readonly motivos: string[]) {
    super(motivos[0] ?? "Dados inválidos para criar a análise.");
    this.name = "AnaliseValidacaoError";
  }
}

/** A análise não existe para o analista atual (`404` de `GET /analises/:id`). */
export class AnaliseNaoEncontradaError extends AnalisesGatewayError {
  constructor(readonly analiseId: string) {
    super(`Análise ${analiseId} não encontrada.`);
    this.name = "AnaliseNaoEncontradaError";
  }
}

/** A análise não está mais editável (`409` — fora de `PRONTA_PARA_REVISAO`). */
export class AnaliseConflitoError extends AnalisesGatewayError {
  constructor(message = "Esta análise não está mais em revisão.") {
    super(message);
    this.name = "AnaliseConflitoError";
  }
}

/**
 * Conclusão recusada porque ainda há requisitos **obrigatórios** sem verificar
 * (`422` de `POST /analises/:id/concluir` — TSD-010). Carrega a lista devolvida pelo backend.
 */
export class AnaliseRequisitosPendentesError extends AnalisesGatewayError {
  constructor(readonly pendentes: RequisitoPendente[]) {
    super("Ainda há requisitos obrigatórios não verificados.");
    this.name = "AnaliseRequisitosPendentesError";
  }
}

/**
 * Seam de dados do frontend. Todo acesso a dados de análise passa por esta interface —
 * nenhum componente de tela fala HTTP direto.
 *
 * Implementações: `FixturesAnalisesGateway` (sem backend) e `HttpAnalisesGateway`
 * (contrato REST das TSD-004/005/007). O módulo de composição (./index.ts) escolhe qual usar.
 */
export interface AnalisesGateway {
  /** Lista as análises do analista atual, com busca/filtro/ordenação/paginação (TSD-005). */
  listarAnalises(query?: Partial<ListarAnalisesQuery>): Promise<AnalisesPagina>;

  /** Cria uma análise (multipart NUP + objeto + PDF) — TSD-004. */
  criarAnalise(input: NovaAnaliseInput): Promise<AnaliseCriada>;

  /** Abre uma análise: detalhe + resumo + avaliações por área (TSD-007). `404` → `AnaliseNaoEncontradaError`. */
  abrirAnalise(id: string): Promise<AnaliseDetalhe>;

  /**
   * Altera o parecer (`statusFinal` + `comentario`) de um requisito e devolve o item
   * atualizado + o `resumo` recalculado — `PATCH /analises/:id/requisitos/:requisitoId` (TSD-008).
   * `422` → `AnaliseValidacaoError`; `409` → `AnaliseConflitoError`; `404` → `AnaliseNaoEncontradaError`.
   */
  revisarRequisito(
    analiseId: string,
    requisitoId: string,
    patch: AlteracaoParecerInput,
  ): Promise<RevisaoRequisitoResultado>;

  /**
   * Marca/desmarca um requisito como `verificado` — mesmo `PATCH` da TSD-008, corpo
   * `{ verificado }` (sem comentário; a R-06 só vale ao mudar `statusFinal`). Mesmos erros.
   */
  marcarVerificado(
    analiseId: string,
    requisitoId: string,
    verificado: boolean,
  ): Promise<RevisaoRequisitoResultado>;

  /**
   * URL do PDF de entrada da análise para carregar no visor (`GET /analises/:id/pdf`, TSD-009).
   * `null` quando não há backend real (fixtures) — a tela mostra um aviso no lugar do visor.
   */
  urlPdf(analiseId: string): string | null;

  /**
   * Corrige/define a `paginaReferencia` de um requisito — mesmo `PATCH` da TSD-008/009, corpo
   * `{ paginaReferencia }` (`1..totalPaginasPdf` \| `≥ 1` \| `null` para limpar). Não dispara a
   * R-06. `422` → `AnaliseValidacaoError`; `409` → `AnaliseConflitoError`; `404` → `AnaliseNaoEncontradaError`.
   */
  corrigirPaginaReferencia(
    analiseId: string,
    requisitoId: string,
    pagina: number | null,
  ): Promise<RevisaoRequisitoResultado>;

  /**
   * Conclui a análise — `POST /analises/:id/concluir` (TSD-010), sem corpo. Devolve o
   * `AnaliseDetalhe` já `CONCLUIDA`. `CONCLUIDA` → idempotente (`200`).
   * `422` → `AnaliseRequisitosPendentesError` (com `pendentes`); `409` → `AnaliseConflitoError`;
   * `404` → `AnaliseNaoEncontradaError`.
   */
  concluirAnalise(analiseId: string): Promise<AnaliseDetalhe>;
}
