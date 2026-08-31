import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RequisitosService } from '../requisitos/requisitos.service';
import {
  ANALISE_IA_PORT,
  AnaliseIaPort,
  RequisitoParaIa,
} from '../core/ports/analise-ia.port';
import {
  ARMAZENAMENTO_PDF_PORT,
  ArmazenamentoPdfPort,
} from '../core/ports/armazenamento-pdf.port';
import { StatusRequisito } from '../core/domain/status-requisito';

const LOTE_VARREDURA = 20;

function comTimeout<T>(
  promessa: Promise<T>,
  ms: number,
  mensagem: string,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(mensagem)), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

@Injectable()
export class ProcessamentoService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ProcessamentoService.name);
  private readonly iaTimeoutMs: number;
  private readonly intervaloMs: number;
  private readonly auto: boolean;
  private varrendo = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly requisitos: RequisitosService,
    config: ConfigService,
    @Inject(ANALISE_IA_PORT) private readonly analiseIa: AnaliseIaPort,
    @Inject(ARMAZENAMENTO_PDF_PORT)
    private readonly armazenamentoPdf: ArmazenamentoPdfPort,
  ) {
    this.iaTimeoutMs = config.get<number>('processamento.iaTimeoutMs', 120000);
    this.intervaloMs = config.get<number>('processamento.intervaloMs', 5000);
    this.auto = config.get<boolean>('processamento.auto', true);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.auto) return;
    await this.recuperarPresas();
    void this.processarPendentes();
    this.timer = setInterval(
      () => void this.processarPendentes(),
      this.intervaloMs,
    );
    this.logger.log(`Varredura de processamento a cada ${this.intervaloMs} ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Disparo imediato de uma análise recém-criada / reenfileirada. Fire-and-forget.
   * Só age quando o processamento automático está ligado (nos testes, `false`).
   */
  disparar(analiseId: string): void {
    if (!this.auto) return;
    void this.processarUma(analiseId).catch((erro) =>
      this.logger.error(
        `Disparo de ${analiseId} falhou: ${(erro as Error).message}`,
      ),
    );
  }

  /** Devolve `PROCESSANDO` presas (crash) para `PENDENTE`. Usado no boot. */
  async recuperarPresas(): Promise<number> {
    const { count } = await this.prisma.analise.updateMany({
      where: { status: 'PROCESSANDO' },
      data: { status: 'PENDENTE' },
    });
    if (count > 0)
      this.logger.warn(`${count} análise(s) presa(s) recuperada(s)`);
    return count;
  }

  /** Processa todas as análises `PENDENTE`, uma de cada vez. */
  async processarPendentes(): Promise<void> {
    if (this.varrendo) return;
    this.varrendo = true;
    try {
      const pendentes = await this.prisma.analise.findMany({
        where: { status: 'PENDENTE' },
        orderBy: { iniciadaEm: 'asc' },
        take: LOTE_VARREDURA,
        select: { id: true },
      });
      for (const { id } of pendentes) {
        await this.processarUma(id);
      }
    } finally {
      this.varrendo = false;
    }
  }

  /**
   * Processa uma análise: claim atômico → lê PDF → carrega requisitos ativos →
   * chama a IA (com timeout) → grava uma avaliação por requisito e vai para
   * `PRONTA_PARA_REVISAO`. Qualquer falha → `ERRO_PROCESSAMENTO`.
   */
  async processarUma(analiseId: string): Promise<void> {
    const claim = await this.prisma.analise.updateMany({
      where: { id: analiseId, status: 'PENDENTE' },
      data: { status: 'PROCESSANDO' },
    });
    if (claim.count !== 1) return; // já pega por outra execução, ou não está PENDENTE

    try {
      const analise = await this.prisma.analise.findUniqueOrThrow({
        where: { id: analiseId },
        select: { id: true, arquivoPdfRef: true },
      });

      let pdf: Buffer;
      try {
        pdf = await this.armazenamentoPdf.ler(analise.arquivoPdfRef);
      } catch (erro) {
        return this.marcarErro(
          analiseId,
          `não foi possível ler o PDF de entrada: ${(erro as Error).message}`,
        );
      }

      const requisitos = await this.requisitos.listarAtivos();
      if (requisitos.length === 0) {
        return this.marcarErro(analiseId, 'base de requisitos vazia');
      }

      const entradaIa: RequisitoParaIa[] = requisitos.map((r) => ({
        requisitoId: r.id,
        codigo: r.codigo,
        titulo: r.titulo,
        descricao: r.descricao,
      }));

      let sugestoes;
      try {
        sugestoes = await comTimeout(
          this.analiseIa.analisar({ pdf, requisitos: entradaIa }),
          this.iaTimeoutMs,
          `tempo limite (${this.iaTimeoutMs} ms) excedido na análise por IA`,
        );
      } catch (erro) {
        return this.marcarErro(
          analiseId,
          `falha na análise por IA: ${(erro as Error).message}`,
        );
      }

      const porRequisito = new Map(sugestoes.map((s) => [s.requisitoId, s]));

      await this.prisma.$transaction([
        ...requisitos.map((r) => {
          const sugerido: StatusRequisito =
            porRequisito.get(r.id)?.statusSugerido ?? 'NAO_SE_APLICA';
          return this.prisma.avaliacaoRequisito.create({
            data: {
              analiseId,
              requisitoId: r.id,
              statusSugeridoIa: sugerido,
              statusFinal: sugerido,
              verificado: false,
              paginaReferencia:
                porRequisito.get(r.id)?.paginaReferencia ?? null,
            },
          });
        }),
        this.prisma.analise.update({
          where: { id: analiseId },
          data: { status: 'PRONTA_PARA_REVISAO', motivoErro: null },
        }),
      ]);

      this.logger.log(
        `Análise ${analiseId} processada: ${requisitos.length} avaliação(ões)`,
      );
    } catch (erro) {
      // Falha inesperada (ex.: transação): deixa PROCESSANDO — a varredura/boot recupera.
      this.logger.error(
        `Erro inesperado ao processar ${analiseId}: ${(erro as Error).message}`,
      );
    }
  }

  private async marcarErro(analiseId: string, motivo: string): Promise<void> {
    await this.prisma.analise.update({
      where: { id: analiseId },
      data: { status: 'ERRO_PROCESSAMENTO', motivoErro: motivo.slice(0, 500) },
    });
    this.logger.warn(`Análise ${analiseId} em ERRO_PROCESSAMENTO: ${motivo}`);
  }
}
