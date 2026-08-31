import { Module } from '@nestjs/common';
import { AnalisesController } from './analises.controller';
import { AnalisesService } from './analises.service';
import { ValidacaoAnaliseService } from './validacao-analise.service';

/**
 * Módulo de Análises (SDD §6).
 *
 * RF-001/004/018 (TSD-004): criar análise com PDF persistido + leitura de uma
 * análise e do seu PDF. Listagem (RF-002), worker (RF-005), avaliação de
 * requisitos (RF-007+) e conclusão (RF-012) entram nos próximos ciclos.
 * As portas (`ArmazenamentoPdfPort`) e o `AnalistaAtualProvider` vêm do
 * `CoreModule` (global).
 */
@Module({
  controllers: [AnalisesController],
  providers: [AnalisesService, ValidacaoAnaliseService],
  exports: [AnalisesService],
})
export class AnalisesModule {}
