"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  contarItens,
  FILTRO_REQUISITO_PADRAO,
  filtrarPorStatus,
  filtroParaSlug,
  parseFiltroRequisito,
  rotuloArea,
  separarPorAba,
} from "@/lib/data";
import type {
  AbaAnalise,
  AnaliseDetalhe,
  AreaComItens,
  AvaliacaoItem,
  FiltroRequisito,
} from "@/lib/data";
import { AlterarParecerModal } from "./AlterarParecerModal";
import { FiltroStatus } from "./FiltroStatus";
import { RequisitoItem } from "./RequisitoItem";
import styles from "./PainelRevisao.module.css";

const EM_PROCESSAMENTO = new Set(["PENDENTE", "PROCESSANDO"]);

/** Painel de revisão: abas Checklist/Técnica (navegação livre), progresso, filtro por status e lista. */
export function PainelRevisao({ detalhe }: { detalhe: AnaliseDetalhe }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [aba, setAba] = useState<AbaAnalise>("checklist");
  // Filtro é compartilhado entre as abas e espelhado na URL (`?requisitos=`),
  // para sobreviver a recarregar a página e ao polling de `router.refresh()`.
  const [filtro, setFiltro] = useState<FiltroRequisito>(() =>
    parseFiltroRequisito(searchParams.get("requisitos")),
  );

  // Alterações de parecer feitas nesta sessão (RF-008): sobrepõem o item e o resumo
  // devolvidos pelo servidor, sem recarregar. Reiniciadas a cada novo `detalhe` (refetch).
  const [overrides, setOverrides] = useState<Map<string, AvaliacaoItem>>(new Map());
  const [resumo, setResumo] = useState(detalhe.resumo);
  const [parecerDe, setParecerDe] = useState<AvaliacaoItem | null>(null);

  useEffect(() => {
    setOverrides(new Map());
    setResumo(detalhe.resumo);
    setParecerDe(null);
  }, [detalhe]);

  function trocarFiltro(proximo: FiltroRequisito) {
    setFiltro(proximo);
    const sp = new URLSearchParams(searchParams.toString());
    if (proximo === FILTRO_REQUISITO_PADRAO) sp.delete("requisitos");
    else sp.set("requisitos", filtroParaSlug(proximo));
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const avaliacoesEfetivas = useMemo<AreaComItens[]>(() => {
    if (overrides.size === 0) return detalhe.avaliacoesPorArea;
    return detalhe.avaliacoesPorArea.map((grupo) => ({
      area: grupo.area,
      itens: grupo.itens.map((item) => overrides.get(item.id) ?? item),
    }));
  }, [detalhe.avaliacoesPorArea, overrides]);

  const { checklist, tecnica } = useMemo(() => {
    const separado = separarPorAba(avaliacoesEfetivas);
    return {
      // áreas "fora da convenção" ficam junto do Checklist para não sumir dado
      checklist: [...separado.checklist, ...separado.outras],
      tecnica: separado.tecnica,
    };
  }, [avaliacoesEfetivas]);

  const gruposAba = aba === "checklist" ? checklist : tecnica;
  const gruposFiltrados = useMemo(() => filtrarPorStatus(gruposAba, filtro), [gruposAba, filtro]);

  const progresso = resumo.total > 0 ? Math.round((resumo.verificados / resumo.total) * 100) : 0;
  const semAvaliacoes = detalhe.avaliacoesPorArea.length === 0;
  const temItensVisiveis = contarItens(gruposFiltrados) > 0;
  const podeEditar = detalhe.status === "PRONTA_PARA_REVISAO";

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

      {!semAvaliacoes && <FiltroStatus valor={filtro} onChange={trocarFiltro} />}

      <div className={styles.conteudo}>
        {semAvaliacoes ? (
          <PainelSemAvaliacoes status={detalhe.status} motivoErro={detalhe.motivoErro} />
        ) : (
          <>
            {temItensVisiveis && (
              <p className={styles.legenda}>
                Os status abaixo são <strong>sugestões da IA</strong>; o parecer final é definido na
                revisão.
              </p>
            )}
            <ConteudoAba
              grupos={gruposFiltrados}
              filtro={filtro}
              onVerTodos={() => trocarFiltro("TODOS")}
              onAlterarParecer={podeEditar ? setParecerDe : undefined}
            />
          </>
        )}
      </div>

      {parecerDe && podeEditar && (
        <AlterarParecerModal
          analiseId={detalhe.id}
          item={parecerDe}
          onFechar={() => setParecerDe(null)}
          onAlterado={({ item, resumo: resumoNovo }) => {
            setOverrides((atual) => new Map(atual).set(item.id, item));
            setResumo(resumoNovo);
            setParecerDe(null);
          }}
        />
      )}
    </section>
  );
}

function ConteudoAba({
  grupos,
  filtro,
  onVerTodos,
  onAlterarParecer,
}: {
  grupos: AreaComItens[];
  filtro: FiltroRequisito;
  onVerTodos: () => void;
  onAlterarParecer?: (item: AvaliacaoItem) => void;
}) {
  if (grupos.length === 0) {
    return <p className={styles.vazio}>Nenhum requisito nesta aba.</p>;
  }

  if (contarItens(grupos) === 0) {
    if (filtro === "NAO_CONFORME") {
      return (
        <div className={styles.estado} role="status">
          <p className={styles.estadoTitulo}>Nenhum requisito não conforme nesta aba.</p>
          <p className={styles.estadoTexto}>
            Nenhum item desta aba está marcado como não conforme no parecer atual.
          </p>
          <button type="button" className={styles.verTodos} onClick={onVerTodos}>
            Ver todos os requisitos
          </button>
        </div>
      );
    }
    return (
      <div className={styles.estado} role="status">
        <p className={styles.estadoTitulo}>Nenhum requisito neste filtro.</p>
      </div>
    );
  }

  return <ListaAba grupos={grupos} onAlterarParecer={onAlterarParecer} />;
}

function ListaAba({
  grupos,
  onAlterarParecer,
}: {
  grupos: AreaComItens[];
  onAlterarParecer?: (item: AvaliacaoItem) => void;
}) {
  return (
    <div className={styles.lista}>
      {grupos.map((grupo) => (
        <div key={grupo.area} className={styles.grupo}>
          <div className={styles.grupoHeader}>
            <span className={styles.grupoLabel}>{rotuloArea(grupo.area)}</span>
            <span className={styles.grupoBadge}>{grupo.itens.length}</span>
          </div>
          {grupo.itens.length === 0 ? (
            <p className={styles.grupoVazio}>Nenhum requisito neste grupo com o filtro atual.</p>
          ) : (
            <div className={styles.grupoItens}>
              {grupo.itens.map((item) => (
                <RequisitoItem
                  key={item.id}
                  item={item}
                  onAlterarParecer={onAlterarParecer ? () => onAlterarParecer(item) : undefined}
                />
              ))}
            </div>
          )}
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
