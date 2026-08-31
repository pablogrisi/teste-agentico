import { Injectable, Logger } from '@nestjs/common';
import {
  AnalisarInput,
  AnaliseIaPort,
  SugestaoRequisito,
} from '../ports/analise-ia.port';

/**
 * Adapter determinístico da `AnaliseIaPort` para desenvolvimento e testes.
 *
 * Não chama serviço externo nenhum: para cada requisito recebido devolve uma
 * sugestão `NAO_SE_APLICA` sem referência de página. Serve para exercitar o
 * fluxo ponta a ponta sem depender da capacidade de IA real (SDD §9;
 * quality-gates.md — dependência externa cara/instável).
 */
@Injectable()
export class AnaliseIaStubAdapter implements AnaliseIaPort {
  private readonly logger = new Logger(AnaliseIaStubAdapter.name);

  analisar(input: AnalisarInput): Promise<SugestaoRequisito[]> {
    this.logger.debug(
      `Stub: gerando ${input.requisitos.length} sugestão(ões) determinística(s)`,
    );

    const sugestoes: SugestaoRequisito[] = input.requisitos.map(
      (requisito) => ({
        requisitoId: requisito.requisitoId,
        statusSugerido: 'NAO_SE_APLICA',
      }),
    );

    return Promise.resolve(sugestoes);
  }
}
