import { ConfigService } from '@nestjs/config';
import {
  ArquivoRecebido,
  ValidacaoAnaliseService,
} from '../../src/analises/validacao-analise.service';

const PDF_OK = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');

const arquivo = (over: Partial<ArquivoRecebido> = {}): ArquivoRecebido => ({
  mimetype: 'application/pdf',
  size: PDF_OK.length,
  buffer: PDF_OK,
  ...over,
});

const build = (maxBytes = 25 * 1024 * 1024) =>
  new ValidacaoAnaliseService({
    get: () => maxBytes,
  } as unknown as ConfigService);

describe('ValidacaoAnaliseService', () => {
  const service = build();

  it('aceita entrada válida', () => {
    expect(
      service.validar({
        nup: '123.456/2026-01',
        objeto: 'Aquisição',
        arquivo: arquivo(),
      }),
    ).toEqual([]);
  });

  it('exige nup e objeto', () => {
    const erros = service.validar({
      nup: '  ',
      objeto: '',
      arquivo: arquivo(),
    });
    expect(erros).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/nup é obrigatório/),
        expect.stringMatching(/objeto é obrigatório/),
      ]),
    );
  });

  it('limita o tamanho de nup e objeto', () => {
    const erros = service.validar({
      nup: 'x'.repeat(61),
      objeto: 'y'.repeat(2001),
      arquivo: arquivo(),
    });
    expect(erros.join(' ')).toMatch(/nup deve ter no máximo/);
    expect(erros.join(' ')).toMatch(/objeto deve ter no máximo/);
  });

  it('exige um arquivo', () => {
    expect(service.validar({ nup: 'a', objeto: 'b' })).toEqual([
      'arquivo PDF é obrigatório',
    ]);
  });

  it('rejeita mimetype não-PDF', () => {
    const erros = service.validar({
      nup: 'a',
      objeto: 'b',
      arquivo: arquivo({ mimetype: 'image/png' }),
    });
    expect(erros.join(' ')).toMatch(/application\/pdf/);
  });

  it('rejeita conteúdo sem a assinatura %PDF-', () => {
    const erros = service.validar({
      nup: 'a',
      objeto: 'b',
      arquivo: arquivo({ buffer: Buffer.from('isto nao e um pdf') }),
    });
    expect(erros.join(' ')).toMatch(/assinatura %PDF- ausente/);
  });

  it('rejeita arquivo acima do limite', () => {
    const svc = build(1024); // 1 KB
    const erros = svc.validar({
      nup: 'a',
      objeto: 'b',
      arquivo: arquivo({ size: 2048 }),
    });
    expect(erros.join(' ')).toMatch(/excede o limite/);
  });

  it('rejeita PDF protegido por senha (/Encrypt)', () => {
    const protegido = Buffer.concat([
      PDF_OK,
      Buffer.from('\n/Encrypt 9 0 R\n'),
    ]);
    const erros = service.validar({
      nup: 'a',
      objeto: 'b',
      arquivo: arquivo({ buffer: protegido, size: protegido.length }),
    });
    expect(erros).toContain('PDF protegido por senha não é aceito');
  });
});
