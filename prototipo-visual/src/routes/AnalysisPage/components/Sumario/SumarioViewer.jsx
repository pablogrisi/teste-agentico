import { ArrowLeft, ArrowRight } from "@/components/icons";
import { DocumentCard } from "../DocumentCard";
import styles from "./SumarioViewer.module.css";

/**
 * Visualizador do PDF na etapa de sumário. O cabeçalho do card nomeia a peça em
 * foco (`2 - Termo de Referência`), como no Figma.
 */
export function SumarioViewer({ nup, document, page, context, onPageChange }) {
  const go = (delta) =>
    onPageChange(Math.min(document.totalPages, Math.max(1, page + delta)));

  return (
    <aside className={styles.viewer}>
      <div className={styles.card}>
        <h2 className={styles.context}>{context}</h2>

        <div className={styles.toolbar}>
          <span className={styles.fileName}>{document.fileName}</span>
          <button
            className={styles.miniBtn}
            type="button"
            aria-label="Página anterior"
            onClick={() => go(-1)}
          >
            <ArrowLeft />
          </button>
          <div className={styles.pageBox}>
            <input
              className={styles.pageInput}
              value={page}
              inputMode="numeric"
              aria-label="Número da página"
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ""));
                if (n >= 1 && n <= document.totalPages) onPageChange(n);
              }}
            />
            <span className={styles.pageTotal}>/ {document.totalPages}</span>
          </div>
          <button
            className={styles.miniBtn}
            type="button"
            aria-label="Próxima página"
            onClick={() => go(1)}
          >
            <ArrowRight />
          </button>
        </div>

        <div className={styles.documentArea}>
          <DocumentCard compact nup={nup} totalPages={document.totalPages} page={page} />
        </div>
      </div>
    </aside>
  );
}
