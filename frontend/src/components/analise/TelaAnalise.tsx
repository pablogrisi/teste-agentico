"use client";

import { Suspense, useState } from "react";
import type { AnaliseDetalhe } from "@/lib/data";
import { AnaliseVisor } from "./AnaliseVisor";
import { PainelRevisao } from "./PainelRevisao";
import styles from "./TelaAnalise.module.css";

/**
 * Área de trabalho da tela de análise (RF-014): visor de PDF à esquerda + painel de revisão
 * à direita, compartilhando o estado da **página atual** — clicar na referência de um
 * requisito move o visor.
 */
export function TelaAnalise({ detalhe }: { detalhe: AnaliseDetalhe }) {
  const [pagina, setPagina] = useState(1);

  return (
    <div className={styles.paineis}>
      <AnaliseVisor
        analiseId={detalhe.id}
        totalPaginas={detalhe.totalPaginasPdf}
        pagina={pagina}
        onPagina={setPagina}
      />
      <Suspense fallback={null}>
        <PainelRevisao detalhe={detalhe} onIrParaPagina={setPagina} />
      </Suspense>
    </div>
  );
}
