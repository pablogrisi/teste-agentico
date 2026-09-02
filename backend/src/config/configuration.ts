/**
 * Configuração tipada da aplicação, derivada das variáveis de ambiente já
 * validadas por `validateEnv`. Consumida via `ConfigService.get(...)`.
 */

export interface AppConfig {
  nodeEnv: string;
  port: number;
  /**
   * Origens permitidas em CORS (lista de `CORS_ORIGINS`, separada por vírgula).
   * Vazia = reflete a origem da requisição (adequado ao MVP sem autenticação —
   * SDD §2/§9; apertar quando houver identidade).
   */
  corsOrigins: string[];
  database: {
    url: string;
  };
  analistaAtual: {
    id: string;
    nome: string;
  };
  ia: {
    /** `stub` (padrão) ou `openai` (adapter real — TSD-022). */
    adapter: 'stub' | 'openai';
    /** Modelo GPT usado pelo adapter OpenAI. */
    modelo: string;
    /** Chave da API OpenAI (obrigatória quando `adapter === 'openai'`). */
    openaiApiKey: string;
    /** Base URL alternativa do SDK `openai` (proxy). Vazia = api.openai.com. */
    baseUrl: string;
    /** Corte de requisitos por chamada ao modelo (o adapter divide em lotes). */
    maxRequisitosPorChamada: number;
  };
  armazenamentoPdf: {
    dir: string;
  };
  analise: {
    pdfTamanhoMaxBytes: number;
  };
  processamento: {
    iaTimeoutMs: number;
    intervaloMs: number;
    auto: boolean;
  };
}

export function parseCorsOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  analistaAtual: {
    id: process.env.ANALISTA_ATUAL_ID ?? '',
    nome: process.env.ANALISTA_ATUAL_NOME ?? '',
  },
  ia: {
    adapter: (process.env.IA_ADAPTER as 'stub' | 'openai') ?? 'stub',
    modelo: process.env.IA_MODELO ?? 'gpt-4o',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    baseUrl: process.env.IA_BASE_URL ?? '',
    maxRequisitosPorChamada: Number(
      process.env.IA_MAX_REQUISITOS_POR_CHAMADA ?? '50',
    ),
  },
  armazenamentoPdf: {
    dir: process.env.ARMAZENAMENTO_PDF_DIR ?? './var/pdfs',
  },
  analise: {
    pdfTamanhoMaxBytes:
      Number(process.env.ANALISE_PDF_TAMANHO_MAX_MB ?? '25') * 1024 * 1024,
  },
  processamento: {
    iaTimeoutMs: Number(process.env.IA_TIMEOUT_MS ?? '120000'),
    intervaloMs: Number(process.env.PROCESSAMENTO_INTERVALO_MS ?? '5000'),
    auto: (process.env.PROCESSAMENTO_AUTO ?? 'true').toLowerCase() !== 'false',
  },
});
