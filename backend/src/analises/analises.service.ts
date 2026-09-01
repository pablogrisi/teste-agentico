import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Analise } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessamentoService } from '../processamento/processamento.service';
import { AnalistaAtualProvider } from '../core/analista-atual/analista-atual.provider';
import {
  ARMAZENAMENTO_PDF_PORT,
  ArmazenamentoPdfPort,
} from '../core/ports/armazenamento-pdf.port';
import {
  EntradaAnalise,
  ValidacaoAnaliseService,
} from './validacao-analise.service';
import { ListarAnalisesParams } from './listar-analises.query';
import {
  AnaliseDetalhe,
  AvaliacaoItem,
  ResumoAnalise,
  calcularResumo,
  montarAnaliseDetalhe,
  toItem,
} from './analise-detalhe';
import { PatchRevisaoBody, validarEResolverPatch } from './revisao-requisito';
import { contarPaginasPdf } from './contar-paginas-pdf';
import { requisitosObrigatoriosPendentes } from './conclusao-analise';

/** Campos de uma análise numa listagem (RF-002). */
export type AnaliseResumo = Pick<
  Analise,
  'id' | 'nup' | 'objeto' | 'status' | 'iniciadaEm' | 'concluidaEm'
>;

export interface PaginaAnalises {
  itens: AnaliseResumo[];
  total: number;
  pagina: number;
  tamanho: number;
}

const CAMPOS_RESUMO = {
  id: true,
  nup: true,
  objeto: true,
  status: true,
  iniciadaEm: true,
  concluidaEm: true,
} as const;

@Injectable()
export class AnalisesService {
  private readonly logger = new Logger(AnalisesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validacao: ValidacaoAnaliseService,
    private readonly analistaAtual: AnalistaAtualProvider,
    private readonly processamento: ProcessamentoService,
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

    // RF-014: contagem best-effort — `null` não interrompe a criação.
    const totalPaginasPdf = await contarPaginasPdf(entrada.arquivo!.buffer);

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

    let analise: Analise;
    try {
      analise = await this.prisma.analise.create({
        data: {
          nup: entrada.nup!.trim(),
          objeto: entrada.objeto!.trim(),
          analistaId,
          arquivoPdfRef: ref,
          status: 'PENDENTE',
          totalPaginasPdf,
        },
      });
    } catch (erro) {
      // O PDF já foi gravado; sem `delete` na porta no MVP, fica órfão. Registra.
      this.logger.error(
        `Análise não criada após gravar o PDF (ref ${ref}, órfão): ${(erro as Error).message}`,
      );
      throw erro;
    }

    this.processamento.disparar(analise.id);
    return analise;
  }

  /** Reenfileira uma análise que ficou em `ERRO_PROCESSAMENTO`. */
  async reprocessar(id: string): Promise<Analise> {
    const analise = await this.buscarPorId(id);
    if (analise.status !== 'ERRO_PROCESSAMENTO') {
      throw new ConflictException(
        `Só é possível reprocessar uma análise em ERRO_PROCESSAMENTO (status atual: ${analise.status})`,
      );
    }
    const atualizada = await this.prisma.analise.update({
      where: { id },
      data: { status: 'PENDENTE', motivoErro: null },
    });
    this.processamento.disparar(id);
    return atualizada;
  }

  async listar(params: ListarAnalisesParams): Promise<PaginaAnalises> {
    const { analistaId } = this.analistaAtual.getAnalistaAtual();
    const { q, status, ordenarPor, ordem, pagina, tamanho } = params;

    const where = {
      analistaId,
      ...(q
        ? {
            OR: [
              { nup: { contains: q, mode: 'insensitive' as const } },
              { objeto: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(status && status.length > 0 ? { status: { in: status } } : {}),
    };

    const [itens, total] = await this.prisma.$transaction([
      this.prisma.analise.findMany({
        where,
        orderBy: { [ordenarPor]: ordem },
        skip: (pagina - 1) * tamanho,
        take: tamanho,
        select: CAMPOS_RESUMO,
      }),
      this.prisma.analise.count({ where }),
    ]);

    return { itens, total, pagina, tamanho };
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

  /** Leitura completa da análise para a tela de revisão (RF-009). */
  async abrir(id: string): Promise<AnaliseDetalhe> {
    const analise = await this.buscarPorId(id);
    const avaliacoes = await this.prisma.avaliacaoRequisito.findMany({
      where: { analiseId: id },
      include: { requisito: true },
    });
    const { nome } = this.analistaAtual.getAnalistaAtual();
    return montarAnaliseDetalhe(analise, avaliacoes, nome);
  }

  /**
   * Conclusão global da análise (RF-012/013/015). Só passa se todo requisito
   * obrigatório estiver `verificado`; senão `422` com a lista de pendentes.
   * Já `CONCLUIDA` → `200` idempotente. Fora de `PRONTA_PARA_REVISAO` → `409`.
   */
  async concluir(id: string): Promise<AnaliseDetalhe> {
    const analise = await this.buscarPorId(id);

    if (analise.status === 'CONCLUIDA') {
      return this.abrir(id);
    }
    if (analise.status !== 'PRONTA_PARA_REVISAO') {
      throw new ConflictException(
        `Só é possível concluir uma análise em revisão (status atual: ${analise.status})`,
      );
    }

    const avaliacoes = await this.prisma.avaliacaoRequisito.findMany({
      where: { analiseId: id },
      include: { requisito: true },
    });

    const pendentes = requisitosObrigatoriosPendentes(avaliacoes);
    if (pendentes.length > 0) {
      throw new UnprocessableEntityException({
        message:
          'Há requisitos obrigatórios não verificados; conclua a revisão antes de concluir a análise',
        requisitosPendentes: pendentes,
      });
    }

    // Transição atômica: só um concluir grava `concluidaEm`; um segundo
    // concorrente vê count 0 e apenas relê o estado já concluído.
    await this.prisma.analise.updateMany({
      where: { id, status: 'PRONTA_PARA_REVISAO' },
      data: { status: 'CONCLUIDA', concluidaEm: new Date() },
    });

    return this.abrir(id);
  }

  /** Revisão de um requisito: parecer final, verificado e comentário (RF-008/011/017). */
  async revisarRequisito(
    analiseId: string,
    requisitoId: string,
    body: PatchRevisaoBody,
  ): Promise<{ item: AvaliacaoItem; resumo: ResumoAnalise }> {
    const analise = await this.buscarPorId(analiseId);
    if (analise.status !== 'PRONTA_PARA_REVISAO') {
      throw new ConflictException(
        `A análise não está em revisão (status atual: ${analise.status})`,
      );
    }

    const avaliacao = await this.prisma.avaliacaoRequisito.findUnique({
      where: { analiseId_requisitoId: { analiseId, requisitoId } },
      include: { requisito: true },
    });
    if (!avaliacao) {
      throw new NotFoundException(
        `Requisito ${requisitoId} não avaliado nesta análise`,
      );
    }

    const { erros, dados } = validarEResolverPatch(
      avaliacao,
      body,
      analise.totalPaginasPdf,
    );
    if (erros.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Não foi possível salvar a revisão',
        erros,
      });
    }

    const atualizada =
      Object.keys(dados).length > 0
        ? await this.prisma.avaliacaoRequisito.update({
            where: { id: avaliacao.id },
            data: dados,
            include: { requisito: true },
          })
        : avaliacao;

    const todas = await this.prisma.avaliacaoRequisito.findMany({
      where: { analiseId },
      include: { requisito: true },
    });

    return { item: toItem(atualizada), resumo: calcularResumo(todas) };
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
