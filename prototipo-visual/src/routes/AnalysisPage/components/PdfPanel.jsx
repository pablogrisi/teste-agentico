import { Link } from "react-router-dom";
import { ArrowLeft } from "@/components/icons";
import { DocumentCard } from "./DocumentCard";
import styles from "./PdfPanel.module.css";

/** Visor do PDF do processo (lado esquerdo da análise). */
export function PdfPanel({ nup, subject, document }) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Link className={styles.back} to="/" title="Voltar para a lista" aria-label="Voltar">
          <ArrowLeft />
        </Link>
        <div className={styles.info}>
          <span className={styles.label}>Nova análise</span>
          <span className={styles.docTitle}>
            NUP {nup}: {subject}
          </span>
        </div>
      </div>

      <div className={styles.viewer}>
        <div className={styles.toolbar}>
          <span className={styles.toolbarName}>{document.fileName}</span>
          <div className={styles.nav}>
            <button className={styles.navBtn} aria-label="Página anterior">
              ‹
            </button>
            <input
              className={styles.navInput}
              type="text"
              defaultValue="1"
              aria-label="Número da página"
            />
            <span className={styles.navTotal}>/ {document.totalPages}</span>
            <button className={styles.navBtn} aria-label="Próxima página">
              ›
            </button>
          </div>
        </div>

        <div className={styles.documentArea}>
          <DocumentCard nup={nup} totalPages={document.totalPages} />
        </div>
      </div>
    </div>
  );
}
