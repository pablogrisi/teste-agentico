"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { divergeDaIa, normaTexto, STATUS_REQUISITO_LABEL } from "@/lib/data";
import type { AvaliacaoItem } from "@/lib/data";
import { StatusBadgeRequisito } from "./StatusBadgeRequisito";
import { StatusIaResumo } from "./StatusIaResumo";
import styles from "./RequisitoItem.module.css";

const ACCENT: Record<AvaliacaoItem["statusFinal"], string> = {
  CONFORME: styles.accentSucesso,
  NAO_CONFORME: styles.accentErro,
  NAO_SE_APLICA: styles.accentNeutro,
};

/**
 * Um requisito avaliado, em acordeão.
 * Mostra o status sugerido pela IA (RF-007) e o parecer atual; com `onAlterarParecer`,
 * o bloco expandido ganha a ação "Alterar parecer" (RF-008).
 * O checkbox de "verificado" segue desabilitado (fica interativo no RF-011).
 */
export function RequisitoItem({
  item,
  onAlterarParecer,
}: {
  item: AvaliacaoItem;
  onAlterarParecer?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const detalheId = useId();
  const norma = normaTexto(item.norma);
  const diverge = divergeDaIa(item);

  return (
    <div
      className={`${styles.item} ${ACCENT[item.statusFinal]} ${aberto ? styles.aberto : ""} ${
        diverge ? styles.divergente : ""
      }`}
    >
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
              {diverge ? (
                <span className={styles.chipIa}>
                  IA: {STATUS_REQUISITO_LABEL[item.statusSugeridoIa]}
                </span>
              ) : (
                <span className={styles.marcaIa} title="Status sugerido pela IA">
                  IA
                </span>
              )}
              <StatusBadgeRequisito status={item.statusFinal} />
              <ChevronDownIcon className={styles.chevron} />
            </span>
          </button>
        </div>

        {aberto && (
          <div className={styles.detalhe} id={detalheId}>
            <StatusIaResumo item={item} />
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
            {onAlterarParecer && (
              <div className={styles.acoes}>
                <button type="button" className={styles.alterarParecer} onClick={onAlterarParecer}>
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
