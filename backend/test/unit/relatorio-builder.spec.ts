import { PDFDocument } from 'pdf-lib';
import { renderRelatorioPdf } from '../../src/relatorio/relatorio.builder';
import { RelatorioModelo } from '../../src/relatorio/relatorio-modelo';

const modelo = (over: Partial<RelatorioModelo> = {}): RelatorioModelo => ({
  nup: 'NUP-1',
  objeto: 'Objeto',
  analistaId: 'analista-mvp',
  analistaNome: 'Analista MVP',
  iniciadaEm: new Date('2026-02-01T12:00:00Z'),
  concluidaEm: new Date('2026-02-03T15:30:00Z'),
  resumo: {
    total: 2,
    conforme: 1,
    naoConforme: 1,
    naoSeAplica: 0,
    verificados: 2,
    obrigatoriosPendentes: 0,
  },
  areas: [
    {
      area: 'CHECKLIST',
      itens: [
        {
          codigo: 'CHK-1',
          titulo: 'Requisito 1',
          norma: 'Lei 14.133/2021, art. 72',
          paginaReferencia: 3,
          statusFinal: 'NAO_CONFORME',
        },
        {
          codigo: 'CHK-2',
          titulo: 'Requisito 2',
          norma: '',
          paginaReferencia: null,
          statusFinal: 'CONFORME',
        },
      ],
    },
  ],
  ...over,
});

describe('renderRelatorioPdf', () => {
  it('produz um PDF válido com ao menos uma página', async () => {
    const bytes = await renderRelatorioPdf(modelo());
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('não lança para um modelo sem áreas nem conclusão', async () => {
    const bytes = await renderRelatorioPdf(
      modelo({ areas: [], concluidaEm: null }),
    );
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
