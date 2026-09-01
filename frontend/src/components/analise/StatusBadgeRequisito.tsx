import { STATUS_REQUISITO_LABEL, STATUS_REQUISITO_TONE } from "@/lib/data";
import type { StatusRequisito } from "@/lib/data";
import styles from "./StatusBadgeRequisito.module.css";

/** Badge do status de conformidade de uma avaliação de requisito (Conforme / Não conforme / Não se aplica). */
export function StatusBadgeRequisito({ status }: { status: StatusRequisito }) {
  return (
    <span className={`${styles.badge} ${styles[STATUS_REQUISITO_TONE[status]]}`}>
      {STATUS_REQUISITO_LABEL[status]}
    </span>
  );
}
