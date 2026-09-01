import type {
  AnaliseCriada,
  AnaliseDetalhe,
  AnalisesPagina,
  ListarAnalisesQuery,
  NovaAnaliseInput,
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
}
