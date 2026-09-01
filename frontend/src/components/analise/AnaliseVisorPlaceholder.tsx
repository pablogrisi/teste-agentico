import styles from "./AnaliseVisorPlaceholder.module.css";

/** Espaço do visor de PDF. O visor real e a navegação por página entram no ciclo de RF-014. */
export function AnaliseVisorPlaceholder({ totalPaginas }: { totalPaginas: number | null }) {
  return (
    <section className={styles.painel} aria-label="Espaço do visor de PDF">
      <p className={styles.titulo}>Visor de PDF</p>
      <p className={styles.texto}>
        A visualização do documento e a referência de página clicável entram no ciclo de RF-014.
      </p>
      {totalPaginas !== null && <p className={styles.meta}>{totalPaginas} páginas no documento.</p>}
    </section>
  );
}
