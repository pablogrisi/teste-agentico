"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { normaTexto } from "@/lib/data";
import type { AvaliacaoItem } from "@/lib/data";
import { StatusBadgeRequisito } from "./StatusBadgeRequisito";
import styles from "./RequisitoItem.module.css";

const ACCENT: Record<AvaliacaoItem["statusFinal"], string> = {
  CONFORME: styles.accentSucesso,
  NAO_CONFORME: styles.accentErro,
  NAO_SE_APLICA: styles.accentNeutro,
};

/**
 * Um requisito avaliado, em acordeão — SOMENTE LEITURA nesta slice.
 * O checkbox de "verificado" aparece desabilitado (fica interativo no RF-011).
 */
export function RequisitoItem({ item }: { item: AvaliacaoItem }) {
  const [aberto, setAberto] = useState(false);
  const detalheId = useId();
  const norma = normaTexto(item.norma);

  return (
    <div className={`${styles.item} ${ACCENT[item.statusFinal]} ${aberto ? styles.aberto : ""}`}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={item.verificado}
            disabled
            readOnly
            tabIndex={-1}
            aria-label={`Verificado — disponível no RF-011 (${item.titulo})`}
          />
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-controls={detalheId}
          >
            <span className={styles.titulo}>
              {item.titulo}
              {item.obrigatorio && <span className={styles.obrigatorio}> *</span>}
            </span>
            <span className={styles.direita}>
              <StatusBadgeRequisito status={item.statusFinal} />
              <ChevronDownIcon className={styles.chevron} />
            </span>
          </button>
        </div>

        {aberto && (
          <div className={styles.detalhe} id={detalheId}>
            <p className={styles.descricao}>{item.descricao}</p>
            {norma && (
              <p className={styles.linha}>
                <span className={styles.rotulo}>Norma:</span> {norma}
              </p>
            )}
            {item.comentario && (
              <p className={styles.linha}>
                <span className={styles.rotulo}>Comentário:</span> {item.comentario}
              </p>
            )}
            <p className={styles.linha}>
              <span className={styles.rotulo}>Referência de página:</span>{" "}
              {item.paginaReferencia !== null ? (
                `Página ${item.paginaReferencia}`
              ) : (
                <span className={styles.semPagina}>não informada</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
