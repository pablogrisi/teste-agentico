import { PDFDocument } from 'pdf-lib';
import { contarPaginasPdf } from '../../src/analises/contar-paginas-pdf';

const pdfComPaginas = async (n: number): Promise<Buffer> => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
};

describe('contarPaginasPdf (RF-014)', () => {
  it('conta as páginas de um PDF válido', async () => {
    expect(await contarPaginasPdf(await pdfComPaginas(1))).toBe(1);
    expect(await contarPaginasPdf(await pdfComPaginas(3))).toBe(3);
    expect(await contarPaginasPdf(await pdfComPaginas(12))).toBe(12);
  });

  it('devolve null (sem lançar) para bytes que não são PDF', async () => {
    expect(await contarPaginasPdf(Buffer.from('não é um pdf'))).toBeNull();
  });

  it('devolve null para um PDF truncado / corrompido', async () => {
    const ok = await pdfComPaginas(5);
    const truncado = ok.subarray(0, Math.floor(ok.length / 2));
    expect(await contarPaginasPdf(truncado)).toBeNull();
  });

  it('devolve null para buffer vazio', async () => {
    expect(await contarPaginasPdf(Buffer.alloc(0))).toBeNull();
  });
});
