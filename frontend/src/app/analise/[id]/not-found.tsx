import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import styles from "./not-found.module.css";

/** Fallback quando `abrirAnalise` devolve `404` (`AnaliseNaoEncontradaError`). */
export default function AnaliseNaoEncontrada() {
  return (
    <PageShell>
      <div className={styles.caixa} role="status">
        <p className={styles.titulo}>Análise não encontrada.</p>
        <p className={styles.texto}>Ela pode ter sido removida, ou o endereço está incorreto.</p>
        <Link href="/" className={styles.acao}>
          Voltar para a lista de análises
        </Link>
      </div>
    </PageShell>
  );
}
