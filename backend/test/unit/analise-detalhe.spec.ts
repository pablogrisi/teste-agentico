import {
  AvaliacaoComRequisito,
  montarAnaliseDetalhe,
} from '../../src/analises/analise-detalhe';

const analise = {
  id: 'a1',
  nup: 'NUP-1',
  objeto: 'Objeto',
  status: 'PRONTA_PARA_REVISAO',
  motivoErro: null,
  iniciadaEm: new Date('2026-01-01'),
  concluidaEm: null,
} as never;

function av(over: {
  id: string;
  area: string;
  ordem: number;
  statusFinal: string;
  obrigatorio?: boolean;
  verificado?: boolean;
}): AvaliacaoComRequisito {
  return {
    id: over.id,
    analiseId: 'a1',
    requisitoId: `r-${over.id}`,
    statusSugeridoIa: over.statusFinal,
    statusFinal: over.statusFinal,
    verificado: over.verificado ?? false,
    comentario: null,
    paginaReferencia: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    requisito: {
      id: `r-${over.id}`,
      codigo: `C-${over.id}`,
      area: over.area,
      titulo: `T ${over.id}`,
      descricao: 'd',
      obrigatorio: over.obrigatorio ?? true,
      ordem: over.ordem,
      ativo: true,
      normaLei: 'Lei 14.133/2021',
      normaArtigo: '72',
      normaInciso: 'I',
      normaParagrafo: null,
      normaAlinea: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    },
  } as AvaliacaoComRequisito;
}

describe('montarAnaliseDetalhe', () => {
  it('agrupa por área (alfabética) e prioriza não conformes, depois ordem', () => {
    const d = montarAnaliseDetalhe(analise, [
      av({ id: '1', area: 'TECNICA', ordem: 10, statusFinal: 'CONFORME' }),
      av({ id: '2', area: 'CHECKLIST', ordem: 20, statusFinal: 'CONFORME' }),
      av({
        id: '3',
        area: 'CHECKLIST',
        ordem: 10,
        statusFinal: 'NAO_CONFORME',
      }),
      av({
        id: '4',
        area: 'CHECKLIST',
        ordem: 30,
        statusFinal: 'NAO_CONFORME',
      }),
    ]);

    expect(d.avaliacoesPorArea.map((g) => g.area)).toEqual([
      'CHECKLIST',
      'TECNICA',
    ]);
    // CHECKLIST: NAO_CONFORME (ordem 10, 30) antes de CONFORME (ordem 20)
    expect(d.avaliacoesPorArea[0].itens.map((i) => i.id)).toEqual([
      '3',
      '4',
      '2',
    ]);
  });

  it('monta a norma estruturada e os campos do item', () => {
    const d = montarAnaliseDetalhe(analise, [
      av({ id: '1', area: 'CHECKLIST', ordem: 10, statusFinal: 'CONFORME' }),
    ]);
    const item = d.avaliacoesPorArea[0].itens[0];
    expect(item).toMatchObject({
      id: '1',
      requisitoId: 'r-1',
      codigo: 'C-1',
      norma: {
        lei: 'Lei 14.133/2021',
        artigo: '72',
        inciso: 'I',
        paragrafo: null,
      },
      statusFinal: 'CONFORME',
      verificado: false,
    });
  });

  it('calcula o resumo', () => {
    const d = montarAnaliseDetalhe(analise, [
      av({
        id: '1',
        area: 'CHECKLIST',
        ordem: 10,
        statusFinal: 'CONFORME',
        verificado: true,
      }),
      av({
        id: '2',
        area: 'CHECKLIST',
        ordem: 20,
        statusFinal: 'NAO_CONFORME',
      }),
      av({
        id: '3',
        area: 'TECNICA',
        ordem: 10,
        statusFinal: 'NAO_SE_APLICA',
        obrigatorio: false,
      }),
      av({
        id: '4',
        area: 'TECNICA',
        ordem: 20,
        statusFinal: 'NAO_CONFORME',
        obrigatorio: true,
      }),
    ]);
    expect(d.resumo).toEqual({
      total: 4,
      conforme: 1,
      naoConforme: 2,
      naoSeAplica: 1,
      verificados: 1,
      obrigatoriosPendentes: 2, // ids 2 e 4 (obrigatórios, não verificados)
    });
  });

  it('sem avaliações → grupos vazios e resumo zerado', () => {
    const d = montarAnaliseDetalhe(analise, []);
    expect(d.avaliacoesPorArea).toEqual([]);
    expect(d.resumo).toEqual({
      total: 0,
      conforme: 0,
      naoConforme: 0,
      naoSeAplica: 0,
      verificados: 0,
      obrigatoriosPendentes: 0,
    });
  });
});
