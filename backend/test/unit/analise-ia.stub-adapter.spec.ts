import { AnaliseIaStubAdapter } from '../../src/core/adapters/analise-ia.stub-adapter';
import { RequisitoParaIa } from '../../src/core/ports/analise-ia.port';

describe('AnaliseIaStubAdapter', () => {
  const adapter = new AnaliseIaStubAdapter();

  const requisitos: RequisitoParaIa[] = [
    { requisitoId: 'r1', codigo: 'C-01', titulo: 'T1', descricao: 'D1' },
    { requisitoId: 'r2', codigo: 'C-02', titulo: 'T2', descricao: 'D2' },
  ];

  it('devolve uma sugestão determinística por requisito recebido', async () => {
    const sugestoes = await adapter.analisar({
      pdf: Buffer.from('%PDF-1.4 fake'),
      requisitos,
    });

    expect(sugestoes).toHaveLength(2);
    expect(sugestoes.map((s) => s.requisitoId)).toEqual(['r1', 'r2']);
    for (const sugestao of sugestoes) {
      expect(sugestao.statusSugerido).toBe('NAO_SE_APLICA');
      expect(sugestao.paginaReferencia).toBeUndefined();
    }
  });

  it('devolve lista vazia quando não há requisitos', async () => {
    const sugestoes = await adapter.analisar({
      pdf: Buffer.alloc(0),
      requisitos: [],
    });

    expect(sugestoes).toEqual([]);
  });
});
