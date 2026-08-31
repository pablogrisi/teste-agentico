/**
 * Validação das variáveis de ambiente na inicialização.
 *
 * Roda dentro do `ConfigModule.forRoot({ validate })`. Se algo obrigatório
 * estiver faltando ou inválido, a aplicação falha logo no boot, em vez de
 * quebrar mais tarde num ponto distante.
 */

export type IaAdapter = 'stub' | 'http';

export interface ValidatedEnv {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  ANALISTA_ATUAL_ID: string;
  ANALISTA_ATUAL_NOME: string;
  IA_ADAPTER: IaAdapter;
  ARMAZENAMENTO_PDF_DIR: string;
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
  if (iaAdapterRaw !== 'stub' && iaAdapterRaw !== 'http') {
    errors.push(
      `IA_ADAPTER deve ser "stub" ou "http" (recebido: "${iaAdapterRaw}")`,
    );
  }

  const ARMAZENAMENTO_PDF_DIR =
    asString('ARMAZENAMENTO_PDF_DIR', { required: false }) || './var/pdfs';

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
    ARMAZENAMENTO_PDF_DIR,
  };
}
