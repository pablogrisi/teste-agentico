import { useParams } from "react-router-dom";
import { Topbar } from "@/components/Topbar/Topbar";
import { ANALYSES } from "@/data/analyses";
import { DEMO_ANALYSIS } from "@/data/analysisDetail";
import { PdfPanel } from "./components/PdfPanel";
import { AnalysisPanel } from "./components/AnalysisPanel";
import styles from "./AnalysisPage.module.css";

/** Tela de análise de um processo: visor de PDF + painel de análise. */
export function AnalysisPage() {
  const { id } = useParams<{ id: string }>();

  // Enquanto não há back-end, o conteúdo da análise é o de demonstração.
  // O cabeçalho usa o NUP/assunto da linha selecionada, quando existir.
  const summary = ANALYSES.find((a) => a.id === id);
  const nup = summary?.nup ?? DEMO_ANALYSIS.nup;
  const subject = summary?.subject ?? DEMO_ANALYSIS.subject;

  return (
    <div className={styles.app}>
      <Topbar />
      <div className={styles.content}>
        <PdfPanel nup={nup} subject={subject} document={DEMO_ANALYSIS.document} />
        <AnalysisPanel />
      </div>
    </div>
  );
}
