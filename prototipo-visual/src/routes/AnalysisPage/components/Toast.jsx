import { useEffect, useState } from "react";
import { CheckIcon, XmarkIcon } from "@/components/icons";
import styles from "./Toast.module.css";

/** Toast de sucesso: entra pela direita e some sozinho após `duration`. */
export function Toast({ title, message, duration = 5000, onClose }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const toLeave = window.setTimeout(() => setLeaving(true), duration);
    const toClose = window.setTimeout(onClose, duration + 300);
    return () => {
      window.clearTimeout(toLeave);
      window.clearTimeout(toClose);
    };
  }, [duration, onClose]);

  function handleClose() {
    setLeaving(true);
    window.setTimeout(onClose, 300);
  }

  return (
    <div className={`${styles.toast} ${leaving ? styles.leaving : ""}`} role="status" aria-live="polite">
      <span className={styles.bar} />
      <div className={styles.body}>
        <CheckIcon className={styles.check} size={28} />
        <div className={styles.text}>
          <p className={styles.title}>{title}</p>
          <p className={styles.message}>{message}</p>
        </div>
        <button className={styles.close} type="button" aria-label="Fechar" onClick={handleClose}>
          <XmarkIcon size={14} />
        </button>
      </div>
    </div>
  );
}
