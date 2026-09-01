import { describe, expect, it } from "vitest";
import {
  isStatusAnalise,
  STATUS_ANALISE,
  STATUS_ANALISE_LABEL,
  STATUS_ANALISE_TONE,
} from "@/lib/data";

describe("status de análise", () => {
  it("tem rótulo e tom para todos os status do ciclo de vida", () => {
    for (const status of STATUS_ANALISE) {
      expect(STATUS_ANALISE_LABEL[status]).toBeTruthy();
      expect(["neutro", "info", "sucesso", "erro"]).toContain(STATUS_ANALISE_TONE[status]);
    }
  });

  it("cobre exatamente os 5 status do SDD §8", () => {
    expect([...STATUS_ANALISE].sort()).toEqual(
      ["CONCLUIDA", "ERRO_PROCESSAMENTO", "PENDENTE", "PRONTA_PARA_REVISAO", "PROCESSANDO"].sort(),
    );
  });

  it("isStatusAnalise valida a allowlist", () => {
    expect(isStatusAnalise("CONCLUIDA")).toBe(true);
    expect(isStatusAnalise("concluida")).toBe(false);
    expect(isStatusAnalise("COM_RESSALVA")).toBe(false);
  });
});
