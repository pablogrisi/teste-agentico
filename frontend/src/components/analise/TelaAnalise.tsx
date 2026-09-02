"use client";

import { Suspense, useState } from "react";
import type { AnaliseDetalhe } from "@/lib/data";
import { AnaliseHeader } from "./AnaliseHeader";
import { AnaliseVisor } from "./AnaliseVisor";
import { ConcluirAnalise } from "./ConcluirAnalise";
import { PainelRevisao } from "./PainelRevisao";
import styles from "./TelaAnalise.module.css";

/**
 * Área de trabalho da tela de análise (RF-014): visor de PDF à esquerda + painel de revisão
 * à direita, compartilhando a **página atual**. Orquestra também (RF-012) o `detalhe` efetivo
 * — trocado quando a análise é concluída — e o `resumo` corrente da sessão, que destrava o
 * botão "Concluir análise" assim que o último obrigatório é verificado.
 */
export function TelaAnalise({ detalhe }: { detalhe: AnaliseDetalhe }) {
  const [pagina, setPagina] = useState(1);
  const [detalheEfetivo, setDetalheEfetivo] = useState(detalhe);
  const [resumoAtual, setResumoAtual] = useState(detalhe.resumo);

  // Nova análise no mesmo componente (navegação entre ids): reseta o estado de sessão.
  const [analiseId, setAnaliseId] = useState(detalhe.id);
  if (detalhe.id !== analiseId) {
    setAnaliseId(detalhe.id);
    setDetalheEfetivo(detalhe);
    setResumoAtual(detalhe.resumo);
  }

  const acao =
    detalheEfetivo.status === "PRONTA_PARA_REVISAO" ? (
      <ConcluirAnalise
        analiseId={detalheEfetivo.id}
        obrigatoriosPendentes={resumoAtual.obrigatoriosPendentes}
        onConcluida={setDetalheEfetivo}
      />
    ) : undefined;

  return (
    <>
      <AnaliseHeader detalhe={detalheEfetivo} acao={acao} />
      <div className={styles.paineis}>
        <AnaliseVisor
          analiseId={detalheEfetivo.id}
          totalPaginas={detalheEfetivo.totalPaginasPdf}
          pagina={pagina}
          onPagina={setPagina}
        />
        <Suspense fallback={null}>
          <PainelRevisao
            detalhe={detalheEfetivo}
            onIrParaPagina={setPagina}
            onResumoChange={setResumoAtual}
          />
        </Suspense>
      </div>
    </>
  );
}
