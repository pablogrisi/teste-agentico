import Link from "next/link";
import { queryParaString } from "@/lib/data";
import type { AnaliseResumo, ListarAnalisesQuery, OrdenarAnalisesPor } from "@/lib/data";
import { SortIcon } from "@/components/icons";
import { StatusBadge } from "./StatusBadge";
import styles from "./AnalisesTable.module.css";

function hrefOrdenacao(query: ListarAnalisesQuery, coluna: OrdenarAnalisesPor): string {
  const mesmaColuna = query.ordenarPor === coluna;
  const ordem = mesmaColuna && query.ordem === "asc" ? "desc" : "asc";
  const qs = queryParaString({ ...query, ordenarPor: coluna, ordem, pagina: 1 });
  return qs ? `/?${qs}` : "/";
}

function ariaSort(
  query: ListarAnalisesQuery,
  coluna: OrdenarAnalisesPor,
): "ascending" | "descending" | "none" {
  if (query.ordenarPor !== coluna) return "none";
  return query.ordem === "asc" ? "ascending" : "descending";
}

function dataLegivel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function AnalisesTable({
  itens,
  query,
}: {
  itens: AnaliseResumo[];
  query: ListarAnalisesQuery;
}) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.tabela}>
        <caption className={styles.caption}>Análises do analista atual</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.colNup} aria-sort={ariaSort(query, "nup")}>
              <Link href={hrefOrdenacao(query, "nup")} className={styles.sortLink}>
                NUP
                <SortIcon className={styles.sortIcone} />
              </Link>
            </th>
            <th scope="col" className={styles.colObjeto}>
              Objeto da contratação
            </th>
            <th scope="col" className={styles.colStatus}>
              Status
            </th>
            <th scope="col" className={styles.colData} aria-sort={ariaSort(query, "iniciadaEm")}>
              <Link href={hrefOrdenacao(query, "iniciadaEm")} className={styles.sortLink}>
                Iniciada em
                <SortIcon className={styles.sortIcone} />
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((analise) => (
            <tr key={analise.id} className={styles.linha}>
              <td className={styles.colNup}>
                <Link href={`/analise/${analise.id}`} className={styles.linkPrincipal}>
                  {analise.nup}
                </Link>
              </td>
              <td className={styles.colObjeto}>
                <span className={styles.objeto}>{analise.objeto}</span>
              </td>
              <td className={styles.colStatus}>
                <StatusBadge status={analise.status} />
              </td>
              <td className={styles.colData}>{dataLegivel(analise.iniciadaEm)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
