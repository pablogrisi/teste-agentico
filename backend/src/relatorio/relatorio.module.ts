import { Module } from '@nestjs/common';
import { AnalisesModule } from '../analises/analises.module';
import { RelatorioController } from './relatorio.controller';
import { RelatorioService } from './relatorio.service';

/**
 * Módulo de Relatório (SDD §6) — geração sob demanda do relatório PDF da
 * análise concluída (RF-016 / TSD-011). Consome `AnalisesService`
 * (exportado por `AnalisesModule`); não acessa o Prisma diretamente.
 */
@Module({
  imports: [AnalisesModule],
  controllers: [RelatorioController],
  providers: [RelatorioService],
})
export class RelatorioModule {}
