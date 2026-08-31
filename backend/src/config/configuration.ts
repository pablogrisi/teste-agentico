/**
 * Configuração tipada da aplicação, derivada das variáveis de ambiente já
 * validadas por `validateEnv`. Consumida via `ConfigService.get(...)`.
 */

export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: {
    url: string;
  };
  analistaAtual: {
    id: string;
    nome: string;
  };
  ia: {
    adapter: 'stub' | 'http';
  };
  armazenamentoPdf: {
    dir: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  analistaAtual: {
    id: process.env.ANALISTA_ATUAL_ID ?? '',
    nome: process.env.ANALISTA_ATUAL_NOME ?? '',
  },
  ia: {
    adapter: (process.env.IA_ADAPTER as 'stub' | 'http') ?? 'stub',
  },
  armazenamentoPdf: {
    dir: process.env.ARMAZENAMENTO_PDF_DIR ?? './var/pdfs',
  },
});
