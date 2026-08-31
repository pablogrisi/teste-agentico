import { useState } from "react";
import { CheckIcon, XmarkIcon, PenToSquareIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import styles from "./DocumentRow.module.css";

/**
 * Linha da tabela de documentos (`Sumário/Linha-documento`).
 * Estados: idle, atual (em edição) e ausente.
 *
 * `editing` é a variante `atual`. Ele vem de fora, e não do `doc.state`, para o
 * documento não perder o próprio estado enquanto está sendo editado.
 *
 * A edição é só das páginas: o nome vem do sumário do processo e não é editável.
 *
 * A lista é só de documentos: os trechos fora do escopo não entram aqui, eles
 * aparecem apenas como faixa hachurada no mapa do documento.
 *
 * `overlaps` são os documentos que dividem páginas com este. A sobreposição não
 * é bloqueada — a Licia pode ter errado dos dois lados, e só o usuário sabe qual
 * intervalo corrigir —, então a linha avisa e deixa passar.
 */
export function DocumentRow({
  doc,
  editing,
  totalPages,
  overlaps = [],
  onSelect,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  onGoToPage,
}) {
  const missing = doc.state === "ausente";
  const variant = editing ? "atual" : doc.state;

  const [draft, setDraft] = useState({
    startPage: doc.startPage?.toString() ?? "",
    endPage: doc.endPage?.toString() ?? "",
  });

  return (
    <div
      className={`${styles.row} ${styles[`row_${variant}`]}`}
      onClick={onSelect}
      data-state={variant}
    >
      <div className={styles.main}>
        <div className={styles.colName}>
          <span className={styles.name}>{doc.name}</span>
        </div>

        {missing && !editing ? (
          <div className={styles.colMessage}>não localizado</div>
        ) : (
          <>
            <div className={styles.colPage}>
              {editing ? (
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={totalPages}
                  step={1}
                  value={draft.startPage}
                  autoFocus
                  aria-label="Página inicial"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDraft({ ...draft, startPage: e.target.value })}
                />
              ) : (
                <PageLink page={doc.startPage} onGoToPage={onGoToPage} />
              )}
            </div>
            <div className={styles.colPage}>
              {editing ? (
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={totalPages}
                  step={1}
                  value={draft.endPage}
                  aria-label="Página final"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDraft({ ...draft, endPage: e.target.value })}
                />
              ) : (
                <PageLink page={doc.endPage} onGoToPage={onGoToPage} />
              )}
            </div>
          </>
        )}

        <div className={styles.colActions} onClick={(e) => e.stopPropagation()}>
          {editing ? (
            <>
              <button
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                type="button"
                aria-label="Cancelar edição"
                onClick={onCancel}
              >
                <XmarkIcon />
              </button>
              <button
                className={`${styles.iconBtn} ${styles.iconBtnSuccess}`}
                type="button"
                aria-label="Salvar documento"
                onClick={() => onSave(draft)}
              >
                <CheckIcon />
              </button>
            </>
          ) : (
            <>
              {/* Remover devolve o documento aos não localizados. Quem já está lá
                não tem o que remover, e a lixeira sai da linha em vez de ficar
                desligada: metade da lista é de ausentes, e um ícone morto
                repetido dez vezes só pesa. */}
              {!missing && (
                <Tooltip label="Excluir documento">
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    type="button"
                    aria-label={`Excluir ${doc.name}`}
                    onClick={onRemove}
                  >
                    <TrashIcon />
                  </button>
                </Tooltip>
              )}
              {/* Documento sem páginas ainda não existe no caderno: a ação é
                adicioná-lo, não editar o que não tem. */}
              <Tooltip label={missing ? "Adicionar páginas" : "Editar páginas"}>
                <button
                  className={styles.iconBtn}
                  type="button"
                  aria-label={`${missing ? "Adicionar" : "Editar"} páginas de ${doc.name}`}
                  onClick={onEdit}
                >
                  {missing ? <PlusIcon /> : <PenToSquareIcon />}
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {overlaps.length > 0 && (
        <p className={styles.warning}>
          Páginas {doc.startPage}–{doc.endPage} também em{" "}
          {overlaps.map((o) => `${o.name} (${o.startPage}–${o.endPage})`).join(", ")}
        </p>
      )}
    </div>
  );
}

/** Atalho para o visualizador na página indicada. */
function PageLink({ page, onGoToPage }) {
  return (
    <Tooltip label={`Ir para a página ${page}`}>
      <button
        className={styles.page}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (page) onGoToPage(page);
        }}
      >
        {page}
      </button>
    </Tooltip>
  );
}
