import { validateEnv } from '../../src/config/env.validation';

/** Base mínima válida (só o obrigatório sem IA_ADAPTER=openai). */
const base = {
  DATABASE_URL: 'postgresql://x',
  ANALISTA_ATUAL_ID: 'a',
  ANALISTA_ATUAL_NOME: 'A',
};

describe('validateEnv — IA_ADAPTER / OpenAI (TSD-022)', () => {
  it('sem IA_ADAPTER → stub, com defaults de modelo e corte', () => {
    const env = validateEnv({ ...base });
    expect(env.IA_ADAPTER).toBe('stub');
    expect(env.IA_MODELO).toBe('gpt-4o');
    expect(env.IA_MAX_REQUISITOS_POR_CHAMADA).toBe(200);
    expect(env.OPENAI_API_KEY).toBe('');
  });

  it('IA_ADAPTER=openai sem OPENAI_API_KEY → lança', () => {
    expect(() => validateEnv({ ...base, IA_ADAPTER: 'openai' })).toThrow(
      /OPENAI_API_KEY/,
    );
  });

  it('IA_ADAPTER=openai com OPENAI_API_KEY → ok, expõe a chave e o modelo', () => {
    const env = validateEnv({
      ...base,
      IA_ADAPTER: 'openai',
      OPENAI_API_KEY: 'sk-test',
      IA_MODELO: 'gpt-4o-mini',
    });
    expect(env.IA_ADAPTER).toBe('openai');
    expect(env.OPENAI_API_KEY).toBe('sk-test');
    expect(env.IA_MODELO).toBe('gpt-4o-mini');
  });

  it('IA_ADAPTER=http → erro citando "openai"', () => {
    expect(() => validateEnv({ ...base, IA_ADAPTER: 'http' })).toThrow(
      /openai/,
    );
  });

  it('IA_ADAPTER inválido → erro', () => {
    expect(() => validateEnv({ ...base, IA_ADAPTER: 'gemini' })).toThrow(
      /IA_ADAPTER/,
    );
  });

  it('IA_MAX_REQUISITOS_POR_CHAMADA não-inteiro → lança', () => {
    expect(() =>
      validateEnv({ ...base, IA_MAX_REQUISITOS_POR_CHAMADA: '2.5' }),
    ).toThrow(/IA_MAX_REQUISITOS_POR_CHAMADA/);
  });

  it('IA_BASE_URL opcional é repassada quando presente', () => {
    const env = validateEnv({
      ...base,
      IA_ADAPTER: 'openai',
      OPENAI_API_KEY: 'sk-test',
      IA_BASE_URL: 'https://proxy.interno/v1',
    });
    expect(env.IA_BASE_URL).toBe('https://proxy.interno/v1');
  });
});
