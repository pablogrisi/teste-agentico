import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MinusIcon, PlusIcon } from "@/components/icons";
import styles from "./DocumentMap.module.css";

const ZOOM_STEPS = [1, 1.5, 2, 3];
/** Menor largura de segmento no Figma. Abaixo disso o detalhe é cortado. */
const SEGMENT_MIN_WIDTH = 48;
/** O trecho fora do escopo não tem rótulo dentro, então precisa de bem menos. */
const OUT_OF_SCOPE_MIN_WIDTH = 12;
/** Marcas fixas da escala, além do início e do fim. */
const SCALE_TICKS = [50, 100, 150];

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/**
 * Régua proporcional do caderno (`Mapa do documento`). Cada segmento é um
 * documento com páginas atribuídas; a largura acompanha o nº de páginas. O nome e
 * a faixa aparecem sempre — quando não cabem, o segmento corta com reticências.
 *
 * Os trechos fora do escopo entram na mesma régua, mas rebaixados: meia altura,
 * hachurados e sem rótulo. Eles são ~40% do caderno, então precisam ocupar o
 * espaço real que ocupam sem competir com os documentos pela leitura.
 *
 * A régua toda é uma faixa de navegação: o traço acompanha o mouse indicando a
 * página sob o cursor e o clique abre essa página.
 */
export function DocumentMap({
  documents,
  totalPages,
  selectedId,
  currentPage,
  onSelect,
  onPickPage,
}) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [hoverPage, setHoverPage] = useState(null);
  const [layout, setLayout] = useState({ width: 0, segs: [] });
  const rulerRef = useRef(null);
  const scrollRef = useRef(null);
  const prevZoomIndex = useRef(zoomIndex);

  const segments = useMemo(
    () => documents.filter((d) => d.startPage !== null && d.endPage !== null),
    [documents],
  );
  const zoom = ZOOM_STEPS[zoomIndex];

  // O `min-width` do segmento quebra a proporção: uma peça de 2 páginas ocupa
  // 48px, não ~1% da régua. Por isso página↔posição é resolvida pelas larguras
  // medidas dos segmentos, nunca por regra de três sobre o total de páginas.
  useLayoutEffect(() => {
    const ruler = rulerRef.current;
    if (!ruler) return undefined;

    const measure = () => {
      const rect = ruler.getBoundingClientRect();
      const segs = Array.from(ruler.querySelectorAll("[data-doc]")).map((el) => {
        const r = el.getBoundingClientRect();
        const doc = segments.find((d) => d.id === el.dataset.doc);
        return {
          id: el.dataset.doc,
          left: r.left - rect.left,
          width: r.width,
          startPage: doc?.startPage ?? 1,
          endPage: doc?.endPage ?? 1,
        };
      });
      setLayout((prev) => {
        const same =
          prev.width === rect.width &&
          prev.segs.length === segs.length &&
          prev.segs.every((s, i) => s.left === segs[i].left && s.width === segs[i].width);
        return same ? prev : { width: rect.width, segs };
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(ruler);
    return () => observer.disconnect();
  }, [zoomIndex, segments]);

  /** Página sob uma posição horizontal (px relativos à régua). */
  const pageAtX = useCallback(
    (x) => {
      const seg = layout.segs.find((s) => x >= s.left && x < s.left + s.width);
      if (!seg) {
        // Fora de qualquer segmento medido: proporcional ao caderno inteiro.
        if (!layout.width) return null;
        return clamp(Math.floor((x / layout.width) * totalPages) + 1, 1, totalPages);
      }
      const pages = seg.endPage - seg.startPage + 1;
      const offset = Math.floor(((x - seg.left) / seg.width) * pages);
      return clamp(seg.startPage + offset, seg.startPage, seg.endPage);
    },
    [layout, totalPages],
  );

  /** Posição horizontal (px) do início da página dentro da régua. */
  const xAtPage = useCallback(
    (page) => {
      const seg = layout.segs.find((s) => page >= s.startPage && page <= s.endPage);
      if (!seg) return (layout.width * (page - 1)) / totalPages;
      const pages = seg.endPage - seg.startPage + 1;
      return seg.left + (seg.width * (page - seg.startPage)) / pages;
    },
    [layout, totalPages],
  );

  function pageAtEvent(event) {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return pageAtX(clamp(event.clientX - rect.left, 0, rect.width - 1));
  }

  // O clique de teclado (`detail === 0`) sobe do botão do segmento sem posição
  // útil — nesse caso quem responde é o próprio segmento, selecionando a linha.
  function handleClick(event) {
    if (event.detail === 0) return;
    const page = pageAtEvent(event);
    if (page !== null) onPickPage(page);
  }

  const markerPage = hoverPage ?? currentPage;
  const markerX = xAtPage(markerPage);
  const markerDoc = segments.find((d) => markerPage >= d.startPage && markerPage <= d.endPage);
  // Perto do fim da régua o balão vira para a esquerda para não ser cortado.
  const tipEnd = layout.width > 0 && markerX / layout.width > 0.85;
  const tipClass = `${styles.cursorTip} ${tipEnd ? styles.cursorTipEnd : ""}`;

  // O zoom é ancorado no que está em foco: depois de ampliar, o documento
  // selecionado (ou o traço da página aberta) continua visível — de preferência,
  // centrado.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const ruler = rulerRef.current;
    if (!scroller || !ruler) return;

    const zoomChanged = prevZoomIndex.current !== zoomIndex;
    prevZoomIndex.current = zoomIndex;

    const overflow = scroller.scrollWidth - scroller.clientWidth;
    if (overflow <= 0) return;

    const rulerLeft =
      ruler.getBoundingClientRect().left -
      scroller.getBoundingClientRect().left +
      scroller.scrollLeft;

    const seg = selectedId ? layout.segs.find((s) => s.id === selectedId) : null;
    // Sem documento selecionado o alvo é o traço da página aberta.
    const start = rulerLeft + (seg ? seg.left : xAtPage(currentPage));
    const end = seg ? start + seg.width : start;

    const view = scroller.clientWidth;
    const visible = start >= scroller.scrollLeft && end <= scroller.scrollLeft + view;
    // Fora do zoom só corrige quando o alvo saiu de vista (ex.: seleção pela tabela).
    if (!zoomChanged && visible) return;

    const left = clamp((start + end) / 2 - view / 2, 0, overflow);
    scroller.scrollTo({ left, behavior: zoomChanged ? "auto" : "smooth" });
  }, [zoomIndex, selectedId, currentPage, layout, xAtPage]);

  return (
    <section className={styles.map}>
      <div className={styles.head}>
        <h2 className={styles.title}>Mapa do documento</h2>
        <div className={styles.zoom}>
          <span className={styles.zoomLabel}>Zoom do mapa</span>
          <button
            className={styles.miniBtn}
            type="button"
            aria-label="Reduzir zoom do mapa"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
          >
            <MinusIcon />
          </button>
          <button
            className={styles.miniBtn}
            type="button"
            aria-label="Ampliar zoom do mapa"
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.track} style={{ width: `${zoom * 100}%` }}>
          <div
            ref={rulerRef}
            className={styles.ruler}
            onMouseMove={(e) => setHoverPage(pageAtEvent(e))}
            onMouseLeave={() => setHoverPage(null)}
            onClick={handleClick}
          >
            {segments.map((doc) => {
              const pages = doc.endPage - doc.startPage + 1;
              const outOfScope = doc.state === "foraEscopo";
              const selected = doc.id === selectedId;
              const segClass = [
                styles.segment,
                styles[`segment_${doc.state}`],
                selected ? styles.segmentSelected : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={doc.id}
                  type="button"
                  data-doc={doc.id}
                  className={segClass}
                  style={{
                    flex: `${pages} 1 0`,
                    minWidth: outOfScope ? OUT_OF_SCOPE_MIN_WIDTH : SEGMENT_MIN_WIDTH,
                  }}
                  title={`${outOfScope ? "Fora do escopo" : doc.name} · fl. ${doc.startPage}–${doc.endPage}`}
                  onClick={(e) => {
                    if (e.detail === 0) onSelect(doc.id);
                  }}
                >
                  {/* O trecho fora do escopo é só a faixa hachurada: sem rótulo,
                      ele não disputa a leitura com os documentos. */}
                  {!outOfScope && (
                    <span className={styles.detail}>
                      <span className={styles.detailName}>{doc.shortName}</span>
                      <span className={styles.detailRange}>
                        {doc.startPage}–{doc.endPage}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}

            {/* Folha aberta: fica como referência enquanto o traço segue o mouse. */}
            {hoverPage !== null && hoverPage !== currentPage && (
              <div
                className={`${styles.cursor} ${styles.cursorGhost}`}
                style={{ left: `${xAtPage(currentPage)}px` }}
              />
            )}
            <div className={styles.cursor} style={{ left: `${markerX}px` }}>
              <span className={tipClass}>
                p. {markerPage}
                {markerDoc ? ` · ${markerDoc.shortName}` : ""}
              </span>
            </div>
          </div>

          {/* A escala segue as mesmas larguras medidas — senão mente junto. */}
          <div className={styles.scale}>
            <span className={styles.scaleEdge}>1</span>
            {SCALE_TICKS.filter((page) => page < totalPages).map((page) => (
              <span key={page} className={styles.scaleTick} style={{ left: `${xAtPage(page)}px` }}>
                {page}
              </span>
            ))}
            <span className={`${styles.scaleEdge} ${styles.scaleEdgeEnd}`}>{totalPages}</span>
            <span className={styles.cursorLabel} style={{ left: `${markerX}px` }}>
              {markerPage}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
