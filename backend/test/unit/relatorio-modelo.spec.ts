import { AnaliseDetalhe } from '../../src/analises/analise-detalhe';
import {
  formatarNorma,
  montarModeloRelatorio,
} from '../../src/relatorio/relatorio-modelo';

const detalhe = (): AnaliseDetalhe => ({
  id: 'a1',
  nup: 'NUP-1',
  objeto: 'Aquisição de equipamentos',
  status: 'CONCLUIDA',
  motivoErro: null,
  analistaId: 'analista-mvp',
  analistaNome: 'Analista MVP',
  iniciadaEm: new Date('2026-02-01T12:00:00Z'),
  concluidaEm: new Date('2026-02-03T15:30:00Z'),
  totalPaginasPdf: 12,
  resumo: {
    total: 3,
    conforme: 1,
    naoConforme: 1,
    naoSeAplica: 1,
    verificados: 3,
    obrigatoriosPendentes: 0,
  },
  avaliacoesPorArea: [
    {
      area: 'CHECKLIST',
      itens: [
        // vem "NAO_CONFORME primeiro" (ordem 30 antes da 10) — o modelo reordena
        {
          id: 'i2',
          requisitoId: 'r2',
          codigo: 'CHK-3',
          area: 'CHECKLIST',
          titulo: 'Requisito 3',
          descricao: 'd',
          obrigatorio: true,
          ordem: 30,
          norma: {
            lei: 'Lei 14.133/2021',
            artigo: '72',
            inciso: 'I',
            paragrafo: null,
            alinea: null,
          },
          statusSugeridoIa: 'NAO_SE_APLICA',
          statusFinal: 'NAO_CONFORME',
          verificado: true,
          comentario: 'motivo',
          paginaReferencia: 5,
        },
        {
          id: 'i1',
          requisitoId: 'r1',
          codigo: 'CHK-1',
          area: 'CHECKLIST',
          titulo: 'Requisito 1',
          descricao: 'd',
          obrigatorio: true,
          ordem: 10,
          norma: {
            lei: null,
            artigo: null,
            inciso: null,
            paragrafo: null,
            alinea: null,
          },
          statusSugeridoIa: 'NAO_SE_APLICA',
          statusFinal: 'CONFORME',
          verificado: true,
          comentario: null,
          paginaReferencia: null,
        },
      ],
    },
  ],
});

describe('formatarNorma', () => {
  it('junta só as partes presentes', () => {
    expect(
      formatarNorma({
        lei: 'Lei 14.133/2021',
        artigo: '72',
        inciso: 'I',
        paragrafo: '1º',
        alinea: 'a',
      }),
    ).toBe('Lei 14.133/2021, art. 72, inc. I, § 1º, alínea a');
  });

  it('devolve string vazia quando não há norma', () => {
    expect(
      formatarNorma({
        lei: null,
        artigo: null,
        inciso: null,
        paragrafo: null,
        alinea: null,
      }),
    ).toBe('');
  });

  it('parcial: só lei e artigo', () => {
    expect(
      formatarNorma({
        lei: 'Lei 8.666/1993',
        artigo: '3',
        inciso: null,
        paragrafo: null,
        alinea: null,
      }),
    ).toBe('Lei 8.666/1993, art. 3');
  });
});

describe('montarModeloRelatorio', () => {
  it('copia os campos de identificação, responsável, datas e resumo', () => {
    const m = montarModeloRelatorio(detalhe());
    expect(m).toMatchObject({
      nup: 'NUP-1',
      objeto: 'Aquisição de equipamentos',
      analistaId: 'analista-mvp',
      analistaNome: 'Analista MVP',
      iniciadaEm: new Date('2026-02-01T12:00:00Z'),
      concluidaEm: new Date('2026-02-03T15:30:00Z'),
    });
    expect(m.resumo.total).toBe(3);
    expect(m.resumo.naoConforme).toBe(1);
  });

  it('reordena os itens de cada área por ordem (não "não conformes primeiro")', () => {
    const m = montarModeloRelatorio(detalhe());
    expect(m.areas[0].itens.map((i) => i.codigo)).toEqual(['CHK-1', 'CHK-3']);
  });

  it('formata a norma e preserva a página de referência por linha', () => {
    const m = montarModeloRelatorio(detalhe());
    const [chk1, chk3] = m.areas[0].itens;
    expect(chk1).toEqual({
      codigo: 'CHK-1',
      titulo: 'Requisito 1',
      norma: '',
      paginaReferencia: null,
      statusFinal: 'CONFORME',
    });
    expect(chk3).toEqual({
      codigo: 'CHK-3',
      titulo: 'Requisito 3',
      norma: 'Lei 14.133/2021, art. 72, inc. I',
      paginaReferencia: 5,
      statusFinal: 'NAO_CONFORME',
    });
  });

  it('análise sem avaliações → areas vazio', () => {
    const d = detalhe();
    d.avaliacoesPorArea = [];
    expect(montarModeloRelatorio(d).areas).toEqual([]);
  });
});
