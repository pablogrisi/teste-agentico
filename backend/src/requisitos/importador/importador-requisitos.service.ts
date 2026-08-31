import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseRequisitosCsv } from './parse-requisitos-csv';
import { importarRequisitos } from './importar-requisitos';
import { ImportacaoInvalidaError, ResumoImportacao } from './tipos';
import { validarLinhas } from './validar-linhas';

/**
 * Fachada injetável do importador da base de requisitos. Recebe o conteúdo de
 * um arquivo CSV (não um caminho — quem lê o arquivo é o chamador), valida e
 * grava. Ainda não há endpoint que a use (RF-006 não expõe HTTP); existe para
 * o seed e para consumidores futuros.
 */
@Injectable()
export class ImportadorRequisitosService {
  constructor(private readonly prisma: PrismaService) {}

  async importarDeCsv(conteudoCsv: string): Promise<ResumoImportacao> {
    const cruas = parseRequisitosCsv(conteudoCsv);
    const validacao = validarLinhas(cruas);
    if (!validacao.ok) {
      throw new ImportacaoInvalidaError(
        validacao.erros.map((e) => `linha ${e.linha}: ${e.mensagem}`),
      );
    }
    return importarRequisitos(this.prisma, validacao.linhas);
  }
}
