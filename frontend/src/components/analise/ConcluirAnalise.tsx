"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleCheckIcon } from "@/components/icons";
import {
  AnaliseConflitoError,
  AnaliseNaoEncontradaError,
  AnaliseRequisitosPendentesError,
  getAnalisesGateway,
} from "@/lib/data";
import type { AnaliseDetalhe, RequisitoPendente } from "@/lib/data";
import styles from "./ConcluirAnalise.module.css";

interface ConcluirAnaliseProps {
  analiseId: string;
  /** `resumo.obrigatoriosPendentes` corrente da sessão — trava o botão enquanto `> 0`. */
  obrigatoriosPendentes: number;
  /** Recebe o `AnaliseDetalhe` já `CONCLUIDA` devolvido pelo backend. */
  onConcluida: (detalhe: AnaliseDetalhe) => void;
}

/**
 * Botão "Concluir análise" no cabeçalho + modal de confirmação (RF-012).
 * Chama `POST /analises/:id/concluir` via `AnalisesGateway.concluirAnalise`.
 * Enquadramento visual do `CompletionModal` do protótipo (card central + ícone circular).
 */
export function ConcluirAnalise({
  analiseId,
  obrigatoriosPendentes,
  onConcluida,
}: ConcluirAnaliseProps) {
  const [aberto, setAberto] = useState(false);
  const bloqueado = obrigatoriosPendentes > 0;
  const motivo = `Faltam ${obrigatoriosPendentes} requisito${
    obrigatoriosPendentes === 1 ? "" : "s"
  } obrigatório${obrigatoriosPendentes === 1 ? "" : "s"} não verificado${
    obrigatoriosPendentes === 1 ? "" : "s"
  }.`;

  return (
    <div className={styles.raiz}>
      {bloqueado && (
        <span className={styles.motivo} role="note">
          {motivo}
        </span>
      )}
      <button
        type="button"
        className={styles.botao}
        onClick={() => setAberto(true)}
        disabled={bloqueado}
        title={bloqueado ? motivo : undefined}
      >
        Concluir análise
      </button>
      {aberto && (
        <ConcluirAnaliseModal
          analiseId={analiseId}
          onFechar={() => setAberto(false)}
          onConcluida={onConcluida}
        />
      )}
    </div>
  );
}

interface ModalProps {
  analiseId: string;
  onFechar: () => void;
  onConcluida: (detalhe: AnaliseDetalhe) => void;
}

function ConcluirAnaliseModal({ analiseId, onFechar, onConcluida }: ModalProps) {
  const [montado, setMontado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<RequisitoPendente[]>([]);

  const confirmarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMontado(true);
    confirmarRef.current?.focus();
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

  async function concluir() {
    setEnviando(true);
    setErro(null);
    setPendentes([]);
    try {
      const detalhe = await getAnalisesGateway().concluirAnalise(analiseId);
      onConcluida(detalhe);
    } catch (e) {
      setEnviando(false);
      if (e instanceof AnaliseRequisitosPendentesError) {
        setPendentes(e.pendentes);
        setErro(
          e.pendentes.length > 0
            ? "Ainda faltam requisitos obrigatórios não verificados:"
            : "Ainda faltam requisitos obrigatórios não verificados. Volte à revisão e verifique-os.",
        );
      } else if (e instanceof AnaliseConflitoError) {
        setErro("Esta análise não está mais em revisão. Recarregue a página.");
      } else if (e instanceof AnaliseNaoEncontradaError) {
        setErro("Análise não encontrada.");
      } else {
        setErro("Não foi possível concluir a análise. Verifique sua conexão e tente de novo.");
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
        aria-labelledby="concluir-analise-titulo"
      >
        <div className={styles.icone} aria-hidden="true">
          <CircleCheckIcon size={28} />
        </div>

        <h2 id="concluir-analise-titulo" className={styles.titulo}>
          Concluir análise?
        </h2>
        <p className={styles.texto}>
          Depois de concluída, a análise fica <strong>somente leitura</strong> — o parecer final
          fica registrado e não dá para editar os requisitos.
        </p>

        {erro && (
          <div className={styles.erro} role="alert">
            <p className={styles.erroTitulo}>{erro}</p>
            {pendentes.length > 0 && (
              <ul className={styles.pendentes}>
                {pendentes.map((p) => (
                  <li key={p.requisitoId}>
                    <span className={styles.pendenteCodigo}>{p.codigo}</span> — {p.titulo}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={styles.acoes}>
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
            ref={confirmarRef}
            className={`${styles.btn} ${styles.confirmar}`}
            onClick={concluir}
            disabled={enviando}
          >
            {enviando ? "Concluindo…" : "Concluir"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
