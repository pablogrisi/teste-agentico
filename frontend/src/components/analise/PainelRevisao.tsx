"use client";

import { useMemo, useState } from "react";
import { contarItens, rotuloArea, separarPorAba } from "@/lib/data";
import type { AbaAnalise, AnaliseDetalhe, AreaComItens } from "@/lib/data";
import { RequisitoItem } from "./RequisitoItem";
import styles from "./PainelRevisao.module.css";

const EM_PROCESSAMENTO = new Set(["PENDENTE", "PROCESSANDO"]);

/** Painel de revisão: abas Checklist/Técnica (navegação livre), progresso e lista de requisitos. */
export function PainelRevisao({ detalhe }: { detalhe: AnaliseDetalhe }) {
  const [aba, setAba] = useState<AbaAnalise>("checklist");

  const { checklist, tecnica } = useMemo(() => {
    const separado = separarPorAba(detalhe.avaliacoesPorArea);
    return {
      // áreas "fora da convenção" ficam junto do Checklist para não sumir dado
      checklist: [...separado.checklist, ...separado.outras],
      tecnica: separado.tecnica,
    };
  }, [detalhe.avaliacoesPorArea]);

  const { resumo } = detalhe;
  const progresso = resumo.total > 0 ? Math.round((resumo.verificados / resumo.total) * 100) : 0;
  const semAvaliacoes = detalhe.avaliacoesPorArea.length === 0;

  return (
    <section className={styles.painel} aria-label="Painel de revisão">
      <div className={styles.abas} role="tablist" aria-label="Seções da análise">
        <button
          type="button"
          role="tab"
          aria-selected={aba === "checklist"}
          className={`${styles.aba} ${aba === "checklist" ? styles.abaAtiva : ""}`}
          onClick={() => setAba("checklist")}
        >
          Checklist
          <span className={styles.abaBadge}>{contarItens(checklist)}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === "tecnica"}
          className={`${styles.aba} ${aba === "tecnica" ? styles.abaAtiva : ""}`}
          onClick={() => setAba("tecnica")}
        >
          Técnica
          <span className={styles.abaBadge}>{contarItens(tecnica)}</span>
        </button>
        <span className={`${styles.aba} ${styles.abaDesabilitada}`} aria-disabled="true">
          Legislação
        </span>
        <span className={`${styles.aba} ${styles.abaDesabilitada}`} aria-disabled="true">
          Outros
        </span>
      </div>

      {!semAvaliacoes && (
        <div className={styles.progresso}>
          <div className={styles.progressoLinha}>
            <span className={styles.progressoLabel}>Progresso da análise</span>
            <span className={styles.progressoContador}>
              {resumo.verificados}/{resumo.total} verificados
            </span>
          </div>
          <div className={styles.progressoBarra}>
            <div className={styles.progressoFill} style={{ width: `${progresso}%` }} />
          </div>
        </div>
      )}

      <div className={styles.conteudo}>
        {semAvaliacoes ? (
          <PainelSemAvaliacoes status={detalhe.status} motivoErro={detalhe.motivoErro} />
        ) : (
          <>
            <p className={styles.legenda}>
              Os status abaixo são <strong>sugestões da IA</strong>; o parecer final é definido na
              revisão.
            </p>
            <ListaAba grupos={aba === "checklist" ? checklist : tecnica} />
          </>
        )}
      </div>
    </section>
  );
}

function ListaAba({ grupos }: { grupos: AreaComItens[] }) {
  if (grupos.length === 0) {
    return <p className={styles.vazio}>Nenhum requisito nesta aba.</p>;
  }
  return (
    <div className={styles.lista}>
      {grupos.map((grupo) => (
        <div key={grupo.area} className={styles.grupo}>
          <div className={styles.grupoHeader}>
            <span className={styles.grupoLabel}>{rotuloArea(grupo.area)}</span>
            <span className={styles.grupoBadge}>{grupo.itens.length}</span>
          </div>
          <div className={styles.grupoItens}>
            {grupo.itens.map((item) => (
              <RequisitoItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PainelSemAvaliacoes({
  status,
  motivoErro,
}: {
  status: AnaliseDetalhe["status"];
  motivoErro: string | null;
}) {
  if (EM_PROCESSAMENTO.has(status)) {
    return (
      <div className={styles.estado} role="status">
        <p className={styles.estadoTitulo}>Processando a análise…</p>
        <p className={styles.estadoTexto}>
          Os requisitos aparecem aqui assim que o processamento terminar. A página atualiza sozinha.
        </p>
      </div>
    );
  }
  if (status === "ERRO_PROCESSAMENTO") {
    return (
      <div className={styles.estado} role="alert">
        <p className={styles.estadoTitulo}>Não foi possível processar a análise.</p>
        <p className={styles.estadoTexto}>{motivoErro ?? "Tente reprocessar a análise."}</p>
      </div>
    );
  }
  return (
    <div className={styles.estado} role="status">
      <p className={styles.estadoTitulo}>Sem requisitos avaliados.</p>
    </div>
  );
}
