import { describe, expect, it } from "vitest";
import { validarPaginaReferencia } from "@/lib/data";

describe("validarPaginaReferencia", () => {
  it("string vazia (ou só espaços) → limpar (pagina: null, sem erro)", () => {
    expect(validarPaginaReferencia("", 24)).toEqual({ pagina: null });
    expect(validarPaginaReferencia("   ", 24)).toEqual({ pagina: null });
  });

  it("inteiro no intervalo → devolve o número", () => {
    expect(validarPaginaReferencia("7", 24)).toEqual({ pagina: 7 });
    expect(validarPaginaReferencia("24", 24)).toEqual({ pagina: 24 });
  });

  it("não-inteiro ou < 1 → erro, sem enviar", () => {
    expect(validarPaginaReferencia("0", 24).erro).toBeTruthy();
    expect(validarPaginaReferencia("-3", 24).erro).toBeTruthy();
    expect(validarPaginaReferencia("2.5", 24).erro).toBeTruthy();
    expect(validarPaginaReferencia("abc", 24).erro).toBeTruthy();
    expect(validarPaginaReferencia("0", 24).pagina).toBeNull();
  });

  it("acima do total conhecido → erro citando o total", () => {
    const r = validarPaginaReferencia("30", 24);
    expect(r.pagina).toBeNull();
    expect(r.erro).toMatch(/24 páginas/);
  });

  it("total desconhecido (null) → só exige inteiro ≥ 1", () => {
    expect(validarPaginaReferencia("999", null)).toEqual({ pagina: 999 });
    expect(validarPaginaReferencia("0", null).erro).toBeTruthy();
  });
});
