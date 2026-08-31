import { useEffect, useMemo, useState } from "react";
import { XmarkIcon } from "@/components/icons";
import { STATUS_LABEL } from "@/data/types";
import styles from "./ChangeOpinionModal.module.css";

/** Pareceres oferecidos no seletor (ordem de exibição). */
const PARECER_OPTIONS = [
  { status: "success", label: "Conforme" },
  { status: "error", label: "Não-conforme" },
  { status: "na", label: "Não se aplica" },
];

const STATUS_CLASS = {
  success: styles.cardSuccess,
  warning: styles.cardWarning,
  error: styles.cardError,
  na: styles.cardNa,
};

/** Modal para alterar o parecer de um item do checklist. */
export function ChangeOpinionModal({ open, item, onClose, onConfirm }) {
  const [status, setStatus] = useState("");
  const [comment, setComment] = useState("");
  const [pageMode, setPageMode] = useState("uma");
  const [pageNumber, setPageNumber] = useState("");

  // Reinicia o formulário a cada abertura.
  useEffect(() => {
    if (open) {
      setStatus("");
      setComment("");
      setPageMode("uma");
      setPageNumber("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Não é possível alterar o parecer para o mesmo que o item já possui.
  const options = useMemo(
    () => PARECER_OPTIONS.filter((o) => o.status !== item?.status),
    [item],
  );

  if (!open || !item) return null;

  // Itens não-conformes não têm referência de páginas; o campo fica inativo.
  const pageDisabled = status === "error";
  const pageValid = pageDisabled || (pageNumber.trim() !== "" && pageMode !== "");
  const valid = status !== "" && comment.trim() !== "" && pageValid;

  function handleConfirm() {
    if (!valid) return;
    onConfirm({ status, comment: comment.trim(), pageMode, pageNumber: pageNumber.trim() });
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Alterar parecer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Alterar parecer</h2>
          <button className={styles.close} type="button" aria-label="Fechar" onClick={onClose}>
            <XmarkIcon />
          </button>
        </div>

        <div className={styles.body}>
          {/* Parecer atual (somente leitura) */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>Parecer atual</span>
              <span className={styles.sectionHint}>
                Confira o parecer atual deste item antes de editá-lo
              </span>
            </div>

            <div className={`${styles.card} ${STATUS_CLASS[item.status]}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardQuestion}>{item.question}</span>
                <span className={styles.cardStatus}>{STATUS_LABEL[item.status]}</span>
              </div>
              <div className={styles.cardBody}>{item.detail}</div>
            </div>
          </section>

          {/* Novo parecer */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>Novo parecer</span>
              <span className={styles.sectionHint}>
                Selecione o novo parecer e justifique a alteração
              </span>
            </div>

            <div className={`${styles.card} ${styles.cardNeutral}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardQuestion}>{item.question}</span>
              </div>

              <div className={styles.form}>
                <div className={`${styles.field} ${styles.fieldParecer}`}>
                  <label className={styles.label} htmlFor="parecer">
                    Parecer <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="parecer"
                    className={styles.select}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {options.map((o) => (
                      <option key={o.status} value={o.status}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="comentario">
                    Comentário <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id="comentario"
                    className={styles.textarea}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Informe comentários adicionais sobre o parecer"
                  />
                </div>

                <div className={`${styles.field} ${styles.fieldPage}`}>
                  <label className={styles.label} htmlFor="pagina">
                    Página no documento <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.pageRow}>
                    <select
                      id="pagina"
                      className={styles.select}
                      value={pageMode}
                      onChange={(e) => setPageMode(e.target.value)}
                      disabled={pageDisabled}
                    >
                      <option value="uma">Apenas uma página</option>
                      <option value="intervalo">Intervalo de páginas</option>
                    </select>
                    <div className={styles.pageNumber}>
                      <span className={styles.pageNumberLabel}>Página Nº</span>
                      <input
                        className={styles.input}
                        type="text"
                        inputMode="numeric"
                        value={pageNumber}
                        onChange={(e) => setPageNumber(e.target.value)}
                        disabled={pageDisabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.cancel}`} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`${styles.btn} ${styles.confirm}`}
            type="button"
            disabled={!valid}
            onClick={handleConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
