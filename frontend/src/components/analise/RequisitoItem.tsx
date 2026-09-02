"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import {
  AnaliseValidacaoError,
  divergeDaIa,
  normaTexto,
  PAGINA_REFERENCIA_VAZIO,
  STATUS_REQUISITO_LABEL,
  validarPaginaReferencia,
} from "@/lib/data";
import type { AvaliacaoItem } from "@/lib/data";
import { StatusBadgeRequisito } from "./StatusBadgeRequisito";
import { StatusIaResumo } from "./StatusIaResumo";
import styles from "./RequisitoItem.module.css";

const ACCENT: Record<AvaliacaoItem["statusFinal"], string> = {
  CONFORME: styles.accentSucesso,
  NAO_CONFORME: styles.accentErro,
  NAO_SE_APLICA: styles.accentNeutro,
};

const ERRO_GENERICO = "Não foi possível salvar. Tente de novo.";

function mensagemErro(erro: unknown): string {
  return erro instanceof AnaliseValidacaoError ? (erro.motivos[0] ?? ERRO_GENERICO) : ERRO_GENERICO;
}

/**
 * Um requisito avaliado, em acordeão.
 * RF-007: status sugerido pela IA. RF-008: `onAlterarParecer` → ação "Alterar parecer".
 * RF-011: `onToggleVerificado` → checkbox operável. RF-014: `onIrParaPagina` torna a
 * referência de página clicável (leva ao visor) e `onCorrigirPagina` abre o editor inline.
 */
export function RequisitoItem({
  item,
  totalPaginas = null,
  onAlterarParecer,
  onToggleVerificado,
  onIrParaPagina,
  onCorrigirPagina,
}: {
  item: AvaliacaoItem;
  totalPaginas?: number | null;
  onAlterarParecer?: () => void;
  onToggleVerificado?: (verificado: boolean) => Promise<void>;
  onIrParaPagina?: (n: number) => void;
  onCorrigirPagina?: (pagina: number | null) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroToggle, setErroToggle] = useState<string | null>(null);
  const detalheId = useId();
  const norma = normaTexto(item.norma);
  const diverge = divergeDaIa(item);
  const editavel = onToggleVerificado !== undefined;

  async function aoAlternarVerificado() {
    if (!onToggleVerificado) return;
    setSalvando(true);
    setErroToggle(null);
    try {
      await onToggleVerificado(!item.verificado);
    } catch (erro) {
      setErroToggle(mensagemErro(erro));
    } finally {
      setSalvando(false);
    }
  }

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
            disabled={!editavel || salvando}
            readOnly={!editavel}
            tabIndex={editavel ? undefined : -1}
            onChange={editavel ? aoAlternarVerificado : undefined}
            aria-label={
              editavel ? `Marcar como verificado — ${item.titulo}` : `Verificado — ${item.titulo}`
            }
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

        {erroToggle && (
          <p className={styles.erroToggle} role="alert">
            {erroToggle}
          </p>
        )}

        {aberto && (
          <div className={styles.detalhe} id={detalheId}>
            <StatusIaResumo item={item} />
            <p className={styles.descricao}>{item.descricao}</p>
            {norma && (
              <p className={styles.linha}>
                <span className={styles.rotulo}>Norma:</span> {norma}
              </p>
            )}
            {!diverge && item.comentario?.trim() && (
              <p className={styles.linha}>
                <span className={styles.rotulo}>Comentário:</span> {item.comentario}
              </p>
            )}
            <LinhaPagina
              pagina={item.paginaReferencia}
              totalPaginas={totalPaginas}
              onIrParaPagina={onIrParaPagina}
              onCorrigirPagina={onCorrigirPagina}
            />
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

/** Linha "Referência de página": leva ao visor (RF-014) e, com `onCorrigirPagina`, edita a página. */
function LinhaPagina({
  pagina,
  totalPaginas,
  onIrParaPagina,
  onCorrigirPagina,
}: {
  pagina: number | null;
  totalPaginas: number | null;
  onIrParaPagina?: (n: number) => void;
  onCorrigirPagina?: (pagina: number | null) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [campo, setCampo] = useState(pagina === null ? PAGINA_REFERENCIA_VAZIO : String(pagina));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function abrirEditor() {
    setCampo(pagina === null ? PAGINA_REFERENCIA_VAZIO : String(pagina));
    setErro(null);
    setEditando(true);
  }

  async function salvar() {
    const { pagina: valor, erro: erroValidacao } = validarPaginaReferencia(campo, totalPaginas);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    if (!onCorrigirPagina) return;
    setSalvando(true);
    setErro(null);
    try {
      await onCorrigirPagina(valor);
      setEditando(false);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={styles.pagina}>
      <p className={styles.linha}>
        <span className={styles.rotulo}>Referência de página:</span>{" "}
        {pagina !== null ? (
          onIrParaPagina ? (
            <button
              type="button"
              className={styles.paginaLink}
              onClick={() => onIrParaPagina(pagina)}
            >
              Página {pagina}
            </button>
          ) : (
            `Página ${pagina}`
          )
        ) : (
          <span className={styles.semPagina}>não informada</span>
        )}
        {onCorrigirPagina && !editando && (
          <button type="button" className={styles.paginaEditar} onClick={abrirEditor}>
            {pagina === null ? "Definir" : "Editar"}
          </button>
        )}
      </p>

      {editando && (
        <div className={styles.paginaEditor}>
          <input
            className={styles.paginaInput}
            type="number"
            min={1}
            max={totalPaginas ?? undefined}
            value={campo}
            onChange={(e) => setCampo(e.target.value)}
            disabled={salvando}
            aria-label="Página no documento"
            placeholder={totalPaginas !== null ? `1–${totalPaginas}` : "página"}
          />
          <button
            type="button"
            className={styles.paginaSalvar}
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            className={styles.paginaCancelar}
            onClick={() => setEditando(false)}
            disabled={salvando}
          >
            Cancelar
          </button>
        </div>
      )}
      {erro && (
        <p className={styles.erroToggle} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
