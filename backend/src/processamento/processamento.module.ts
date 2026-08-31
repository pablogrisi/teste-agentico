import { Module } from '@nestjs/common';
import { RequisitosModule } from '../requisitos/requisitos.module';
import { ProcessamentoService } from './processamento.service';

/**
 * Módulo de Processamento (SDD §6) — worker em processo que transforma uma
 * análise `PENDENTE` em `PRONTA_PARA_REVISAO` (RF-005/RF-007, TSD-006).
 * As portas (`AnaliseIaPort`, `ArmazenamentoPdfPort`) vêm do `CoreModule` global.
 */
@Module({
  imports: [RequisitosModule],
  providers: [ProcessamentoService],
  exports: [ProcessamentoService],
})
export class ProcessamentoModule {}
