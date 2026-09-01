import { describe, expect, it } from "vitest";
import {
  ANALISE_PDF_TAMANHO_MAX_MB,
  formatarTamanho,
  validarArquivoPdf,
  validarNovaAnalise,
} from "@/lib/data";

function pdf(nome = "processo.pdf", tamanho = 1024, tipo = "application/pdf"): File {
  const file = new File(["%PDF-1.4 conteudo"], nome, { type: tipo });
  Object.defineProperty(file, "size", { value: tamanho });
  return file;
}

describe("validarArquivoPdf", () => {
  it("aceita PDF pelo mimetype dentro do limite", () => {
    expect(validarArquivoPdf(pdf())).toBeNull();
  });

  it("aceita pelo sufixo .pdf mesmo sem mimetype", () => {
    expect(validarArquivoPdf(pdf("doc.pdf", 1024, ""))).toBeNull();
  });

  it("recusa ausência de arquivo", () => {
    expect(validarArquivoPdf(null)).toMatch(/anexe o pdf/i);
  });

  it("recusa tipo diferente de PDF", () => {
    expect(validarArquivoPdf(pdf("planilha.xlsx", 1024, "application/vnd.ms-excel"))).toMatch(
      /precisa estar em pdf/i,
    );
  });

  it("recusa acima de 25 MB", () => {
    const grande = pdf("grande.pdf", (ANALISE_PDF_TAMANHO_MAX_MB + 1) * 1024 * 1024);
    expect(validarArquivoPdf(grande)).toMatch(/limite de 25 mb/i);
  });

  it("recusa arquivo vazio", () => {
    expect(validarArquivoPdf(pdf("vazio.pdf", 0))).toMatch(/vazio/i);
  });
});

describe("validarNovaAnalise", () => {
  const arquivoOk = pdf();

  it("ok quando nup, objeto e arquivo são válidos", () => {
    const r = validarNovaAnalise({
      nup: "74037.000634/2024-22",
      objeto: "Aquisição",
      arquivo: arquivoOk,
    });
    expect(r).toEqual({ ok: true, erros: {} });
  });

  it("exige nup e objeto não-vazios", () => {
    const r = validarNovaAnalise({ nup: "  ", objeto: "", arquivo: arquivoOk });
    expect(r.ok).toBe(false);
    expect(r.erros.nup).toMatch(/informe o nup/i);
    expect(r.erros.objeto).toMatch(/informe o objeto/i);
  });

  it("limita nup a 60 e objeto a 2000 caracteres", () => {
    const r = validarNovaAnalise({
      nup: "x".repeat(61),
      objeto: "y".repeat(2001),
      arquivo: arquivoOk,
    });
    expect(r.erros.nup).toMatch(/até 60/i);
    expect(r.erros.objeto).toMatch(/até 2000/i);
  });

  it("propaga o erro do arquivo", () => {
    const r = validarNovaAnalise({ nup: "n", objeto: "o", arquivo: null });
    expect(r.ok).toBe(false);
    expect(r.erros.arquivo).toBeTruthy();
  });
});

describe("formatarTamanho", () => {
  it("formata KB e MB no padrão pt-BR", () => {
    expect(formatarTamanho(31_130)).toBe("30,4 KB");
    expect(formatarTamanho(12 * 1024 * 1024)).toBe("12,0 MB");
  });
});
