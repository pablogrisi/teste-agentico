import { LinhaCrua } from '../../src/requisitos/importador/parse-requisitos-csv';
import { validarLinhas } from '../../src/requisitos/importador/validar-linhas';

const registro = (over: Partial<Record<string, string>> = {}) => ({
  codigo: 'CHK-001',
  area: 'CHECKLIST',
  titulo: 'Título',
  descricao: 'Descrição',
  obrigatorio: 'true',
  ordem: '10',
  ativo: 'true',
  norma_lei: '',
  norma_artigo: '',
  norma_inciso: '',
  norma_paragrafo: '',
  norma_alinea: '',
  ...over,
});

const crua = (n: number, over?: Partial<Record<string, string>>): LinhaCrua =>
  ({ numeroLinha: n, registro: registro(over) }) as LinhaCrua;

describe('validarLinhas', () => {
  it('aceita linhas bem formadas', () => {
    const r = validarLinhas([
      crua(2),
      crua(3, { codigo: 'TEC-001', area: 'TECNICA' }),
    ]);
    expect(r.ok).toBe(true);
    expect(r.linhas).toHaveLength(2);
  });

  it('rejeita área fora da allowlist', () => {
    const r = validarLinhas([crua(2, { area: 'LEGISLACAO' })]);
    expect(r.ok).toBe(false);
    expect(r.erros[0].mensagem).toMatch(/allowlist/);
  });

  it('rejeita campo obrigatório vazio', () => {
    const r = validarLinhas([crua(2, { titulo: '' })]);
    expect(r.ok).toBe(false);
    expect(r.erros.some((e) => /titulo é obrigatório/.test(e.mensagem))).toBe(
      true,
    );
  });

  it('rejeita codigo duplicado no arquivo apontando a linha anterior', () => {
    const r = validarLinhas([crua(2), crua(3)]);
    expect(r.ok).toBe(false);
    expect(r.erros[0].mensagem).toMatch(/duplicado.*linha 2/);
  });

  it('propaga erro de coerção de tipo com o número da linha', () => {
    const r = validarLinhas([crua(7, { ativo: 'talvez' })]);
    expect(r.ok).toBe(false);
    expect(r.erros[0].linha).toBe(7);
  });
});
