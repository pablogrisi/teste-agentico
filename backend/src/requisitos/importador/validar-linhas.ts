import { isAreaConhecida } from '../areas';
import { coercirLinha, LinhaCrua } from './parse-requisitos-csv';
import { ErroLinha, LinhaRequisito } from './tipos';

export interface ResultadoValidacao {
  ok: boolean;
  linhas: LinhaRequisito[];
  erros: ErroLinha[];
}

/**
 * Valida todas as linhas cruas. Acumula erros com o número da linha; a
 * importação só prossegue se `ok === true` (nenhum erro).
 */
export function validarLinhas(cruas: LinhaCrua[]): ResultadoValidacao {
  const erros: ErroLinha[] = [];
  const linhas: LinhaRequisito[] = [];
  const codigosVistos = new Map<string, number>();

  for (const crua of cruas) {
    const { numeroLinha } = crua;
    const { linha, erros: errosCoercao } = coercirLinha(crua);

    for (const mensagem of errosCoercao) {
      erros.push({ linha: numeroLinha, mensagem });
    }
    if (!linha) continue;

    const obrig = (campo: string, valor: string) => {
      if (valor === '') {
        erros.push({ linha: numeroLinha, mensagem: `${campo} é obrigatório` });
      }
    };
    obrig('codigo', linha.codigo);
    obrig('titulo', linha.titulo);
    obrig('descricao', linha.descricao);
    obrig('area', linha.area);

    if (linha.area !== '' && !isAreaConhecida(linha.area)) {
      erros.push({
        linha: numeroLinha,
        mensagem: `area "${linha.area}" não está na allowlist (src/requisitos/areas.ts). Adicione-a lá se for legítima.`,
      });
    }

    if (linha.codigo !== '') {
      const anterior = codigosVistos.get(linha.codigo);
      if (anterior !== undefined) {
        erros.push({
          linha: numeroLinha,
          mensagem: `codigo "${linha.codigo}" duplicado no arquivo (já apareceu na linha ${anterior})`,
        });
      } else {
        codigosVistos.set(linha.codigo, numeroLinha);
      }
    }

    linhas.push(linha);
  }

  return { ok: erros.length === 0, linhas, erros };
}
