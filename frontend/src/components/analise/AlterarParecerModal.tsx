"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XmarkIcon } from "@/components/icons";
import {
  AnaliseConflitoError,
  AnaliseNaoEncontradaError,
  AnaliseValidacaoError,
  getAnalisesGateway,
  PARECER_OPCOES,
  STATUS_REQUISITO_LABEL,
  validarAlteracaoParecer,
} from "@/lib/data";
import type { AvaliacaoItem, RevisaoRequisitoResultado, StatusRequisito } from "@/lib/data";
import { StatusBadgeRequisito } from "./StatusBadgeRequisito";
import styles from "./AlterarParecerModal.module.css";

interface AlterarParecerModalProps {
  analiseId: string;
  item: AvaliacaoItem;
  onFechar: () => void;
  onAlterado: (resultado: RevisaoRequisitoResultado) => void;
}

/** Modal "Alterar parecer" de um requisito (RF-008). Chama `PATCH /analises/:id/requisitos/:requisitoId`. */
export function AlterarParecerModal({
  analiseId,
  item,
  onFechar,
  onAlterado,
}: AlterarParecerModalProps) {
  const [montado, setMontado] = useState(false);
  const [statusFinal, setStatusFinal] = useState<StatusRequisito | "">("");
  const [comentario, setComentario] = useState("");
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    setMontado(true);
    selectRef.current?.focus();
  }, []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !enviando) onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [enviando, onFechar]);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  const { ok, erros, divergeDaSugestao } = validarAlteracaoParecer({
    statusFinal,
    statusAtual: item.statusFinal,
    statusSugeridoIa: item.statusSugeridoIa,
    comentario,
  });

  const opcoes = PARECER_OPCOES.filter((s) => s !== item.statusFinal);

  async function confirmar() {
    setTentouEnviar(true);
    if (!ok || statusFinal === "") return;

    setEnviando(true);
    setErroServidor(null);
    try {
      const resultado = await getAnalisesGateway().revisarRequisito(analiseId, item.requisitoId, {
        statusFinal,
        comentario: comentario.trim(),
      });
      onAlterado(resultado);
    } catch (erro) {
      setEnviando(false);
      if (erro instanceof AnaliseValidacaoError) {
        setErroServidor(erro.motivos[0] ?? "O servidor recusou a alteração.");
      } else if (erro instanceof AnaliseConflitoError) {
        setErroServidor("Esta análise não está mais em revisão. Recarregue a página.");
      } else if (erro instanceof AnaliseNaoEncontradaError) {
        setErroServidor("Requisito não encontrado nesta análise.");
      } else {
        setErroServidor(
          "Não foi possível alterar o parecer. Verifique sua conexão e tente de novo.",
        );
      }
    }
  }

  if (!montado) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !enviando) onFechar();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alterar-parecer-titulo"
      >
        <div className={styles.header}>
          <h2 id="alterar-parecer-titulo" className={styles.title}>
            Alterar parecer
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Fechar"
            onClick={onFechar}
            disabled={enviando}
          >
            <XmarkIcon />
          </button>
        </div>

        <div className={styles.body}>
          {erroServidor && (
            <div className={styles.banner} role="alert">
              <p className={styles.bannerTitulo}>{erroServidor}</p>
            </div>
          )}

          <section className={styles.section}>
            <span className={styles.sectionTitle}>Parecer atual</span>
            <div className={styles.card}>
              <span className={styles.cardTitulo}>{item.titulo}</span>
              <StatusBadgeRequisito status={item.statusFinal} />
            </div>
          </section>

          <section className={styles.section}>
            <span className={styles.sectionTitle}>Novo parecer</span>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="campo-parecer">
                Parecer <span className={styles.required}>*</span>
              </label>
              <select
                id="campo-parecer"
                ref={selectRef}
                className={styles.select}
                value={statusFinal}
                onChange={(evento) => setStatusFinal(evento.target.value as StatusRequisito)}
                aria-invalid={tentouEnviar && erros.statusFinal ? true : undefined}
                disabled={enviando}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {opcoes.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_REQUISITO_LABEL[s]}
                  </option>
                ))}
              </select>
              {divergeDaSugestao && (
                <p className={styles.dica}>
                  A IA sugeriu <strong>{STATUS_REQUISITO_LABEL[item.statusSugeridoIa]}</strong>;
                  explique a mudança no comentário.
                </p>
              )}
              {tentouEnviar && erros.statusFinal && (
                <p className={styles.erroCampo}>{erros.statusFinal}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="campo-comentario">
                Comentário <span className={styles.required}>*</span>
              </label>
              <textarea
                id="campo-comentario"
                className={styles.textarea}
                value={comentario}
                onChange={(evento) => setComentario(evento.target.value)}
                placeholder="Justifique o novo parecer"
                aria-invalid={tentouEnviar && erros.comentario ? true : undefined}
                disabled={enviando}
              />
              {tentouEnviar && erros.comentario && (
                <p className={styles.erroCampo}>{erros.comentario}</p>
              )}
            </div>
          </section>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={`${styles.btn} ${styles.cancelar}`}
            onClick={onFechar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.confirmar}`}
            onClick={confirmar}
            disabled={!ok || enviando}
          >
            {enviando ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
