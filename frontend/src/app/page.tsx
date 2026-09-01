import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { AnalisesListaVazia } from "@/components/analises/AnalisesListaVazia";
import { AnalisesTable } from "@/components/analises/AnalisesTable";
import { AnalisesToolbar } from "@/components/analises/AnalisesToolbar";
import { Paginator } from "@/components/analises/Paginator";
import { getAnalisesGateway, parseListarAnalisesQuery, queryParaString } from "@/lib/data";
import type { ParamsBrutos } from "@/lib/data";
import styles from "./page.module.css";

// Sempre reflete o estado atual (querystring + fonte de dados).
export const dynamic = "force-dynamic";

/** Rota `/` — listagem das análises do analista (RF-002). */
export default async function HomePage({ searchParams }: { searchParams: Promise<ParamsBrutos> }) {
  const query = parseListarAnalisesQuery(await searchParams);
  const pagina = await getAnalisesGateway().listarAnalises(query);

  const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.tamanho));
  if (pagina.total > 0 && query.pagina > totalPaginas) {
    const qs = queryParaString({ ...query, pagina: totalPaginas });
    redirect(qs ? `/?${qs}` : "/");
  }

  const temFiltro = query.q !== "" || query.status.length > 0;

  return (
    <PageShell>
      <header className={styles.head}>
        <p className={styles.breadcrumb}>Início</p>
        <h1 className={styles.title}>Lista de análises</h1>
      </header>

      <AnalisesToolbar query={query} />

      {pagina.total === 0 ? (
        <AnalisesListaVazia variante={temFiltro ? "sem-resultado" : "sem-analises"} />
      ) : (
        <>
          <AnalisesTable itens={pagina.itens} query={query} />
          <Paginator pagina={pagina} query={query} />
        </>
      )}
    </PageShell>
  );
}
