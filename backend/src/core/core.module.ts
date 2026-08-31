import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnaliseIaStubAdapter } from './adapters/analise-ia.stub-adapter';
import { ArmazenamentoPdfFilesystemAdapter } from './adapters/armazenamento-pdf.filesystem-adapter';
import { AnalistaAtualProvider } from './analista-atual/analista-atual.provider';
import { ANALISE_IA_PORT, AnaliseIaPort } from './ports/analise-ia.port';
import { ARMAZENAMENTO_PDF_PORT } from './ports/armazenamento-pdf.port';

/**
 * Escolhe a implementação da `AnaliseIaPort` por configuração.
 *
 * `stub` (padrão) → adapter determinístico.
 * `http` → adapter real contra a capacidade de IA — ainda não existe
 * (questoes-abertas.md A-02); falha explicitamente até a TSD que o criar.
 */
const analiseIaProvider: Provider = {
  provide: ANALISE_IA_PORT,
  inject: [ConfigService, AnaliseIaStubAdapter],
  useFactory: (
    config: ConfigService,
    stub: AnaliseIaStubAdapter,
  ): AnaliseIaPort => {
    const adapter = config.get<string>('ia.adapter', 'stub');
    if (adapter === 'http') {
      throw new Error(
        'IA_ADAPTER=http ainda não implementado — ver questoes-abertas.md A-02',
      );
    }
    return stub;
  },
};

const armazenamentoPdfProvider: Provider = {
  provide: ARMAZENAMENTO_PDF_PORT,
  useClass: ArmazenamentoPdfFilesystemAdapter,
};

/**
 * Reúne as fronteiras (portas + adapters) e o provider de analista atual,
 * espelhando o SDD §6/§8. Global para os módulos de feature consumirem sem
 * reimportar.
 */
@Global()
@Module({
  providers: [
    AnaliseIaStubAdapter,
    ArmazenamentoPdfFilesystemAdapter,
    AnalistaAtualProvider,
    analiseIaProvider,
    armazenamentoPdfProvider,
  ],
  exports: [ANALISE_IA_PORT, ARMAZENAMENTO_PDF_PORT, AnalistaAtualProvider],
})
export class CoreModule {}
