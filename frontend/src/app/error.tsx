"use client";

import { useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import styles from "./error.module.css";

/** Fallback de erro de carregamento das rotas (PRD §9 — "Erro de carregamento"). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <div className={styles.caixa} role="alert">
        <p className={styles.titulo}>Não foi possível carregar as análises.</p>
        <p className={styles.texto}>
          Ocorreu uma falha ao buscar os dados. Verifique sua conexão e tente novamente.
        </p>
        <button type="button" className={styles.acao} onClick={() => reset()}>
          Tentar novamente
        </button>
      </div>
    </PageShell>
  );
}
