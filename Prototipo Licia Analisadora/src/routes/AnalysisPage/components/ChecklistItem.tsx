import type { MouseEvent } from "react";
import { AccordionChevron, ArrowRight, PencilIcon } from "@/components/icons";
import { STATUS_LABEL, type ChecklistItem as ChecklistItemModel } from "@/data/types";
import styles from "./AnalysisPanel.module.css";

const STATUS_CLASS: Record<ChecklistItemModel["status"], string> = {
  success: styles.itemSuccess,
  warning: styles.itemWarning,
  error: styles.itemError,
  na: styles.itemNa,
};

interface ChecklistItemProps {
  item: ChecklistItemModel;
  open: boolean;
  checked: boolean;
  onToggleOpen: () => void;
  onToggleChecked: () => void;
  onViewPages?: (pages: string) => void;
  onChangeOpinion?: () => void;
}

/** Item do checklist com acordeão, checkbox e ações. */
export function ChecklistItem({
  item,
  open,
  checked,
  onToggleOpen,
  onToggleChecked,
  onViewPages,
  onChangeOpinion,
}: ChecklistItemProps) {
  const disabled = item.status === "na";

  function handleHeaderClick(event: MouseEvent<HTMLDivElement>) {
    // Cliques no checkbox ou no link de páginas não alternam o acordeão.
    if ((event.target as HTMLElement).closest(`.${styles.checkbox}, .${styles.pages}`)) return;
    onToggleOpen();
  }

  return (
    <div
      className={`${styles.item} ${STATUS_CLASS[item.status]} ${open ? styles.itemOpen : ""}`}
    >
      <div className={styles.itemInner}>
        <div className={styles.itemHeader} onClick={handleHeaderClick}>
          <div className={styles.itemMain}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={checked}
              disabled={disabled}
              onChange={onToggleChecked}
              aria-label={item.question}
            />
            <div className={styles.itemText}>
              <span className={styles.question}>{item.question}</span>
              {item.pages && (
                <span
                  className={styles.pages}
                  onClick={() => onViewPages?.(item.pages!)}
                  role="button"
                  tabIndex={0}
                >
                  {item.pages}
                </span>
              )}
            </div>
          </div>
          <div className={styles.status}>
            <span className={styles.statusLabel}>{STATUS_LABEL[item.status]}</span>
            <AccordionChevron className={styles.chevron} />
          </div>
        </div>

        {open && (
          <div className={styles.detail}>
            <div className={styles.detailRow}>
              <span className={styles.detailText}>{item.detail}</span>
            </div>
            {item.status !== "na" && (
              <div className={styles.detailActions}>
                {item.viewLabel && (
                  <button className={styles.btnLink} onClick={() => onViewPages?.(item.pages!)}>
                    <ArrowRight />
                    {item.viewLabel}
                  </button>
                )}
                <div className={styles.spacer} />
                <button className={styles.btnEdit} onClick={onChangeOpinion}>
                  <PencilIcon size={15} />
                  Alterar parecer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
