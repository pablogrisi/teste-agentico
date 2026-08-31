import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ArquivoRecebido {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface EntradaAnalise {
  nup?: string;
  objeto?: string;
  arquivo?: ArquivoRecebido;
}

const NUP_MAX = 60;
const OBJETO_MAX = 2000;
const MAGIC_PDF = Buffer.from('%PDF-');

/**
 * Valida a entrada de criação de análise (RF-001/RF-004). Devolve a lista de
 * erros; vazia = ok. Não lança — quem decide o status HTTP é o chamador.
 */
@Injectable()
export class ValidacaoAnaliseService {
  private readonly pdfMaxBytes: number;

  constructor(config: ConfigService) {
    this.pdfMaxBytes =
      config.get<number>('analise.pdfTamanhoMaxBytes') ?? 25 * 1024 * 1024;
  }

  validar(entrada: EntradaAnalise): string[] {
    const erros: string[] = [];

    const nup = (entrada.nup ?? '').trim();
    if (nup === '') {
      erros.push('nup é obrigatório');
    } else if (nup.length > NUP_MAX) {
      erros.push(`nup deve ter no máximo ${NUP_MAX} caracteres`);
    }

    const objeto = (entrada.objeto ?? '').trim();
    if (objeto === '') {
      erros.push('objeto é obrigatório');
    } else if (objeto.length > OBJETO_MAX) {
      erros.push(`objeto deve ter no máximo ${OBJETO_MAX} caracteres`);
    }

    const arquivo = entrada.arquivo;
    if (!arquivo || arquivo.size === 0) {
      erros.push('arquivo PDF é obrigatório');
      return erros;
    }
    if (arquivo.mimetype !== 'application/pdf') {
      erros.push(
        `arquivo deve ser application/pdf (recebido: "${arquivo.mimetype}")`,
      );
    }
    if (!arquivo.buffer.subarray(0, MAGIC_PDF.length).equals(MAGIC_PDF)) {
      erros.push('arquivo não parece um PDF (assinatura %PDF- ausente)');
    }
    if (arquivo.size > this.pdfMaxBytes) {
      const mb = (this.pdfMaxBytes / 1024 / 1024).toFixed(0);
      erros.push(`arquivo excede o limite de ${mb} MB`);
    }
    if (this.pareceProtegido(arquivo.buffer)) {
      erros.push('PDF protegido por senha não é aceito');
    }

    return erros;
  }

  /**
   * Heurística barata: um PDF cifrado tem um dicionário `/Encrypt` no trailer.
   * Pode dar falso positivo/negativo em casos raros — suficiente para o MVP.
   */
  private pareceProtegido(buffer: Buffer): boolean {
    return buffer.includes(Buffer.from('/Encrypt'));
  }
}
