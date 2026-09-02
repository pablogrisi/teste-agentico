"use client";

import { getAnalisesGateway } from "@/lib/data";
import styles from "./BaixarRelatorio.module.css";

/**
 * Botão "Baixar relatório" no cabeçalho de uma análise **concluída** (RF-016).
 * É um link para `GET /analises/:id/relatorio` (TSD-011 — `application/pdf`, `inline`),
 * aberto em nova aba. Sem backend real (`urlRelatorio` → `null`) fica desabilitado com um aviso.
 */
export function BaixarRelatorio({ analiseId }: { analiseId: string }) {
  const url = getAnalisesGateway().urlRelatorio(analiseId);

  if (url === null) {
    return (
      <span className={styles.raiz}>
        <span className={styles.botaoOff} aria-disabled="true">
          Baixar relatório
        </span>
        <span className={styles.aviso} role="note">
          Disponível com a tela conectada ao backend.
        </span>
      </span>
    );
  }

  return (
    <a className={styles.botao} href={url} target="_blank" rel="noopener noreferrer">
      Baixar relatório
    </a>
  );
}
