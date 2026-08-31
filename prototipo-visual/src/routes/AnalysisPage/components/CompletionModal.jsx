import { CheckIcon } from "@/components/icons";
import styles from "./CompletionModal.module.css";

/** Diálogo de conclusão de etapa (não-conformes / checklist). */
export function CompletionModal({
  open,
  title,
  text,
  confirmLabel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.modal}>
        <div className={styles.icon}>
          <CheckIcon size={28} />
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.text}>{text}</p>
        <button className={styles.confirm} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
