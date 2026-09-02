import type { ReactNode } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/analises/StatusBadge";
import type { AnaliseDetalhe } from "@/lib/data";
import styles from "./AnaliseHeader.module.css";

function dataLegivel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Cabeçalho da tela de análise: identificação, status e responsável. */
export function AnaliseHeader({
  detalhe,
  acao,
}: {
  detalhe: AnaliseDetalhe;
  /** RF-012 — ação global da tela (botão "Concluir análise"), ao lado do status. */
  acao?: ReactNode;
}) {
  const iniciada = dataLegivel(detalhe.iniciadaEm);
  const concluida = dataLegivel(detalhe.concluidaEm);

  return (
    <header className={styles.cabecalho}>
      <div className={styles.linhaTopo}>
        <nav className={styles.trilha} aria-label="Trilha de navegação">
          <Link href="/" className={styles.trilhaLink}>
            Lista de análises
          </Link>
          <span aria-hidden="true"> / </span>
          <span className={styles.trilhaAtual}>Análise</span>
        </nav>
        <div className={styles.acoes}>
          {acao}
          <StatusBadge status={detalhe.status} />
        </div>
      </div>

      <h1 className={styles.nup}>{detalhe.nup}</h1>
      <p className={styles.objeto}>{detalhe.objeto}</p>

      <dl className={styles.meta}>
        <div className={styles.metaItem}>
          <dt>Responsável</dt>
          <dd>{detalhe.analistaNome}</dd>
        </div>
        {iniciada && (
          <div className={styles.metaItem}>
            <dt>Iniciada em</dt>
            <dd>{iniciada}</dd>
          </div>
        )}
        {concluida && (
          <div className={styles.metaItem}>
            <dt>Concluída em</dt>
            <dd>{concluida}</dd>
          </div>
        )}
      </dl>
    </header>
  );
}
