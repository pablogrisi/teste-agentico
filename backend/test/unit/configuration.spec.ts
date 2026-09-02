import configuration, {
  parseCorsOrigins,
} from '../../src/config/configuration';

describe('parseCorsOrigins', () => {
  it('vazio / indefinido → lista vazia', () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
    expect(parseCorsOrigins('')).toEqual([]);
    expect(parseCorsOrigins('  ,  ,')).toEqual([]);
  });

  it('separa por vírgula e faz trim, descartando vazios', () => {
    expect(
      parseCorsOrigins(' http://localhost:3000 , http://localhost:3001 ,,'),
    ).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });
});

describe('configuration()', () => {
  const envOriginal = process.env;

  afterEach(() => {
    process.env = envOriginal;
  });

  it('expõe corsOrigins a partir de CORS_ORIGINS', () => {
    process.env = { ...envOriginal, CORS_ORIGINS: 'http://a, http://b' };
    expect(configuration().corsOrigins).toEqual(['http://a', 'http://b']);
  });

  it('sem CORS_ORIGINS → corsOrigins vazio', () => {
    process.env = { ...envOriginal };
    delete process.env.CORS_ORIGINS;
    expect(configuration().corsOrigins).toEqual([]);
  });
});
