import { useEffect, useMemo, useState } from "react";
import { STATUS_LABEL } from "@/data/types";
import { CHECKLIST_GROUPS, CHECKLIST_VERIFIABLE_TOTAL } from "@/data/checklist";
import { OBSERVATION_GROUPS, OBSERVATIONS_TOTAL } from "@/data/tecnica";
import { ChecklistItem } from "./ChecklistItem";
import { ObservationItem } from "./ObservationItem";
import { CompletionModal } from "./CompletionModal";
import { ChangeOpinionModal, } from "./ChangeOpinionModal";
import { Toast } from "./Toast";
import styles from "./AnalysisPanel.module.css";

const FILTERS = [
  { id: "nao-conforme", label: "Não-conforme", activeClass: styles.chipActiveError },
  { id: "conforme", label: "Conforme", activeClass: styles.chipActiveConforme },
  { id: "nao-aplica", label: "Não se aplica", activeClass: styles.chipActiveNa },
  { id: "todos", label: "Todos", activeClass: styles.chipActiveTodos },
];

/** Decide se um status passa pelo filtro selecionado. */
function matchesFilter(status, filter) {
  switch (filter) {
    case "todos":
      return true;
    case "conforme":
      return status === "success" || status === "warning";
    case "nao-conforme":
      return status === "error";
    case "nao-aplica":
      return status === "na";
  }
}

const ALL_ITEMS = CHECKLIST_GROUPS.flatMap((g) => g.items);
const ERROR_IDS = ALL_ITEMS.filter((i) => i.status === "error").map((i) => i.id);
const CONFORME_IDS = ALL_ITEMS.filter(
  (i) => i.status === "success" || i.status === "warning",
).map((i) => i.id);

/** Painel de análise: abas, progresso, filtros, checklist e técnica. */
export function AnalysisPanel() {
  const [tab, setTab] = useState("checklist");
  const [filter, setFilter] = useState("nao-conforme");
  const [checked, setChecked] = useState(new Set());
  const [checkedObs, setCheckedObs] = useState(new Set());
  const [open, setOpen] = useState(new Set());

  const [modal, setModal] = useState(null);
  const [naoConformeShown, setNaoConformeShown] = useState(false);
  const [conformeShown, setConformeShown] = useState(false);

  // Pareceres alterados pelo usuário (sobrepõem status, detalhe e páginas do item).
  const [overrides, setOverrides] = useState(new Map());
  const [opinionItem, setOpinionItem] = useState(null);
  const [toast, setToast] = useState(null);

  /** Item com as alterações de parecer aplicadas (status, comentário e página). */
  const effectiveItem = (item) => {
    const ov = overrides.get(item.id);
    if (!ov) return item;
    const hasPage = ov.status !== "error" && ov.pageNumber !== "";
    const pages = hasPage ? `p. ${ov.pageNumber}` : undefined;
    return { ...item, status: ov.status, detail: ov.comment, pages, viewLabel: undefined };
  };

  const checkedCount = useMemo(
    () => ALL_ITEMS.filter((i) => i.status !== "na" && checked.has(i.id)).length,
    [checked],
  );

  // Dispara os diálogos de conclusão ao marcar todos os itens de uma etapa.
  useEffect(() => {
    if (!naoConformeShown && ERROR_IDS.length > 0 && ERROR_IDS.every((id) => checked.has(id))) {
      setNaoConformeShown(true);
      setModal("nao-conforme");
    } else if (
      !conformeShown &&
      CONFORME_IDS.length > 0 &&
      CONFORME_IDS.every((id) => checked.has(id))
    ) {
      setConformeShown(true);
      setModal("conforme");
    }
  }, [checked, naoConformeShown, conformeShown]);

  function toggle(set, id) {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  }

  const checklistBadge = ERROR_IDS.length;
  const checklistFill = (checkedCount / CHECKLIST_VERIFIABLE_TOTAL) * 100;
  const obsFill = (checkedObs.size / OBSERVATIONS_TOTAL) * 100;

  return (
    <section className={styles.panel}>
      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "checklist" ? styles.tabActive : ""}`}
          onClick={() => setTab("checklist")}
        >
          <span className={styles.tabLabel}>Checklist</span>
          <span className={styles.tabBadge}>{checklistBadge}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === "tecnica" ? styles.tabActive : ""}`}
          onClick={() => setTab("tecnica")}
        >
          <span className={styles.tabLabel}>Técnica</span>
          <span className={styles.tabBadge}>{OBSERVATIONS_TOTAL}</span>
        </button>
        <span className={`${styles.tab} ${styles.tabInactive}`}>
          <span className={styles.tabLabel}>Legislação</span>
        </span>
        <span className={`${styles.tab} ${styles.tabInactive}`}>
          <span className={styles.tabLabel}>Outros</span>
        </span>
      </nav>

      {tab === "checklist" ? (
        <>
          <div className={styles.progress}>
            <div className={styles.progressRow}>
              <span className={styles.progressLabel}>Progresso da análise</span>
              <span className={styles.progressCounter}>
                {checkedCount}/{CHECKLIST_VERIFIABLE_TOTAL} itens verificados
              </span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${checklistFill}%` }} />
            </div>
          </div>

          <div className={styles.filters}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`${styles.chip} ${
                  filter === f.id ? `${styles.chipActive} ${f.activeClass}` : ""
                }`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className={styles.list}>
            {CHECKLIST_GROUPS.map((group) => {
              const visible = group.items
                .map(effectiveItem)
                .filter((i) => matchesFilter(i.status, filter));
              if (visible.length === 0) return null;
              return (
                <div key={group.id} className={styles.group}>
                  <div className={styles.groupHeader}>
                    <span className={styles.groupLabel}>{group.label}</span>
                    <span className={styles.groupBadge}>{visible.length}</span>
                  </div>
                  <div className={styles.items}>
                    {visible.map((item) => (
                      <ChecklistItem
                        key={item.id}
                        item={item}
                        open={open.has(item.id)}
                        checked={checked.has(item.id)}
                        onToggleOpen={() => setOpen((s) => toggle(s, item.id))}
                        onToggleChecked={() => setChecked((s) => toggle(s, item.id))}
                        onChangeOpinion={() => setOpinionItem(item)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className={styles.progress}>
            <div className={styles.progressRow}>
              <span className={styles.progressLabel}>Observações analisadas</span>
              <span className={styles.progressCounter}>
                {checkedObs.size}/{OBSERVATIONS_TOTAL} observações verificadas
              </span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${obsFill}%` }} />
            </div>
          </div>

          <div className={styles.list}>
            {OBSERVATION_GROUPS.map((group) => (
              <div key={group.id} className={styles.group}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupLabel}>{group.label}</span>
                  <span className={styles.groupBadge}>{group.items.length}</span>
                </div>
                <div className={styles.items}>
                  {group.items.map((obs) => (
                    <ObservationItem
                      key={obs.id}
                      observation={obs}
                      open={open.has(obs.id)}
                      checked={checkedObs.has(obs.id)}
                      onToggleOpen={() => setOpen((s) => toggle(s, obs.id))}
                      onToggleChecked={() => setCheckedObs((s) => toggle(s, obs.id))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CompletionModal
        open={modal === "nao-conforme"}
        title="Não-conformes verificados!"
        text="Você revisou todos os itens não conformes. Avance agora para verificar os itens conformes."
        confirmLabel="Ver itens conformes"
        onConfirm={() => {
          setModal(null);
          setFilter("conforme");
        }}
      />
      <CompletionModal
        open={modal === "conforme"}
        title="Checklist concluído!"
        text="Você revisou todos os itens conformes. Avance agora para a análise técnica do processo."
        confirmLabel="Ver análise técnica"
        onConfirm={() => {
          setModal(null);
          setTab("tecnica");
        }}
      />

      <ChangeOpinionModal
        open={opinionItem !== null}
        item={opinionItem}
        onClose={() => setOpinionItem(null)}
        onConfirm={(change) => {
          if (opinionItem) {
            const id = opinionItem.id;
            setOverrides((prev) => new Map(prev).set(id, change));
            // O item migra para o novo parecer já verificado, sem trocar o
            // filtro atual — assim o usuário não perde o fluxo em que está.
            setChecked((prev) => new Set(prev).add(id));
            // Garante que o card chegue colapsado no filtro de destino.
            setOpen((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            setToast({
              id: Date.now(),
              title: "Parecer alterado com sucesso!",
              message: `O parecer do item “${opinionItem.question}” foi alterado para “${STATUS_LABEL[change.status]}”`,
            });
          }
          setOpinionItem(null);
        }}
      />

      {toast && (
        <Toast
          key={toast.id}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}
