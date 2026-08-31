import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { CoreModule } from './core/core.module';
import { HealthModule } from './health/health.module';
import { AnalisesModule } from './analises/analises.module';
import { RequisitosModule } from './requisitos/requisitos.module';
import { ProcessamentoModule } from './processamento/processamento.module';
import { RelatorioModule } from './relatorio/relatorio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    CoreModule,
    HealthModule,
    // Módulos de feature — vazios na fundação (TSD-001).
    AnalisesModule,
    RequisitosModule,
    ProcessamentoModule,
    RelatorioModule,
  ],
})
export class AppModule {}
