"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import styles from "./SearchField.module.css";

const DEBOUNCE_MS = 350;

/** Campo de busca (NUP + objeto). Reflete `q` na URL, com debounce, voltando à página 1. */
export function SearchField({ valorInicial }: { valorInicial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [valor, setValor] = useState(valorInicial);
  const jaMontou = useRef(false);

  useEffect(() => {
    if (!jaMontou.current) {
      jaMontou.current = true;
      return;
    }
    const timer = setTimeout(() => {
      const sp = new URLSearchParams(searchParams.toString());
      const termo = valor.trim();
      if (termo) sp.set("q", termo);
      else sp.delete("q");
      sp.delete("pagina");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [valor, pathname, router, searchParams]);

  return (
    <div className={styles.campo}>
      <SearchIcon className={styles.icone} />
      <input
        className={styles.input}
        type="search"
        value={valor}
        onChange={(event) => setValor(event.target.value)}
        placeholder="Busque pelo NUP ou objeto da contratação"
        aria-label="Buscar análises por NUP ou objeto da contratação"
      />
    </div>
  );
}
