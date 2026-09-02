import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { AutoRefreshAnalise } from "@/components/analise/AutoRefreshAnalise";
import { TelaAnalise } from "@/components/analise/TelaAnalise";
import { AnaliseNaoEncontradaError, getAnalisesGateway } from "@/lib/data";
import type { AnaliseDetalhe } from "@/lib/data";
import styles from "./page.module.css";

// Sempre reflete o estado atual (o polling client dispara `router.refresh()`).
export const dynamic = "force-dynamic";

/** Rota `/analise/[id]` — tela de análise: visor de PDF + abas Checklist/Técnica (RF-010/014). */
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
        <TelaAnalise detalhe={detalhe} />
      </div>
    </PageShell>
  );
}
