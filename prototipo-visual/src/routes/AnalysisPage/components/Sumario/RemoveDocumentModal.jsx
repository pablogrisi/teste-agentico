import { useEffect } from "react";
import { XmarkIcon } from "@/components/icons";
import styles from "./RemoveDocumentModal.module.css";

/**
 * Confirmação antes de excluir um documento do sumário.
 *
 * Excluir não tira o documento da lista: ele volta para os não localizados e as
 * páginas viram trecho fora do escopo. O modal diz isso, porque "excluir" sugere
 * um estrago maior do que o que acontece — e porque a ação é um clique só numa
 * lixeira no meio de uma fileira de ícones.
 *
 * O foco começa no cancelar: em diálogo destrutivo, quem chega pelo teclado não
 * deve confirmar no Enter sem ler.
 */
export function RemoveDocumentModal({ doc, onClose, onConfirm }) {
  useEffect(() => {
    if (!doc) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Excluir documento"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Excluir documento</h2>
          <button className={styles.close} type="button" aria-label="Fechar" onClick={onClose}>
            <XmarkIcon />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.text}>
            Excluir <strong className={styles.doc}>{doc.name}</strong>, hoje nas páginas{" "}
            {doc.startPage}–{doc.endPage}?
          </p>
          <p className={styles.hint}>
            O documento continua na lista como não localizado, e as páginas passam a contar como
            trecho fora do escopo. Para desfazer, basta indicar as páginas de novo.
          </p>
        </div>

        <div className={styles.footer}>
          <button
            className={`${styles.btn} ${styles.cancel}`}
            type="button"
            autoFocus
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className={`${styles.btn} ${styles.confirm}`} type="button" onClick={onConfirm}>
            Excluir documento
          </button>
        </div>
      </div>
    </div>
  );
}
