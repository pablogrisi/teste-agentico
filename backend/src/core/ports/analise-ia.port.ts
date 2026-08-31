import { StatusRequisito } from '../domain/status-requisito';

/** Token de injeção da porta (o valor concreto é escolhido no CoreModule). */
export const ANALISE_IA_PORT = Symbol('AnaliseIaPort');

/** Requisito passado para a capacidade de IA avaliar. */
export interface RequisitoParaIa {
  requisitoId: string;
  codigo: string;
  titulo: string;
  descricao: string;
}

/** Entrada de uma análise: o PDF e a base de requisitos a avaliar. */
export interface AnalisarInput {
  pdf: Buffer;
  requisitos: RequisitoParaIa[];
}

/** Sugestão da IA para um requisito. */
export interface SugestaoRequisito {
  requisitoId: string;
  statusSugerido: StatusRequisito;
  /** Página do PDF onde está a evidência, quando houver. */
  paginaReferencia?: number;
}

/**
 * Fronteira com a capacidade externa de análise assistida por IA (SDD §8).
 * O núcleo do sistema depende só desta forma; adapters concretos (stub, HTTP)
 * ficam atrás dela.
 */
export interface AnaliseIaPort {
  analisar(input: AnalisarInput): Promise<SugestaoRequisito[]>;
}
