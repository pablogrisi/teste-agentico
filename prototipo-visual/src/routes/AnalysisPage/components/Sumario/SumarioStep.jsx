import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@/components/icons";
import { EXPECTED_DOCUMENTS, SUMARIO_DOCUMENTS } from "@/data/sumario";
import { DocumentMap } from "./DocumentMap";
import { DocumentRow } from "./DocumentRow";
import { RemoveDocumentModal } from "./RemoveDocumentModal";
import { SumarioViewer } from "./SumarioViewer";
import styles from "./SumarioStep.module.css";
import {
  isLocated,
  isPlaced,
  overlapsById,
  parsePage,
  placeDocument,
  removeDocument,
} from "./sumarioModel";

/** Rótulo do cabeçalho do visualizador. */
function viewerLabel(doc, page) {
  if (!doc) return `Página ${page}`;
  if (doc.state === "foraEscopo") return "trecho fora do escopo";
  return doc.name;
}

/**
 * Etapa intermediária entre a criação da análise e a análise em si: o usuário
 * confere o sumário que a Licia extraiu do documento compilado.
 */
export function SumarioStep({ nup, subject, document, onConfirm }) {
  const [docs, setDocs] = useState(SUMARIO_DOCUMENTS);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  // Documento aguardando confirmação de exclusão.
  const [removingId, setRemovingId] = useState(null);
  const [page, setPage] = useState(1);

  const selected = docs.find((d) => d.id === selectedId) ?? null;
  const removing = docs.find((d) => d.id === removingId) ?? null;

  // Sem documento escolhido, o visualizador nomeia o que cobre a página aberta.
  const inView =
    selected ?? docs.find((d) => isPlaced(d) && page >= d.startPage && page <= d.endPage) ?? null;

  const located = useMemo(() => docs.filter(isLocated).length, [docs]);
  // A lista é só de documentos: os trechos fora do escopo vivem apenas no mapa.
  const listed = useMemo(() => docs.filter((d) => d.state !== "foraEscopo"), [docs]);
  // Sobreposição de páginas é avisada, não bloqueada: ver `placeDocument`.
  const overlaps = useMemo(() => overlapsById(docs), [docs]);

  function select(doc) {
    setSelectedId(doc.id);
    if (doc.startPage) setPage(doc.startPage);
  }

  function saveDocument(doc, draft) {
    const startPage = parsePage(draft.startPage, document.totalPages);
    const endPage = parsePage(draft.endPage, document.totalPages) ?? startPage;
    setDocs((current) => placeDocument(current, doc, startPage, endPage));
    // O documento entra na ordem do caderno; segui-lo evita perder de vista a
    // linha que acabou de mudar de lugar na lista.
    if (startPage !== null) {
      setSelectedId(doc.id);
      setPage(startPage);
    }
    setEditingId(null);
  }

  function remove(doc) {
    setEditingId(null);
    setRemovingId(null);
    if (selectedId === doc.id) setSelectedId(null);
    setDocs(removeDocument(docs, doc));
  }

  return (
    <div className={styles.step}>
      <header className={styles.header}>
        <div className={styles.titleLine}>
          <Link className={styles.back} to="/" title="Voltar para a lista" aria-label="Voltar">
            <ArrowLeft />
          </Link>
          <h1 className={styles.title}>Definir sumário do documento</h1>
        </div>
        <p className={styles.meta}>
          NUP {nup}: {subject}
        </p>
      </header>

      <DocumentMap
        documents={docs}
        totalPages={document.totalPages}
        selectedId={selectedId}
        currentPage={page}
        onSelect={(id) => {
          const doc = docs.find((d) => d.id === id);
          if (doc) select(doc);
        }}
        onPickPage={(target) => {
          // A página clicada manda: o documento em foco passa a ser o que a cobre.
          const doc = docs.find((d) => isPlaced(d) && target >= d.startPage && target <= d.endPage);
          setSelectedId(doc?.id ?? null);
          setPage(target);
        }}
      />

      <div className={styles.body}>
        <SumarioViewer
          nup={nup}
          document={document}
          page={page}
          context={viewerLabel(inView, page)}
          onPageChange={setPage}
        />

        <div className={styles.tablePane}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Lista de documentos</h2>

            <div className={styles.tableHead}>
              <div className={styles.colName}>DOCUMENTO</div>
              <div className={styles.colPage}>PÁG. INICIAL</div>
              <div className={styles.colPage}>PÁG. FINAL</div>
              <div className={styles.colActions}>AÇÕES</div>
            </div>

            {listed.map((doc) => (
              <DocumentRow
                key={`${doc.id}-${doc.id === editingId}`}
                doc={doc}
                editing={doc.id === editingId}
                totalPages={document.totalPages}
                overlaps={overlaps.get(doc.id)}
                onSelect={() => select(doc)}
                onEdit={() => {
                  select(doc);
                  setEditingId(doc.id);
                }}
                onSave={(draft) => saveDocument(doc, draft)}
                onCancel={() => setEditingId(null)}
                onRemove={() => setRemovingId(doc.id)}
                onGoToPage={(target) => {
                  setSelectedId(doc.id);
                  setPage(target);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <RemoveDocumentModal
        doc={removing}
        onClose={() => setRemovingId(null)}
        onConfirm={() => remove(removing)}
      />

      <footer className={styles.footer}>
        <span className={styles.progress}>
          {located} de {EXPECTED_DOCUMENTS} documentos localizados
        </span>
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnOutline}`} to="/">
            Cancelar
          </Link>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="button" onClick={onConfirm}>
            Salvar e iniciar análise
          </button>
        </div>
      </footer>
    </div>
  );
}
