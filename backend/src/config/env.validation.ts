/**
 * Validação das variáveis de ambiente na inicialização.
 *
 * Roda dentro do `ConfigModule.forRoot({ validate })`. Se algo obrigatório
 * estiver faltando ou inválido, a aplicação falha logo no boot, em vez de
 * quebrar mais tarde num ponto distante.
 */

export type IaAdapter = 'stub' | 'openai';

export interface ValidatedEnv {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  ANALISTA_ATUAL_ID: string;
  ANALISTA_ATUAL_NOME: string;
  IA_ADAPTER: IaAdapter;
  OPENAI_API_KEY: string;
  IA_MODELO: string;
  IA_BASE_URL: string;
  IA_MAX_REQUISITOS_POR_CHAMADA: number;
  ARMAZENAMENTO_PDF_DIR: string;
  ANALISE_PDF_TAMANHO_MAX_MB: number;
  IA_TIMEOUT_MS: number;
  PROCESSAMENTO_INTERVALO_MS: number;
  PROCESSAMENTO_AUTO: boolean;
}

export function validateEnv(config: Record<string, unknown>): ValidatedEnv {
  const errors: string[] = [];

  const asString = (
    key: string,
    { required }: { required: boolean },
  ): string => {
    const raw = config[key];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      if (required) {
        errors.push(`${key} é obrigatória`);
      }
      return '';
    }
    return String(raw);
  };

  const NODE_ENV = asString('NODE_ENV', { required: false }) || 'development';

  const portRaw = asString('PORT', { required: false }) || '3000';
  const PORT = Number(portRaw);
  if (!Number.isInteger(PORT) || PORT <= 0) {
    errors.push(`PORT deve ser um inteiro positivo (recebido: "${portRaw}")`);
  }

  const DATABASE_URL = asString('DATABASE_URL', { required: true });

  const ANALISTA_ATUAL_ID = asString('ANALISTA_ATUAL_ID', { required: true });
  const ANALISTA_ATUAL_NOME = asString('ANALISTA_ATUAL_NOME', {
    required: true,
  });

  const iaAdapterRaw = asString('IA_ADAPTER', { required: false }) || 'stub';
  if (iaAdapterRaw === 'http') {
    errors.push('IA_ADAPTER "http" foi substituído por "openai" (TSD-022)');
  } else if (iaAdapterRaw !== 'stub' && iaAdapterRaw !== 'openai') {
    errors.push(
      `IA_ADAPTER deve ser "stub" ou "openai" (recebido: "${iaAdapterRaw}")`,
    );
  }

  const OPENAI_API_KEY = asString('OPENAI_API_KEY', {
    required: iaAdapterRaw === 'openai',
  });
  const IA_MODELO = asString('IA_MODELO', { required: false }) || 'gpt-4o';
  const IA_BASE_URL = asString('IA_BASE_URL', { required: false });

  const ARMAZENAMENTO_PDF_DIR =
    asString('ARMAZENAMENTO_PDF_DIR', { required: false }) || './var/pdfs';

  const tamanhoMaxRaw =
    asString('ANALISE_PDF_TAMANHO_MAX_MB', { required: false }) || '25';
  const ANALISE_PDF_TAMANHO_MAX_MB = Number(tamanhoMaxRaw);
  if (
    !Number.isFinite(ANALISE_PDF_TAMANHO_MAX_MB) ||
    ANALISE_PDF_TAMANHO_MAX_MB <= 0
  ) {
    errors.push(
      `ANALISE_PDF_TAMANHO_MAX_MB deve ser um número positivo (recebido: "${tamanhoMaxRaw}")`,
    );
  }

  const inteiroPositivo = (chave: string, padrao: number): number => {
    const raw = asString(chave, { required: false }) || String(padrao);
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      errors.push(`${chave} deve ser um inteiro positivo (recebido: "${raw}")`);
    }
    return n;
  };
  const IA_TIMEOUT_MS = inteiroPositivo('IA_TIMEOUT_MS', 120000);
  const IA_MAX_REQUISITOS_POR_CHAMADA = inteiroPositivo(
    'IA_MAX_REQUISITOS_POR_CHAMADA',
    50,
  );
  const PROCESSAMENTO_INTERVALO_MS = inteiroPositivo(
    'PROCESSAMENTO_INTERVALO_MS',
    5000,
  );

  const processamentoAutoRaw = (
    asString('PROCESSAMENTO_AUTO', { required: false }) || 'true'
  ).toLowerCase();
  if (processamentoAutoRaw !== 'true' && processamentoAutoRaw !== 'false') {
    errors.push(
      `PROCESSAMENTO_AUTO deve ser "true" ou "false" (recebido: "${processamentoAutoRaw}")`,
    );
  }
  const PROCESSAMENTO_AUTO = processamentoAutoRaw === 'true';

  if (errors.length > 0) {
    throw new Error(
      `Configuração de ambiente inválida:\n- ${errors.join('\n- ')}`,
    );
  }

  return {
    NODE_ENV,
    PORT,
    DATABASE_URL,
    ANALISTA_ATUAL_ID,
    ANALISTA_ATUAL_NOME,
    IA_ADAPTER: iaAdapterRaw as IaAdapter,
    OPENAI_API_KEY,
    IA_MODELO,
    IA_BASE_URL,
    IA_MAX_REQUISITOS_POR_CHAMADA,
    ARMAZENAMENTO_PDF_DIR,
    ANALISE_PDF_TAMANHO_MAX_MB,
    IA_TIMEOUT_MS,
    PROCESSAMENTO_INTERVALO_MS,
    PROCESSAMENTO_AUTO,
  };
}
