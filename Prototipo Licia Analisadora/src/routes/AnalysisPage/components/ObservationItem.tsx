import { AccordionChevron } from "@/components/icons";
import type { Observation } from "@/data/types";
import styles from "./AnalysisPanel.module.css";

interface ObservationItemProps {
  observation: Observation;
  open: boolean;
  checked: boolean;
  onToggleOpen: () => void;
  onToggleChecked: () => void;
}

/** Observação da aba Técnica (item neutro, sem situação). */
export function ObservationItem({
  observation,
  open,
  checked,
  onToggleOpen,
  onToggleChecked,
}: ObservationItemProps) {
  return (
    <div className={`${styles.item} ${styles.itemObs} ${open ? styles.itemOpen : ""}`}>
      <div className={styles.itemInner}>
        <div
          className={styles.itemHeader}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest(`.${styles.checkbox}`)) return;
            onToggleOpen();
          }}
        >
          <div className={styles.itemMain}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={checked}
              onChange={onToggleChecked}
              aria-label={observation.question}
            />
            <div className={styles.itemText}>
              <span className={styles.question}>{observation.question}</span>
            </div>
          </div>
          <AccordionChevron className={styles.chevron} />
        </div>

        {open && (
          <div className={styles.detail}>
            <div className={styles.detailRow}>
              <span className={styles.detailText}>{observation.detail}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
