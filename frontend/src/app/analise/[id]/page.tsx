import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { AnaliseHeader } from "@/components/analise/AnaliseHeader";
import { AnaliseVisorPlaceholder } from "@/components/analise/AnaliseVisorPlaceholder";
import { AutoRefreshAnalise } from "@/components/analise/AutoRefreshAnalise";
import { PainelRevisao } from "@/components/analise/PainelRevisao";
import { AnaliseNaoEncontradaError, getAnalisesGateway } from "@/lib/data";
import type { AnaliseDetalhe } from "@/lib/data";
import styles from "./page.module.css";

// Sempre reflete o estado atual (o polling client dispara `router.refresh()`).
export const dynamic = "force-dynamic";

/** Rota `/analise/[id]` — tela de análise: abas Checklist/Técnica + navegação livre (RF-010). */
export default async function AnalisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let detalhe: AnaliseDetalhe;
  try {
    detalhe = await getAnalisesGateway().abrirAnalise(id);
  } catch (erro) {
    if (erro instanceof AnaliseNaoEncontradaError) notFound();
    throw erro;
  }

  return (
    <PageShell fill>
      <AutoRefreshAnalise status={detalhe.status} />
      <div className={styles.coluna}>
        <AnaliseHeader detalhe={detalhe} />
        <div className={styles.paineis}>
          <AnaliseVisorPlaceholder totalPaginas={detalhe.totalPaginasPdf} />
          <PainelRevisao detalhe={detalhe} />
        </div>
      </div>
    </PageShell>
  );
}
