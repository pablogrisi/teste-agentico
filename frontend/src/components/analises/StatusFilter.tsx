"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUS_ANALISE, STATUS_ANALISE_LABEL } from "@/lib/data";
import type { StatusAnalise } from "@/lib/data";
import styles from "./StatusFilter.module.css";

/** Chips de filtro por status (multi-seleção). Reflete `status` na URL, voltando à página 1. */
export function StatusFilter({ selecionados }: { selecionados: StatusAnalise[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function alternar(status: StatusAnalise) {
    const conjunto = new Set(selecionados);
    if (conjunto.has(status)) conjunto.delete(status);
    else conjunto.add(status);

    const sp = new URLSearchParams(searchParams.toString());
    if (conjunto.size > 0) sp.set("status", [...conjunto].join(","));
    else sp.delete("status");
    sp.delete("pagina");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className={styles.grupo} role="group" aria-label="Filtrar por status">
      {STATUS_ANALISE.map((status) => {
        const ativo = selecionados.includes(status);
        return (
          <button
            key={status}
            type="button"
            className={`${styles.chip} ${ativo ? styles.chipAtivo : ""}`}
            aria-pressed={ativo}
            onClick={() => alternar(status)}
          >
            {STATUS_ANALISE_LABEL[status]}
          </button>
        );
      })}
    </div>
  );
}
