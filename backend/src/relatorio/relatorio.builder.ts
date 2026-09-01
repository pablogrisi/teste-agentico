import PDFDocument from 'pdfkit';
import { RelatorioModelo } from './relatorio-modelo';

export const ROTULO_STATUS: Record<string, string> = {
  CONFORME: 'Conforme',
  NAO_CONFORME: 'Não conforme',
  NAO_SE_APLICA: 'Não se aplica',
};

const fmtData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

const formatarData = (d: Date | null): string => (d ? fmtData.format(d) : '—');

const rotuloStatus = (s: string): string => ROTULO_STATUS[s] ?? s;

/**
 * Renderiza o relatório PDF (RF-016) a partir do modelo. Compõe o documento com
 * `pdfkit` e resolve o `Buffer` completo quando o stream termina. Não persiste.
 */
export function renderRelatorioPdf(modelo: RelatorioModelo): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  const finalizado = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('Relatório de Análise de Conformidade', { align: 'left' });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#555')
    .text('LicIA Analisadora');
  doc.fillColor('black').moveDown();

  const linha = (rotulo: string, valor: string) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`${rotulo}: `, { continued: true })
      .font('Helvetica')
      .text(valor);
  };

  linha('NUP', modelo.nup);
  linha('Objeto', modelo.objeto);
  linha('Responsável', `${modelo.analistaNome || '—'} (${modelo.analistaId})`);
  linha('Início', formatarData(modelo.iniciadaEm));
  linha('Conclusão', formatarData(modelo.concluidaEm));

  doc.moveDown();
  doc.font('Helvetica-Bold').fontSize(13).text('Resumo');
  doc.font('Helvetica').fontSize(11);
  const r = modelo.resumo;
  doc.text(
    `Total de requisitos: ${r.total}  •  Conformes: ${r.conforme}  •  ` +
      `Não conformes: ${r.naoConforme}  •  Não se aplica: ${r.naoSeAplica}  •  ` +
      `Verificados: ${r.verificados}`,
  );

  for (const grupo of modelo.areas) {
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(13).text(`Área: ${grupo.area}`);
    doc.moveDown(0.3);

    for (const item of grupo.itens) {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`${item.codigo} — ${item.titulo}`);
      doc.font('Helvetica').fontSize(10);
      if (item.norma) doc.text(`Norma: ${item.norma}`);
      if (item.paginaReferencia !== null)
        doc.text(`Página de referência: ${item.paginaReferencia}`);
      doc.text(`Parecer: ${rotuloStatus(item.statusFinal)}`);
      doc.moveDown(0.5);
    }
  }

  doc.end();
  return finalizado;
}
