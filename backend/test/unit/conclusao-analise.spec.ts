import { AvaliacaoComRequisito } from '../../src/analises/analise-detalhe';
import { requisitosObrigatoriosPendentes } from '../../src/analises/conclusao-analise';

function av(over: {
  id: string;
  area: string;
  ordem: number;
  obrigatorio: boolean;
  verificado: boolean;
  statusFinal?: string;
}): AvaliacaoComRequisito {
  return {
    id: over.id,
    analiseId: 'a1',
    requisitoId: `r-${over.id}`,
    statusSugeridoIa: 'NAO_SE_APLICA',
    statusFinal: over.statusFinal ?? 'NAO_SE_APLICA',
    verificado: over.verificado,
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
      obrigatorio: over.obrigatorio,
      ordem: over.ordem,
      ativo: true,
      normaLei: null,
      normaArtigo: null,
      normaInciso: null,
      normaParagrafo: null,
      normaAlinea: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    },
  } as AvaliacaoComRequisito;
}

describe('requisitosObrigatoriosPendentes (RF-012)', () => {
  it('lista só os obrigatórios não verificados', () => {
    const r = requisitosObrigatoriosPendentes([
      av({
        id: '1',
        area: 'CHECKLIST',
        ordem: 10,
        obrigatorio: true,
        verificado: false,
      }),
      av({
        id: '2',
        area: 'CHECKLIST',
        ordem: 20,
        obrigatorio: true,
        verificado: true,
      }),
      av({
        id: '3',
        area: 'CHECKLIST',
        ordem: 30,
        obrigatorio: false,
        verificado: false,
      }),
    ]);
    expect(r.map((p) => p.codigo)).toEqual(['C-1']);
    expect(r[0]).toEqual({
      requisitoId: 'r-1',
      codigo: 'C-1',
      titulo: 'T 1',
      area: 'CHECKLIST',
    });
  });

  it('obrigatório NAO_SE_APLICA não verificado ainda bloqueia', () => {
    const r = requisitosObrigatoriosPendentes([
      av({
        id: '1',
        area: 'TECNICA',
        ordem: 10,
        obrigatorio: true,
        verificado: false,
        statusFinal: 'NAO_SE_APLICA',
      }),
    ]);
    expect(r).toHaveLength(1);
  });

  it('ordena por área e depois por ordem', () => {
    const r = requisitosObrigatoriosPendentes([
      av({
        id: 'b2',
        area: 'TECNICA',
        ordem: 20,
        obrigatorio: true,
        verificado: false,
      }),
      av({
        id: 'b1',
        area: 'TECNICA',
        ordem: 10,
        obrigatorio: true,
        verificado: false,
      }),
      av({
        id: 'a1',
        area: 'CHECKLIST',
        ordem: 99,
        obrigatorio: true,
        verificado: false,
      }),
    ]);
    expect(r.map((p) => p.codigo)).toEqual(['C-a1', 'C-b1', 'C-b2']);
  });

  it('tudo verificado → lista vazia', () => {
    const r = requisitosObrigatoriosPendentes([
      av({
        id: '1',
        area: 'CHECKLIST',
        ordem: 10,
        obrigatorio: true,
        verificado: true,
      }),
      av({
        id: '2',
        area: 'TECNICA',
        ordem: 10,
        obrigatorio: false,
        verificado: false,
      }),
    ]);
    expect(r).toEqual([]);
  });

  it('sem avaliações → lista vazia', () => {
    expect(requisitosObrigatoriosPendentes([])).toEqual([]);
  });
});
