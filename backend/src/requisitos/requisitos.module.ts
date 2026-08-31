import { Module } from '@nestjs/common';
import { ImportadorRequisitosService } from './importador/importador-requisitos.service';
import { RequisitosService } from './requisitos.service';

/**
 * Módulo de Requisitos / Avaliações (SDD §6).
 *
 * RF-006 (TSD-003): base fixa de requisitos — leitura da base ativa e
 * importador de arquivo externo. A avaliação de requisito por análise
 * (RF-007, RF-008, RF-011, RF-017) e qualquer endpoint HTTP entram depois.
 */
@Module({
  providers: [RequisitosService, ImportadorRequisitosService],
  exports: [RequisitosService, ImportadorRequisitosService],
})
export class RequisitosModule {}
