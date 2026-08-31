import { useEffect, useRef, useState } from "react";
import { XmarkIcon, UploadIcon, CircleCheckIcon, TrashIcon } from "@/components/icons";
import styles from "./NewAnalysisModal.module.css";

/** Formata bytes em KB/MB no padrão pt-BR (ex.: "30,4KB"). */
function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1).replace(".", ",")}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")}MB`;
}

/** Modal de criação de uma nova análise: NUP, objeto da contratação e upload. */
export function NewAnalysisModal({ open, onClose, onConfirm }) {
  const [nup, setNup] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Reinicia o formulário sempre que o modal abre.
  useEffect(() => {
    if (open) {
      setNup("");
      setSubject("");
      setFile(null);
      setDragging(false);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !submitting && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const valid = nup.trim() !== "" && subject.trim() !== "" && file !== null;

  function pickFile(files) {
    const picked = files?.[0];
    if (picked) setFile(picked);
  }

  function handleConfirm() {
    if (!valid || !file) return;
    setSubmitting(true);
    // Simula o processamento do documento antes de avançar.
    window.setTimeout(() => {
      onConfirm({ nup: nup.trim(), subject: subject.trim(), file });
    }, 2200);
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Nova análise"
      onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Nova análise</h2>
          <button
            className={styles.close}
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            disabled={submitting}
          >
            <XmarkIcon />
          </button>
        </div>

        {submitting ? (
          <div className={styles.loading} role="status" aria-live="polite">
            <span className={styles.spinner} />
            <p className={styles.loadingTitle}>Processando documento…</p>
            <p className={styles.loadingHint}>Isso pode levar alguns instantes.</p>
          </div>
        ) : (
          <>
        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="nup">
              NUP <span className={styles.required}>*</span>
            </label>
            <input
              id="nup"
              className={styles.input}
              type="text"
              value={nup}
              onChange={(e) => setNup(e.target.value)}
              placeholder="Informe o Número Único de Protocolo"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="subject">
              Objeto da contratação <span className={styles.required}>*</span>
            </label>
            <textarea
              id="subject"
              className={styles.textarea}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Material de consumo - Material farmacológico"
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>
              Arquivo <span className={styles.required}>*</span>
            </span>
            {file ? (
              <div className={styles.uploaded}>
                <div className={styles.uploadedInfo}>
                  <CircleCheckIcon className={styles.uploadedCheck} size={25} />
                  <span className={styles.uploadedText}>
                    <span className={styles.uploadedName}>{file.name}</span>
                    <span className={styles.uploadedSize}>{formatSize(file.size)}</span>
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  aria-label="Remover arquivo"
                  onClick={() => setFile(null)}
                >
                  <TrashIcon size={20} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`${styles.upload} ${dragging ? styles.uploadActive : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files);
                }}
              >
                <UploadIcon className={styles.uploadIcon} size={25} />
                <span className={styles.uploadText}>
                  <span className={styles.uploadTitle}>
                    <span className={styles.uploadLink}>Clique aqui</span> ou arraste e solte o
                    arquivo
                  </span>
                  <span className={styles.uploadHint}>
                    Arquivo em PDF e tamanho máximo de 50MB
                  </span>
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => pickFile(e.target.files)}
            />
          </div>
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
          </>
        )}
      </div>
    </div>
  );
}
