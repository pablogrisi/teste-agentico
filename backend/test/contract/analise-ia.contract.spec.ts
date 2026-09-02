import { AnaliseIaStubAdapter } from '../../src/core/adapters/analise-ia.stub-adapter';
import {
  AnaliseIaPort,
  RequisitoParaIa,
} from '../../src/core/ports/analise-ia.port';
import { isStatusRequisito } from '../../src/core/domain/status-requisito';

/**
 * Contrato da `AnaliseIaPort` (SDD §8): a forma da saída que o
 * `ProcessamentoService` (TSD-006) consome. Qualquer adapter — stub ou o real da
 * OpenAI (TSD-022) — precisa satisfazer isto.
 *
 * Exercitado contra o `AnaliseIaStubAdapter`. O adapter OpenAI real depende de
 * chave + rede e é coberto pelo smoke manual (TSD-022 §7.1).
 */
const REQUISITOS: RequisitoParaIa[] = [
  {
    requisitoId: 'r1',
    codigo: 'CHK-1',
    titulo: 'Requisito 1',
    descricao: 'd1',
  },
  {
    requisitoId: 'r2',
    codigo: 'CHK-2',
    titulo: 'Requisito 2',
    descricao: 'd2',
  },
];

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');

function verificarContrato(nome: string, criar: () => AnaliseIaPort) {
  describe(`AnaliseIaPort — contrato (${nome})`, () => {
    it('analisar devolve um array de sugestões no formato esperado pelo worker', async () => {
      const sugestoes = await criar().analisar({
        pdf: PDF,
        requisitos: REQUISITOS,
      });

      expect(Array.isArray(sugestoes)).toBe(true);
      const idsEntrada = new Set(REQUISITOS.map((r) => r.requisitoId));
      for (const s of sugestoes) {
        expect(typeof s.requisitoId).toBe('string');
        expect(idsEntrada.has(s.requisitoId)).toBe(true);
        expect(isStatusRequisito(s.statusSugerido)).toBe(true);
        if (s.paginaReferencia !== undefined) {
          expect(Number.isInteger(s.paginaReferencia)).toBe(true);
          expect(s.paginaReferencia).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('não inventa requisito fora da entrada', async () => {
      const sugestoes = await criar().analisar({
        pdf: PDF,
        requisitos: [REQUISITOS[0]],
      });
      for (const s of sugestoes) {
        expect(s.requisitoId).toBe('r1');
      }
    });
  });
}

verificarContrato('stub', () => new AnaliseIaStubAdapter());
