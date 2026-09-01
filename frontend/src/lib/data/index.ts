import type { AnalisesGateway } from "./analises-gateway";
import { FixturesAnalisesGateway } from "./fixtures-analises-gateway";
import { HttpAnalisesGateway } from "./http-analises-gateway";

export { AnalisesGatewayError } from "./analises-gateway";
export type { AnalisesGateway } from "./analises-gateway";
export { FixturesAnalisesGateway } from "./fixtures-analises-gateway";
export { HttpAnalisesGateway } from "./http-analises-gateway";
export {
  parseListarAnalisesQuery,
  queryParaString,
  TAMANHO_MAX,
  TAMANHO_PADRAO,
} from "./analises-query";
export type { ParamsBrutos } from "./analises-query";
export {
  isStatusAnalise,
  STATUS_ANALISE,
  STATUS_ANALISE_LABEL,
  STATUS_ANALISE_TONE,
} from "./status-analise";
export type { StatusTone } from "./status-analise";
export type {
  AnaliseResumo,
  AnalisesPagina,
  ListarAnalisesQuery,
  OrdemListagem,
  OrdenarAnalisesPor,
  StatusAnalise,
  StatusRequisito,
} from "./types";

/**
 * Ponto único de composição da camada de dados.
 *
 * Com `NEXT_PUBLIC_API_BASE_URL` definida, usa o gateway HTTP (contrato TSD-005);
 * sem ela, usa as fixtures locais. Nenhum componente de tela decide isso.
 */
export function getAnalisesGateway(): AnalisesGateway {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  return apiBaseUrl ? new HttpAnalisesGateway(apiBaseUrl) : new FixturesAnalisesGateway();
}
