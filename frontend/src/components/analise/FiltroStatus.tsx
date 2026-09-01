"use client";

import { FILTRO_REQUISITO_LABEL, FILTRO_REQUISITO_OPCOES } from "@/lib/data";
import type { FiltroRequisito } from "@/lib/data";
import styles from "./FiltroStatus.module.css";

/** Cor do chip ativo por opção (padrão do protótipo `AnalysisPanel` — `.chipActive*`). */
const CLASSE_ATIVO: Record<FiltroRequisito, string> = {
  NAO_CONFORME: styles.ativoErro,
  CONFORME: styles.ativoConforme,
  NAO_SE_APLICA: styles.ativoNeutro,
  TODOS: styles.ativoTodos,
};

/** Chips de filtro por status na tela de análise (RF-009). Seleção única. */
export function FiltroStatus({
  valor,
  onChange,
}: {
  valor: FiltroRequisito;
  onChange: (filtro: FiltroRequisito) => void;
}) {
  return (
    <div className={styles.filtros} role="group" aria-label="Filtrar requisitos por status">
      {FILTRO_REQUISITO_OPCOES.map((opcao) => {
        const ativo = opcao === valor;
        return (
          <button
            key={opcao}
            type="button"
            className={`${styles.chip} ${ativo ? `${styles.chipAtivo} ${CLASSE_ATIVO[opcao]}` : ""}`}
            aria-pressed={ativo}
            onClick={() => onChange(opcao)}
          >
            {FILTRO_REQUISITO_LABEL[opcao]}
          </button>
        );
      })}
    </div>
  );
}
