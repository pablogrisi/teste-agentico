import { PageShell } from "@/components/layout/PageShell";
import styles from "./loading.module.css";

/** Skeleton exibido durante a navegação/carregamento das rotas. */
export default function Loading() {
  return (
    <PageShell>
      <div className={styles.barraTitulo} />
      <div className={styles.barraToolbar} />
      <div className={styles.bloco} aria-busy="true" aria-label="Carregando…" />
    </PageShell>
  );
}
