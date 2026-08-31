import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "./Tooltip.module.css";

/** Espera antes de abrir: evita piscar a dica ao atravessar a fileira de botões. */
const OPEN_DELAY = 150;
/** Folga entre a ponta da seta e o gatilho. */
const GAP = 8;
/** Respiro mínimo até a borda da janela. */
const EDGE = 8;

/**
 * Dica de texto para um gatilho de ícone.
 *
 *   <Tooltip label="Excluir documento">
 *     <button …><TrashIcon /></button>
 *   </Tooltip>
 *
 * O filho tem que aceitar `ref` — elemento do DOM ou componente com
 * `forwardRef`. Os manipuladores dele são preservados: o tooltip encadeia os
 * seus antes de chamar os originais.
 *
 * Vai para um portal no `body` porque o dono da linha (`.card` do sumário)
 * recorta com `overflow: hidden` — dentro dele a dica seria cortada. Portal
 * pede posição em `fixed`, medida do gatilho na hora de abrir.
 *
 * Abre no hover e também no foco de teclado, some no `Esc`. O texto fica sempre
 * no DOM, ligado ao gatilho por `aria-describedby`: leitor de tela anuncia a
 * dica junto do botão, sem depender de o ponteiro passar por cima.
 */
export function Tooltip({ label, placement = "top", children }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const tipRef = useRef(null);
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
  }, []);

  const show = useCallback((delay) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Posição só depois do layout: a largura do balão depende do texto, e é ela
  // que decide se ele cabe centrado ou precisa encostar na margem da janela.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const tip = tipRef.current;
    if (trigger && tip) setPos(place(trigger.getBoundingClientRect(), tip, placement));
  }, [open, placement, label]);

  // Rolar ou redimensionar deixaria a dica flutuando longe do botão.
  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open, hide]);

  const chain =
    (own, theirs) =>
    (event) => {
      own(event);
      theirs?.(event);
    };
  const own = children.props;

  const trigger = cloneElement(children, {
    ref: triggerRef,
    "aria-describedby": label ? id : undefined,
    onMouseEnter: chain(() => show(OPEN_DELAY), own.onMouseEnter),
    onMouseLeave: chain(hide, own.onMouseLeave),
    // Foco por teclado não espera: quem chegou pelo Tab quer o rótulo agora.
    onFocus: chain((e) => {
      if (e.target.matches(":focus-visible")) show(0);
    }, own.onFocus),
    onBlur: chain(hide, own.onBlur),
    onKeyDown: chain((e) => {
      if (e.key === "Escape") hide();
    }, own.onKeyDown),
    // Depois de agir, a dica já cumpriu o papel — e a linha pode nem existir mais.
    onClick: chain(hide, own.onClick),
  });

  return (
    <>
      {trigger}
      {createPortal(
        <div
          id={id}
          ref={tipRef}
          role="tooltip"
          className={`${styles.tip} ${styles[`tip_${pos?.side ?? placement}`]}`}
          data-open={open && pos ? "" : undefined}
          style={pos?.css}
        >
          {label}
        </div>,
        document.body,
      )}
    </>
  );
}

/**
 * Coordenadas em `fixed` para o balão. Vira para o outro lado quando não cabe
 * acima e encosta na margem da janela em vez de vazar.
 */
function place(box, tip, placement) {
  const { width, height } = tip.getBoundingClientRect();
  const fitsAbove = box.top - height - GAP >= EDGE;
  const side = placement === "top" && !fitsAbove ? "bottom" : placement;

  const top = side === "top" ? box.top - height - GAP : box.bottom + GAP;
  const centered = box.left + box.width / 2 - width / 2;
  const left = Math.min(Math.max(centered, EDGE), window.innerWidth - width - EDGE);

  return {
    side,
    // A seta segue o gatilho, mesmo quando o balão foi empurrado pela margem.
    css: { left, top, "--tip-arrow": `${box.left + box.width / 2 - left}px` },
  };
}
