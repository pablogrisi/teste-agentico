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

  describe('paginaReferencia (RF-014)', () => {
    it('corpo só com paginaReferencia não é "vazio"', () => {
      const r = validarEResolverPatch(avaliacao(), { paginaReferencia: 2 }, 10);
      expect(r.erros).toEqual([]);
      expect(r.dados).toEqual({ paginaReferencia: 2 });
    });

    it('aceita inteiro dentro do intervalo quando o total é conhecido', () => {
      const r = validarEResolverPatch(
        avaliacao(),
        { paginaReferencia: 10 },
        10,
      );
      expect(r.erros).toEqual([]);
      expect(r.dados).toEqual({ paginaReferencia: 10 });
    });

    it('rejeita página acima do total conhecido', () => {
      const r = validarEResolverPatch(
        avaliacao(),
        { paginaReferencia: 11 },
        10,
      );
      expect(r.erros[0]).toMatch(/entre 1 e 10/);
      expect(r.dados).toEqual({});
    });

    it('rejeita 0, negativo e não-inteiro', () => {
      expect(
        validarEResolverPatch(avaliacao(), { paginaReferencia: 0 }, 10).erros,
      ).toHaveLength(1);
      expect(
        validarEResolverPatch(avaliacao(), { paginaReferencia: -3 }, 10).erros,
      ).toHaveLength(1);
      expect(
        validarEResolverPatch(avaliacao(), { paginaReferencia: 2.5 }, 10).erros,
      ).toHaveLength(1);
    });

    it('rejeita tipo não numérico', () => {
      const r = validarEResolverPatch(
        avaliacao(),
        { paginaReferencia: 'x' as unknown as number },
        10,
      );
      expect(r.erros).toHaveLength(1);
    });

    it('com total desconhecido (null) aceita qualquer inteiro >= 1', () => {
      expect(
        validarEResolverPatch(avaliacao(), { paginaReferencia: 999 }, null)
          .dados,
      ).toEqual({ paginaReferencia: 999 });
      expect(
        validarEResolverPatch(avaliacao(), { paginaReferencia: 0 }, null)
          .erros[0],
      ).toMatch(/inteiro >= 1/);
    });

    it('null limpa a página', () => {
      const atual = avaliacao({ paginaReferencia: 4 });
      const r = validarEResolverPatch(atual, { paginaReferencia: null }, 10);
      expect(r.erros).toEqual([]);
      expect(r.dados).toEqual({ paginaReferencia: null });
    });

    it('não gera dados quando a página não muda', () => {
      const atual = avaliacao({ paginaReferencia: 4 });
      const r = validarEResolverPatch(atual, { paginaReferencia: 4 }, 10);
      expect(r.dados).toEqual({});
    });

    it('não dispara a regra de comentário: página isolada numa avaliação divergente com comentário já gravado', () => {
      const atual = avaliacao({
        statusFinal: 'NAO_CONFORME',
        comentario: 'motivo',
        verificado: true,
      });
      const r = validarEResolverPatch(atual, { paginaReferencia: 3 }, 10);
      expect(r.erros).toEqual([]);
      expect(r.dados).toEqual({ paginaReferencia: 3 });
    });
  });
});
