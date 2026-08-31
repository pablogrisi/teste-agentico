import { getDocumentPage, } from "@/data/documentPages";
import styles from "./DocumentCard.module.css";

function Block({ block }) {
  switch (block.kind) {
    case "heading":
      return <h3 className={styles.blockHeading}>{block.text}</h3>;
    case "paragraph":
      return <p className={styles.paragraph}>{block.text}</p>;
    case "list":
      return (
        <ul className={styles.list}>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        <table className={styles.table}>
          <thead>
            <tr>
              {block.columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "signature":
      return (
        <div className={styles.signature}>
          <div className={styles.signatureRule} />
          <div className={styles.signatureName}>{block.name}</div>
          <div className={styles.signatureRole}>{block.role}</div>
        </div>
      );
    case "alert":
      return (
        <div className={styles.alert}>
          <div className={styles.alertTitle}>{block.title}</div>
          <div className={styles.alertText}>{block.text}</div>
        </div>
      );
  }
}

/**
 * Folha do PDF renderizada no visor. O conteúdo vem de `getDocumentPage`, de
 * modo que cada página do documento compilado tem texto próprio — trocar de
 * folha muda visivelmente o que está na tela.
 */
export function DocumentCard({ nup, totalPages, page = 1, compact = false }) {
  const content = getDocumentPage(page);

  return (
    <article className={`${styles.card} ${compact ? styles.cardCompact : ""}`}>
      <span className={styles.metaLeft}>Proc. nº {nup}</span>
      <span className={styles.metaRight}>
        Fl. {String(page).padStart(3, "0")} / {totalPages}
      </span>
      <div className={styles.rule} />

      <div className={styles.gov}>Governo do Estado do Ceará</div>
      <div className={styles.dept}>SECRETARIA DA SAÚDE — SESA</div>
      <div className={styles.accent} />

      {content.pieceName && <div className={styles.context}>{content.pieceName}</div>}

      {content.title && <h2 className={styles.number}>{content.title}</h2>}

      <div className={styles.section}>{content.section}</div>

      <div className={styles.body}>
        {content.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </article>
  );
}
