import type { AnalisesPagina, ListarAnalisesQuery } from "./types";

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

/**
 * Seam de dados do frontend. Todo acesso a dados de análise passa por esta interface —
 * nenhum componente de tela fala HTTP direto.
 *
 * Implementações: `FixturesAnalisesGateway` (sem backend) e `HttpAnalisesGateway`
 * (contrato REST da TSD-005). O módulo de composição (./index.ts) escolhe qual usar.
 */
export interface AnalisesGateway {
  /** Lista as análises do analista atual, com busca/filtro/ordenação/paginação (TSD-005). */
  listarAnalises(query?: Partial<ListarAnalisesQuery>): Promise<AnalisesPagina>;
}
