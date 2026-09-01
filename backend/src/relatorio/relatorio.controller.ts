import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import { RelatorioService } from './relatorio.service';

@Controller('analises')
export class RelatorioController {
  constructor(private readonly relatorio: RelatorioService) {}

  @Get(':id/relatorio')
  async baixar(@Param('id') id: string): Promise<StreamableFile> {
    const { bytes, nomeArquivo } = await this.relatorio.gerar(id);
    return new StreamableFile(bytes, {
      type: 'application/pdf',
      disposition: `inline; filename="${nomeArquivo}"`,
    });
  }
}
