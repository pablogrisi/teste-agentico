import Link from "next/link";
import { queryParaString } from "@/lib/data";
import type { AnalisesPagina, ListarAnalisesQuery } from "@/lib/data";
import { FirstPageIcon, LastPageIcon, NextPageIcon, PrevPageIcon } from "@/components/icons";
import styles from "./Paginator.module.css";

const JANELA = 5;

function janelaDePaginas(atual: number, total: number): number[] {
  if (total <= JANELA) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  let inicio = Math.max(1, atual - Math.floor(JANELA / 2));
  const fim = Math.min(total, inicio + JANELA - 1);
  inicio = Math.max(1, fim - JANELA + 1);
  return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
}

export function Paginator({
  pagina,
  query,
}: {
  pagina: AnalisesPagina;
  query: ListarAnalisesQuery;
}) {
  const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.tamanho));
  const atual = Math.min(Math.max(pagina.pagina, 1), totalPaginas);
  const primeiro = pagina.total === 0 ? 0 : (atual - 1) * pagina.tamanho + 1;
  const ultimo = Math.min(atual * pagina.tamanho, pagina.total);

  const href = (p: number) => {
    const qs = queryParaString({ ...query, pagina: p });
    return qs ? `/?${qs}` : "/";
  };

  const paginas = janelaDePaginas(atual, totalPaginas);
  const naPrimeira = atual <= 1;
  const naUltima = atual >= totalPaginas;

  return (
    <nav className={styles.paginador} aria-label="Paginação">
      <span className={styles.info}>
        Mostrando {primeiro}–{ultimo} de {pagina.total}
      </span>

      {naPrimeira ? (
        <span className={`${styles.btn} ${styles.btnDisabled}`} aria-hidden="true">
          <FirstPageIcon />
        </span>
      ) : (
        <Link className={styles.btn} href={href(1)} aria-label="Primeira página">
          <FirstPageIcon />
        </Link>
      )}

      {naPrimeira ? (
        <span className={`${styles.btn} ${styles.btnDisabled}`} aria-hidden="true">
          <PrevPageIcon />
        </span>
      ) : (
        <Link className={styles.btn} href={href(atual - 1)} aria-label="Página anterior">
          <PrevPageIcon />
        </Link>
      )}

      {paginas.map((p) => (
        <Link
          key={p}
          className={`${styles.btn} ${p === atual ? styles.btnAtivo : ""}`}
          href={href(p)}
          aria-current={p === atual ? "page" : undefined}
          aria-label={`Página ${p}`}
        >
          {p}
        </Link>
      ))}

      {naUltima ? (
        <span className={`${styles.btn} ${styles.btnDisabled}`} aria-hidden="true">
          <NextPageIcon />
        </span>
      ) : (
        <Link className={styles.btn} href={href(atual + 1)} aria-label="Próxima página">
          <NextPageIcon />
        </Link>
      )}

      {naUltima ? (
        <span className={`${styles.btn} ${styles.btnDisabled}`} aria-hidden="true">
          <LastPageIcon />
        </span>
      ) : (
        <Link className={styles.btn} href={href(totalPaginas)} aria-label="Última página">
          <LastPageIcon />
        </Link>
      )}
    </nav>
  );
}
