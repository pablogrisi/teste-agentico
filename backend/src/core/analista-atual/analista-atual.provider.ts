import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AnalistaAtual {
  analistaId: string;
  nome: string;
}

/**
 * Fonte da identidade do analista.
 *
 * No MVP não há autenticação nem múltiplos usuários (SDD §2/§9): devolve
 * sempre o analista único definido por configuração. É um seam deliberado —
 * quando identidade real entrar (questoes-abertas.md P-10), troca-se só esta
 * implementação, sem mexer nas queries que já filtram por `analistaId`.
 */
@Injectable()
export class AnalistaAtualProvider {
  constructor(private readonly config: ConfigService) {}

  getAnalistaAtual(): AnalistaAtual {
    return {
      analistaId: this.config.get<string>('analistaAtual.id', ''),
      nome: this.config.get<string>('analistaAtual.nome', ''),
    };
  }
}
