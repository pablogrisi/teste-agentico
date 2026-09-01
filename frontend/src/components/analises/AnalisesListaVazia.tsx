import Link from "next/link";
import styles from "./AnalisesListaVazia.module.css";

type Variante = "sem-analises" | "sem-resultado";

/**
 * Estado vazio da listagem.
 * - `sem-analises`: o analista ainda não tem nenhuma análise (PRD §9).
 * - `sem-resultado`: há análises, mas nenhuma corresponde à busca/filtros.
 */
export function AnalisesListaVazia({ variante }: { variante: Variante }) {
  if (variante === "sem-resultado") {
    return (
      <div className={styles.caixa} role="status">
        <p className={styles.titulo}>Nenhuma análise corresponde aos filtros.</p>
        <p className={styles.texto}>
          Ajuste a busca ou os filtros de status para ver mais resultados.
        </p>
        <Link href="/" className={styles.acao}>
          Limpar busca e filtros
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.caixa} role="status">
      <p className={styles.titulo}>Você ainda não tem análises.</p>
      <p className={styles.texto}>
        Crie uma nova análise para começar a verificação de conformidade de um processo licitatório.
      </p>
    </div>
  );
}
