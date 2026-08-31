import { AvaliacaoRequisito } from '@prisma/client';
import { validarEResolverPatch } from '../../src/analises/revisao-requisito';

const avaliacao = (
  over: Partial<AvaliacaoRequisito> = {},
): AvaliacaoRequisito =>
  ({
    id: 'av1',
    analiseId: 'a1',
    requisitoId: 'r1',
    statusSugeridoIa: 'NAO_SE_APLICA',
    statusFinal: 'NAO_SE_APLICA',
    verificado: false,
    comentario: null,
    paginaReferencia: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...over,
  }) as AvaliacaoRequisito;

describe('validarEResolverPatch', () => {
  it('rejeita corpo sem nenhum campo', () => {
    const r = validarEResolverPatch(avaliacao(), {});
    expect(r.erros[0]).toMatch(/ao menos um campo/);
  });

  it('rejeita statusFinal fora dos 3 valores', () => {
    const r = validarEResolverPatch(avaliacao(), {
      statusFinal: 'COM_RESSALVA',
    });
    expect(r.erros[0]).toMatch(/statusFinal inválido/);
  });

  it('alterar statusFinal (≠ sugerido) exige comentário', () => {
    const r = validarEResolverPatch(avaliacao(), {
      statusFinal: 'NAO_CONFORME',
    });
    expect(r.erros[0]).toMatch(/comentário obrigatório/);
  });

  it('alterar statusFinal com comentário → grava status + verificado=true', () => {
    const r = validarEResolverPatch(avaliacao(), {
      statusFinal: 'NAO_CONFORME',
      comentario: 'evidência ausente',
    });
    expect(r.erros).toEqual([]);
    expect(r.dados).toEqual({
      statusFinal: 'NAO_CONFORME',
      verificado: true,
      comentario: 'evidência ausente',
    });
  });

  it('confirmar a sugestão (statusFinal = sugerido) não exige comentário', () => {
    const r = validarEResolverPatch(avaliacao(), {
      statusFinal: 'NAO_SE_APLICA',
      verificado: true,
    });
    expect(r.erros).toEqual([]);
    // statusFinal não muda → não entra em `dados`; verificado sim
    expect(r.dados).toEqual({ verificado: true });
  });

  it('só marcar verificado (sem tocar no status = sugerido) → ok, sem comentário', () => {
    const r = validarEResolverPatch(avaliacao(), { verificado: true });
    expect(r.erros).toEqual([]);
    expect(r.dados).toEqual({ verificado: true });
  });

  it('permite desmarcar verificado quando o status não muda', () => {
    const r = validarEResolverPatch(avaliacao({ verificado: true }), {
      verificado: false,
    });
    expect(r.erros).toEqual([]);
    expect(r.dados).toEqual({ verificado: false });
  });

  it('não deixa limpar o comentário de uma avaliação divergente da IA', () => {
    const atual = avaliacao({
      statusFinal: 'NAO_CONFORME',
      comentario: 'motivo',
      verificado: true,
    });
    const r = validarEResolverPatch(atual, { comentario: '   ' });
    expect(r.erros[0]).toMatch(/comentário obrigatório/);
  });

  it('aceita atualizar só o comentário de uma avaliação divergente', () => {
    const atual = avaliacao({
      statusFinal: 'NAO_CONFORME',
      comentario: 'motivo antigo',
    });
    const r = validarEResolverPatch(atual, { comentario: 'motivo novo' });
    expect(r.erros).toEqual([]);
    expect(r.dados).toEqual({ comentario: 'motivo novo' });
  });

  it('não gera dados quando nada muda de fato', () => {
    const r = validarEResolverPatch(avaliacao({ verificado: true }), {
      verificado: true,
    });
    expect(r.erros).toEqual([]);
    expect(r.dados).toEqual({});
  });
});
