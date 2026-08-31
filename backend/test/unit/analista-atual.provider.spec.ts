import { ConfigService } from '@nestjs/config';
import { AnalistaAtualProvider } from '../../src/core/analista-atual/analista-atual.provider';

describe('AnalistaAtualProvider', () => {
  it('devolve o analista único definido por configuração', () => {
    const valores: Record<string, string> = {
      'analistaAtual.id': 'analista-mvp',
      'analistaAtual.nome': 'Analista MVP',
    };
    const config = {
      get: (chave: string, padrao: string) => valores[chave] ?? padrao,
    } as unknown as ConfigService;

    const provider = new AnalistaAtualProvider(config);

    expect(provider.getAnalistaAtual()).toEqual({
      analistaId: 'analista-mvp',
      nome: 'Analista MVP',
    });
  });
});
