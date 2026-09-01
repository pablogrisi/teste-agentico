import { STATUS_ANALISE_LABEL, STATUS_ANALISE_TONE } from "@/lib/data";
import type { StatusAnalise } from "@/lib/data";
import styles from "./StatusBadge.module.css";

/** Etiqueta do status de uma análise, com tom de cor por situação. */
export function StatusBadge({ status }: { status: StatusAnalise }) {
  return (
    <span className={`${styles.badge} ${styles[STATUS_ANALISE_TONE[status]]}`}>
      {STATUS_ANALISE_LABEL[status]}
    </span>
  );
}
