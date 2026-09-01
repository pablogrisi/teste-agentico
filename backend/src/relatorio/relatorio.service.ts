import { ConflictException, Injectable } from '@nestjs/common';
import { AnalisesService } from '../analises/analises.service';
import { montarModeloRelatorio } from './relatorio-modelo';
import { renderRelatorioPdf } from './relatorio.builder';

@Injectable()
export class RelatorioService {
  constructor(private readonly analises: AnalisesService) {}

  /**
   * Gera o relatório PDF de uma análise concluída (RF-016), sob demanda, sem
   * persistir (A-04). `404` (via `abrir`) se a análise não existe para o
   * analista atual; `409` se ainda não está `CONCLUIDA`.
   */
  async gerar(id: string): Promise<{ bytes: Buffer; nomeArquivo: string }> {
    const detalhe = await this.analises.abrir(id);
    if (detalhe.status !== 'CONCLUIDA') {
      throw new ConflictException(
        `O relatório só está disponível para análises concluídas (status atual: ${detalhe.status})`,
      );
    }
    const bytes = await renderRelatorioPdf(montarModeloRelatorio(detalhe));
    return { bytes, nomeArquivo: `relatorio-analise-${detalhe.id}.pdf` };
  }
}
