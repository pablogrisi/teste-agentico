import { Link } from "react-router-dom";
import { ArrowLeft } from "@/components/icons";
import type { AnalysisDocument } from "@/data/types";
import styles from "./PdfPanel.module.css";

interface PdfPanelProps {
  nup: string;
  subject: string;
  document: AnalysisDocument;
}

/** Visor do PDF do processo (lado esquerdo da análise). */
export function PdfPanel({ nup, subject, document }: PdfPanelProps) {
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
          <article className={styles.card}>
            <span className={styles.metaLeft}>Proc. nº {nup}</span>
            <span className={styles.metaRight}>Fl. 001 / {document.totalPages}</span>
            <div className={styles.rule} />
            <div className={styles.center}>
              <div className={styles.gov}>Governo do Estado do Ceará</div>
              <div className={styles.dept}>SECRETARIA DA SAÚDE — SESA</div>
              <div className={styles.accent} />
            </div>
            <div className={styles.number}>PROCESSO ADMINISTRATIVO Nº {nup}</div>
            <div className={styles.body}>
              GOVERNO DO ESTADO DO CEARÁ
              <br />
              SESA — SECRETARIA DA SAÚDE
              <br />
              <br />
              PREGÃO ELETRÔNICO Nº 001/2026
              <br />
              <br />
              OBJETO: Aquisição de equipamentos médico-hospitalares.
            </div>
            <div className={styles.alert}>
              <div className={styles.alertTitle}>Atenção — Inconsistência (Obs. 23)</div>
              <div className={styles.alertText}>
                Diversas folhas registram “242001.028501/2025-75” ou variações. O NUP correto é
                “{nup}”.
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
