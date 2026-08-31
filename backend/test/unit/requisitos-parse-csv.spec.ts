import {
  CsvInvalidoError,
  coercirLinha,
  parseRequisitosCsv,
} from '../../src/requisitos/importador/parse-requisitos-csv';

const CABECALHO =
  'codigo,area,titulo,descricao,obrigatorio,ordem,ativo,norma_lei,norma_artigo,norma_inciso,norma_paragrafo,norma_alinea';

describe('parseRequisitosCsv', () => {
  it('lê linhas, ignora comentários e preserva o número da linha real', () => {
    const csv = [
      '# comentário de topo',
      CABECALHO,
      'CHK-001,CHECKLIST,Título,"Descrição, com vírgula",true,10,true,Lei 14.133/2021,72,I,,',
    ].join('\n');

    const linhas = parseRequisitosCsv(csv);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].numeroLinha).toBe(3);
    expect(linhas[0].registro.codigo).toBe('CHK-001');
    expect(linhas[0].registro.descricao).toBe('Descrição, com vírgula');
  });

  it('rejeita CSV com coluna ausente', () => {
    const csv = ['codigo,area,titulo', 'CHK-001,CHECKLIST,Título'].join('\n');
    expect(() => parseRequisitosCsv(csv)).toThrow(CsvInvalidoError);
  });
});

describe('coercirLinha', () => {
  const base = {
    codigo: 'CHK-001',
    area: 'CHECKLIST',
    titulo: 'Título',
    descricao: 'Descrição',
    obrigatorio: 'true',
    ordem: '10',
    ativo: 'true',
    norma_lei: 'Lei 14.133/2021',
    norma_artigo: '72',
    norma_inciso: 'I',
    norma_paragrafo: '',
    norma_alinea: '',
  };

  it('converte tipos e transforma campos de norma vazios em null', () => {
    const { linha, erros } = coercirLinha({ numeroLinha: 2, registro: base });
    expect(erros).toEqual([]);
    expect(linha).toMatchObject({
      obrigatorio: true,
      ativo: true,
      ordem: 10,
      normaParagrafo: null,
      normaAlinea: null,
      normaArtigo: '72',
    });
  });

  it('acusa boolean e inteiro inválidos', () => {
    const { linha, erros } = coercirLinha({
      numeroLinha: 5,
      registro: { ...base, obrigatorio: 'sim', ordem: '1.5' },
    });
    expect(linha).toBeNull();
    expect(erros.join(' ')).toMatch(/obrigatorio/);
    expect(erros.join(' ')).toMatch(/ordem/);
  });
});
