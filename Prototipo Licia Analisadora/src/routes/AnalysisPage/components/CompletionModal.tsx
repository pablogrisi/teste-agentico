import { CheckIcon } from "@/components/icons";
import styles from "./CompletionModal.module.css";

interface CompletionModalProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
}

/** Diálogo de conclusão de etapa (não-conformes / checklist). */
export function CompletionModal({
  open,
  title,
  text,
  confirmLabel,
  onConfirm,
}: CompletionModalProps) {
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
