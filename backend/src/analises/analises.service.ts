import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Analise } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalistaAtualProvider } from '../core/analista-atual/analista-atual.provider';
import {
  ARMAZENAMENTO_PDF_PORT,
  ArmazenamentoPdfPort,
} from '../core/ports/armazenamento-pdf.port';
import {
  EntradaAnalise,
  ValidacaoAnaliseService,
} from './validacao-analise.service';

@Injectable()
export class AnalisesService {
  private readonly logger = new Logger(AnalisesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validacao: ValidacaoAnaliseService,
    private readonly analistaAtual: AnalistaAtualProvider,
    @Inject(ARMAZENAMENTO_PDF_PORT)
    private readonly armazenamentoPdf: ArmazenamentoPdfPort,
  ) {}

  async criar(entrada: EntradaAnalise): Promise<Analise> {
    const erros = this.validacao.validar(entrada);
    if (erros.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Não foi possível criar a análise',
        erros,
      });
    }

    const { analistaId } = this.analistaAtual.getAnalistaAtual();

    let ref: string;
    try {
      ref = await this.armazenamentoPdf.salvar(entrada.arquivo!.buffer);
    } catch (erro) {
      this.logger.error(
        `Falha ao persistir o PDF de entrada: ${(erro as Error).message}`,
      );
      throw new BadGatewayException(
        'Não foi possível armazenar o PDF enviado. Tente novamente.',
      );
    }

    try {
      return await this.prisma.analise.create({
        data: {
          nup: entrada.nup!.trim(),
          objeto: entrada.objeto!.trim(),
          analistaId,
          arquivoPdfRef: ref,
          status: 'PENDENTE',
        },
      });
    } catch (erro) {
      // O PDF já foi gravado; sem `delete` na porta no MVP, fica órfão. Registra.
      this.logger.error(
        `Análise não criada após gravar o PDF (ref ${ref}, órfão): ${(erro as Error).message}`,
      );
      throw erro;
    }
  }

  async buscarPorId(id: string): Promise<Analise> {
    const { analistaId } = this.analistaAtual.getAnalistaAtual();
    const analise = await this.prisma.analise.findFirst({
      where: { id, analistaId },
    });
    if (!analise) {
      throw new NotFoundException(`Análise ${id} não encontrada`);
    }
    return analise;
  }

  async lerPdf(id: string): Promise<{ bytes: Buffer; nomeArquivo: string }> {
    const analise = await this.buscarPorId(id);
    try {
      const bytes = await this.armazenamentoPdf.ler(analise.arquivoPdfRef);
      return { bytes, nomeArquivo: `analise-${analise.id}.pdf` };
    } catch (erro) {
      this.logger.warn(
        `PDF da análise ${id} (ref ${analise.arquivoPdfRef}) não pôde ser lido: ${(erro as Error).message}`,
      );
      throw new NotFoundException(`PDF da análise ${id} não encontrado`);
    }
  }
}
