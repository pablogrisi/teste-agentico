import { divergeDaIa } from "@/lib/data";
import type { AvaliacaoItem } from "@/lib/data";
import { StatusBadgeRequisito } from "./StatusBadgeRequisito";
import styles from "./StatusIaResumo.module.css";

/**
 * Bloco "Sugestão da IA / Parecer atual" do detalhe de um requisito (RF-007).
 * Enquanto o parecer não for alterado (RF-008), só a linha da IA aparece.
 */
export function StatusIaResumo({ item }: { item: AvaliacaoItem }) {
  const diverge = divergeDaIa(item);
  return (
    <div className={`${styles.bloco} ${diverge ? styles.divergente : ""}`}>
      <p className={styles.linha}>
        <span className={styles.rotulo}>Sugestão da IA:</span>
        <StatusBadgeRequisito status={item.statusSugeridoIa} />
      </p>
      {diverge && (
        <p className={styles.linha}>
          <span className={styles.rotulo}>Parecer atual:</span>
          <StatusBadgeRequisito status={item.statusFinal} />
          <span className={styles.aviso}>alterado na revisão</span>
        </p>
      )}
      {diverge && item.comentario?.trim() && (
        <p className={styles.justificativa}>
          <span className={styles.rotulo}>Justificativa da alteração:</span> {item.comentario}
        </p>
      )}
    </div>
  );
}
