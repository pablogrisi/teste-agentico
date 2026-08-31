import { Module } from '@nestjs/common';

/**
 * Módulo de Processamento (SDD §6) — worker em processo que varre análises
 * pendentes, chama a `AnaliseIaPort` e avança a máquina de status. Vazio na
 * fundação (sem lógica de worker): entra no ciclo de RF-005.
 */
@Module({})
export class ProcessamentoModule {}
