"use client";

import { useEffect, useState } from "react";
import { NextPageIcon, PrevPageIcon } from "@/components/icons";
import { getAnalisesGateway } from "@/lib/data";
import styles from "./AnaliseVisor.module.css";

interface AnaliseVisorProps {
  analiseId: string;
  totalPaginas: number | null;
  pagina: number;
  onPagina: (n: number) => void;
}

function limitar(n: number, total: number | null): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  if (total !== null && n > total) return total;
  return Math.floor(n);
}

/**
 * Visor do PDF do processo (RF-014). Com backend real, um `<iframe>` do PDF inteiro
 * (`GET /analises/:id/pdf`) navegado por `#page=N`. Sem backend, um aviso + o total de páginas.
 */
export function AnaliseVisor({ analiseId, totalPaginas, pagina, onPagina }: AnaliseVisorProps) {
  const url = getAnalisesGateway().urlPdf(analiseId);
  const [campo, setCampo] = useState(String(pagina));

  useEffect(() => {
    setCampo(String(pagina));
  }, [pagina]);

  function irPara(valor: string) {
    const n = limitar(Number(valor), totalPaginas);
    setCampo(String(n));
    if (n !== pagina) onPagina(n);
  }

  if (url === null) {
    return (
      <section className={styles.painel} aria-label="Visor de PDF">
        <p className={styles.avisoTitulo}>Visor de PDF</p>
        <p className={styles.avisoTexto}>
          O visor abre o PDF do processo quando a tela está conectada ao backend (
          <code>NEXT_PUBLIC_API_BASE_URL</code>).
        </p>
        {totalPaginas !== null && (
          <p className={styles.avisoMeta}>{totalPaginas} páginas no documento.</p>
        )}
      </section>
    );
  }

  const noComeco = pagina <= 1;
  const noFim = totalPaginas !== null && pagina >= totalPaginas;

  return (
    <section className={`${styles.painel} ${styles.comFrame}`} aria-label="Visor de PDF">
      <div className={styles.toolbar}>
        <span className={styles.nome}>PDF do processo</span>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => onPagina(pagina - 1)}
            disabled={noComeco}
            aria-label="Página anterior"
          >
            <PrevPageIcon />
          </button>
          <input
            className={styles.navInput}
            type="number"
            min={1}
            max={totalPaginas ?? undefined}
            value={campo}
            onChange={(e) => setCampo(e.target.value)}
            onBlur={(e) => irPara(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") irPara((e.target as HTMLInputElement).value);
            }}
            aria-label="Número da página"
          />
          <span className={styles.navTotal}>de {totalPaginas ?? "?"}</span>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => onPagina(pagina + 1)}
            disabled={noFim}
            aria-label="Próxima página"
          >
            <NextPageIcon />
          </button>
        </div>
      </div>
      <iframe
        key={pagina}
        title="PDF do processo"
        className={styles.frame}
        src={`${url}#page=${pagina}&view=FitH`}
      />
    </section>
  );
}
