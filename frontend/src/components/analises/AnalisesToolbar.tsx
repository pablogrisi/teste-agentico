import { Suspense } from "react";
import type { ListarAnalisesQuery } from "@/lib/data";
import { NovaAnaliseButton } from "./NovaAnaliseButton";
import { SearchField } from "./SearchField";
import { StatusFilter } from "./StatusFilter";
import styles from "./AnalisesToolbar.module.css";

/** Barra de busca + filtro por status + criação de análise. */
export function AnalisesToolbar({ query }: { query: ListarAnalisesQuery }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.linhaTopo}>
        <Suspense fallback={<div className={styles.buscaFallback} aria-hidden="true" />}>
          <SearchField valorInicial={query.q} />
        </Suspense>
        <NovaAnaliseButton />
      </div>
      <Suspense fallback={null}>
        <StatusFilter selecionados={query.status} />
      </Suspense>
    </div>
  );
}
