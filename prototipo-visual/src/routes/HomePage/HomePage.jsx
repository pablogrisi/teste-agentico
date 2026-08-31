import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Topbar } from "@/components/Topbar/Topbar";
import { NewAnalysisModal, } from "./NewAnalysisModal";
import {
  SearchIcon,
  PlusIcon,
  FilterIcon,
  SortIcon,
  FirstPage,
  PrevPage,
  NextPage,
  LastPage,
  ChevronDownSmall,
} from "@/components/icons";
import { ANALYSES, ANALYSES_PAGE_SIZE, ANALYSES_TOTAL } from "@/data/analyses";
import styles from "./HomePage.module.css";

const COLUMNS = [
  { key: "nup", label: "NUP", className: styles.colNup },
  { key: "subject", label: "Objeto da contratação", className: styles.colSubject },
  { key: "date", label: "Adicionado em", className: styles.colDate },
  { key: "addedBy", label: "Adicionado por", className: styles.colAddedBy },
];

const PAGES = [1, 2, 3, 4, 5];
const CURRENT_PAGE = 1;
const rangeEnd = Math.min(ANALYSES_PAGE_SIZE, ANALYSES_TOTAL);

/** Página inicial: lista de análises. */
export function HomePage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  // Sem back-end: a nova análise abre a tela de demonstração.
  function handleCreate(_data) {
    setModalOpen(false);
    navigate("/analise/nova");
  }

  return (
    <div className={styles.app}>
      <Topbar />

      <main className={styles.page}>
        <div className={styles.head}>
          <div className={styles.titleBlock}>
            <Link className={styles.breadcrumb} to="/">
              Início
            </Link>
            <h1 className={styles.title}>Lista de análises</h1>
          </div>

          <div className={styles.actions}>
            <div className={styles.search}>
              <SearchIcon className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Busque pelo NUP ou objeto da contratação"
                aria-label="Busca por NUP ou objeto da contratação"
              />
            </div>
            <button className={styles.filterBtn} type="button">
              <FilterIcon />
              Filtros
            </button>
            <div className={styles.actionsEnd}>
              <button className={styles.newBtn} type="button" onClick={() => setModalOpen(true)}>
                <PlusIcon />
                Nova análise
              </button>
            </div>
          </div>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHead}>
            {COLUMNS.map((col) => (
              <div key={col.key} className={col.className}>
                <span className={styles.th}>
                  {col.label}
                  <SortIcon className={styles.thSort} />
                </span>
              </div>
            ))}
          </div>

          {ANALYSES.map((analysis) => (
            <Link key={analysis.id} className={styles.row} to={`/analise/${analysis.id}`}>
              <div className={`${styles.colNup} ${styles.cell}`}>{analysis.nup}</div>
              <div className={`${styles.colSubject} ${styles.cell} ${styles.cellSubject}`}>
                {analysis.subject}
              </div>
              <div className={`${styles.colDate} ${styles.cell}`}>{analysis.addedAt}</div>
              <div className={`${styles.colAddedBy} ${styles.cell}`}>{analysis.addedBy}</div>
            </Link>
          ))}
        </div>

        <nav className={styles.paginator} aria-label="Paginação">
          <span className={styles.paginatorInfo}>
            Mostrando resultados {1}-{rangeEnd} de {ANALYSES_TOTAL}
          </span>
          <button className={styles.pgBtn} aria-label="Primeira página">
            <FirstPage />
          </button>
          <button className={styles.pgBtn} aria-label="Página anterior">
            <PrevPage />
          </button>
          {PAGES.map((page) => (
            <button
              key={page}
              className={`${styles.pgBtn} ${page === CURRENT_PAGE ? styles.pgBtnActive : ""}`}
              aria-current={page === CURRENT_PAGE ? "page" : undefined}
            >
              {page}
            </button>
          ))}
          <button className={styles.pgBtn} aria-label="Próxima página">
            <NextPage />
          </button>
          <button className={styles.pgBtn} aria-label="Última página">
            <LastPage />
          </button>
          <button className={styles.pgSize}>
            {ANALYSES_PAGE_SIZE}
            <ChevronDownSmall />
          </button>
        </nav>
      </main>

      <NewAnalysisModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleCreate}
      />
    </div>
  );
}
