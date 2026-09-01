import { Suspense } from "react";
import { PlusIcon } from "@/components/icons";
import type { ListarAnalisesQuery } from "@/lib/data";
import { SearchField } from "./SearchField";
import { StatusFilter } from "./StatusFilter";
import styles from "./AnalisesToolbar.module.css";

/** Barra de busca + filtro por status da listagem. */
export function AnalisesToolbar({ query }: { query: ListarAnalisesQuery }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.linhaTopo}>
        <Suspense fallback={<div className={styles.buscaFallback} aria-hidden="true" />}>
          <SearchField valorInicial={query.q} />
        </Suspense>
        {/* A criação de análises (modal "Nova análise") entra no ciclo de RF-001 (frontend). */}
        <button
          type="button"
          className={styles.novaAnalise}
          disabled
          title="A criação de análises entra no ciclo de RF-001"
        >
          <PlusIcon />
          Nova análise
        </button>
      </div>
      <Suspense fallback={null}>
        <StatusFilter selecionados={query.status} />
      </Suspense>
    </div>
  );
}
