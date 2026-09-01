"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ANALISE_PDF_TAMANHO_MAX_MB,
  AnaliseValidacaoError,
  formatarTamanho,
  getAnalisesGateway,
  validarNovaAnalise,
} from "@/lib/data";
import type { ErrosNovaAnalise } from "@/lib/data";
import { CircleCheckIcon, TrashIcon, UploadIcon, XmarkIcon } from "@/components/icons";
import styles from "./NovaAnaliseModal.module.css";

interface NovaAnaliseModalProps {
  onFechar: () => void;
  onCriada: (id: string) => void;
}

/** Modal de criação de análise: NUP, objeto da contratação e upload de PDF (RF-001 + RF-004). */
export function NovaAnaliseModal({ onFechar, onCriada }: NovaAnaliseModalProps) {
  const [montado, setMontado] = useState(false);
  const [nup, setNup] = useState("");
  const [objeto, setObjeto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<ErrosNovaAnalise>({});
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<string[]>([]);

  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const nupRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMontado(true);
    nupRef.current?.focus();
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

  const valido = validarNovaAnalise({ nup, objeto, arquivo }).ok;

  function selecionarArquivo(lista: FileList | null) {
    const escolhido = lista?.[0];
    if (!escolhido) return;
    setArquivo(escolhido);
    setErros((atual) => ({
      ...atual,
      arquivo: validarNovaAnalise({ nup, objeto, arquivo: escolhido }).erros.arquivo,
    }));
  }

  function removerArquivo() {
    setArquivo(null);
    setErros((atual) => ({ ...atual, arquivo: undefined }));
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
  }

  async function confirmar() {
    const resultado = validarNovaAnalise({ nup, objeto, arquivo });
    setErros(resultado.erros);
    if (!resultado.ok || !arquivo) return;

    setEnviando(true);
    setErroEnvio(null);
    setMotivos([]);
    try {
      const criada = await getAnalisesGateway().criarAnalise({
        nup: nup.trim(),
        objeto: objeto.trim(),
        arquivo,
      });
      onCriada(criada.id);
    } catch (erro) {
      setEnviando(false);
      if (erro instanceof AnaliseValidacaoError) {
        setMotivos(erro.motivos);
        setErroEnvio("O servidor recusou os dados enviados. Ajuste e tente de novo.");
      } else {
        setErroEnvio("Não foi possível criar a análise. Verifique sua conexão e tente novamente.");
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
        aria-labelledby="nova-analise-titulo"
      >
        <div className={styles.header}>
          <h2 id="nova-analise-titulo" className={styles.title}>
            Nova análise
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
          {erroEnvio && (
            <div className={styles.banner} role="alert">
              <p className={styles.bannerTitulo}>{erroEnvio}</p>
              {motivos.length > 0 && (
                <ul className={styles.bannerLista}>
                  {motivos.map((motivo) => (
                    <li key={motivo}>{motivo}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="campo-nup">
              NUP <span className={styles.required}>*</span>
            </label>
            <input
              id="campo-nup"
              ref={nupRef}
              className={styles.input}
              type="text"
              value={nup}
              onChange={(evento) => setNup(evento.target.value)}
              onBlur={() =>
                setErros((atual) => ({
                  ...atual,
                  nup: validarNovaAnalise({ nup, objeto, arquivo }).erros.nup,
                }))
              }
              placeholder="Informe o Número Único de Protocolo"
              aria-invalid={erros.nup ? true : undefined}
              aria-describedby={erros.nup ? "erro-nup" : undefined}
              disabled={enviando}
            />
            {erros.nup && (
              <p id="erro-nup" className={styles.erroCampo}>
                {erros.nup}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="campo-objeto">
              Objeto da contratação <span className={styles.required}>*</span>
            </label>
            <textarea
              id="campo-objeto"
              className={styles.textarea}
              value={objeto}
              onChange={(evento) => setObjeto(evento.target.value)}
              onBlur={() =>
                setErros((atual) => ({
                  ...atual,
                  objeto: validarNovaAnalise({ nup, objeto, arquivo }).erros.objeto,
                }))
              }
              placeholder="Ex.: Material de consumo — material farmacológico"
              aria-invalid={erros.objeto ? true : undefined}
              aria-describedby={erros.objeto ? "erro-objeto" : undefined}
              disabled={enviando}
            />
            {erros.objeto && (
              <p id="erro-objeto" className={styles.erroCampo}>
                {erros.objeto}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <span className={styles.label}>
              Arquivo <span className={styles.required}>*</span>
            </span>
            {arquivo ? (
              <div className={`${styles.anexado} ${erros.arquivo ? styles.anexadoInvalido : ""}`}>
                <CircleCheckIcon className={styles.anexadoCheck} size={24} />
                <span className={styles.anexadoInfo}>
                  <span className={styles.anexadoNome}>{arquivo.name}</span>
                  <span className={styles.anexadoTamanho}>{formatarTamanho(arquivo.size)}</span>
                </span>
                <button
                  type="button"
                  className={styles.remover}
                  aria-label="Remover arquivo"
                  onClick={removerArquivo}
                  disabled={enviando}
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`${styles.dropzone} ${arrastando ? styles.dropzoneAtivo : ""}`}
                onClick={() => inputArquivoRef.current?.click()}
                onDragOver={(evento) => {
                  evento.preventDefault();
                  setArrastando(true);
                }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(evento) => {
                  evento.preventDefault();
                  setArrastando(false);
                  selecionarArquivo(evento.dataTransfer.files);
                }}
                disabled={enviando}
              >
                <UploadIcon className={styles.dropzoneIcone} size={24} />
                <span className={styles.dropzoneTexto}>
                  <span className={styles.dropzoneTitulo}>
                    <span className={styles.dropzoneLink}>Clique aqui</span> ou arraste e solte o
                    arquivo
                  </span>
                  <span className={styles.dropzoneDica}>
                    PDF, até {ANALISE_PDF_TAMANHO_MAX_MB} MB
                  </span>
                </span>
              </button>
            )}
            <input
              ref={inputArquivoRef}
              className={styles.inputArquivo}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(evento) => selecionarArquivo(evento.target.files)}
              tabIndex={-1}
              aria-hidden="true"
            />
            {erros.arquivo && <p className={styles.erroCampo}>{erros.arquivo}</p>}
          </div>
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
            disabled={!valido || enviando}
          >
            {enviando ? "Enviando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
