import { PageShell } from "@/components/layout/PageShell";
import styles from "./page.module.css";

/**
 * Rota `/analise/[id]` — casca da tela de análise.
 *
 * Nesta fundação é só o frame de dois painéis, na mesma disposição do protótipo: o visor de
 * PDF à esquerda (flexível) e o painel de revisão à direita (596px fixo). Abas, filtros,
 * lista de requisitos, visor real e referência de página entram nos ciclos por RF
 * (RF-010, RF-007/009, RF-008/011/017, RF-014).
 */
export default async function AnalisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <PageShell fill>
      <section className={styles.pdfPanel} aria-label="Espaço do visor de PDF">
        <p className={styles.placeholderText}>
          Casca do visor de PDF. O visor real e a referência de página clicável entram no ciclo de
          RF-014.
        </p>
      </section>

      <section className={styles.reviewPanel} aria-label="Espaço do painel de revisão">
        <p className={styles.placeholderText}>
          Casca do painel de revisão (596px). Abas Checklist/Técnica, progresso, filtros por status
          e a lista de requisitos entram nos ciclos de RF-010, RF-007, RF-009 e RF-008.
        </p>
        <p className={styles.placeholderMeta}>Análise: {id}</p>
      </section>
    </PageShell>
  );
}
