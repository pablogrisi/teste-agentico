import { UnprocessableEntityException } from '@nestjs/common';
import { parseListarAnalisesQuery } from '../../src/analises/listar-analises.query';

describe('parseListarAnalisesQuery', () => {
  it('aplica os defaults quando a query vem vazia', () => {
    expect(parseListarAnalisesQuery({})).toEqual({
      q: undefined,
      status: undefined,
      ordenarPor: 'iniciadaEm',
      ordem: 'desc',
      pagina: 1,
      tamanho: 20,
    });
  });

  it('normaliza q e faz split de status por vírgula', () => {
    const p = parseListarAnalisesQuery({
      q: '  edital  ',
      status: 'PENDENTE, CONCLUIDA',
    });
    expect(p.q).toBe('edital');
    expect(p.status).toEqual(['PENDENTE', 'CONCLUIDA']);
  });

  it('aceita o parâmetro repetido (Express entrega array)', () => {
    const p = parseListarAnalisesQuery({
      status: ['PENDENTE', 'CONCLUIDA'],
    });
    expect(p.status).toEqual(['PENDENTE', 'CONCLUIDA']);
  });

  it('rejeita status fora de STATUS_ANALISE', () => {
    expect(() =>
      parseListarAnalisesQuery({ status: 'PENDENTE,INVALIDO' }),
    ).toThrow(UnprocessableEntityException);
  });

  it('rejeita ordenarPor e ordem inválidos', () => {
    expect(() => parseListarAnalisesQuery({ ordenarPor: 'objeto' })).toThrow(
      UnprocessableEntityException,
    );
    expect(() => parseListarAnalisesQuery({ ordem: 'crescente' })).toThrow(
      UnprocessableEntityException,
    );
  });

  it('rejeita pagina < 1 e não-inteira', () => {
    expect(() => parseListarAnalisesQuery({ pagina: '0' })).toThrow(
      UnprocessableEntityException,
    );
    expect(() => parseListarAnalisesQuery({ pagina: '1.5' })).toThrow(
      UnprocessableEntityException,
    );
  });

  it('rejeita tamanho fora de 1..100', () => {
    expect(() => parseListarAnalisesQuery({ tamanho: '0' })).toThrow(
      UnprocessableEntityException,
    );
    expect(() => parseListarAnalisesQuery({ tamanho: '101' })).toThrow(
      UnprocessableEntityException,
    );
  });

  it('aceita valores válidos não-default', () => {
    expect(
      parseListarAnalisesQuery({
        ordenarPor: 'nup',
        ordem: 'asc',
        pagina: '3',
        tamanho: '50',
      }),
    ).toMatchObject({
      ordenarPor: 'nup',
      ordem: 'asc',
      pagina: 3,
      tamanho: 50,
    });
  });
});
