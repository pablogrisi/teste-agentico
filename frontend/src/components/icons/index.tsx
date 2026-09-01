import type { SVGProps } from "react";

/**
 * Ícones SVG usam `currentColor` para herdar a cor do contexto — o estilo é
 * controlado por tokens via CSS. Adaptado de
 * Prototipo Licia Analisadora/src/components/icons/index.tsx (só o que a UI usa).
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Icon({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ChevronDownIcon({ size = 16, ...props }: IconProps) {
  return (
    <Icon size={size} {...props}>
      <path d="M5 7.5L10 12.5L15 7.5" {...stroke} />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="9" r="6" {...stroke} strokeWidth={1.6} />
      <path d="M13.5 13.5L17 17" {...stroke} strokeWidth={1.6} />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4v12M4 10h12" {...stroke} strokeWidth={1.6} />
    </Icon>
  );
}

/** Setas de ordenação (cabeçalho de tabela). */
export function SortIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M7 8l-2.5-3L2 8M4.5 5v10M13 12l2.5 3 2.5-3M15.5 15V5"
        {...stroke}
        strokeWidth={1.4}
      />
    </Icon>
  );
}

export function XmarkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 5l10 10M15 5L5 15" {...stroke} strokeWidth={1.6} />
    </Icon>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 13V4M6.5 7.5L10 4l3.5 3.5" {...stroke} strokeWidth={1.6} />
      <path d="M4 13v2.5h12V13" {...stroke} strokeWidth={1.6} />
    </Icon>
  );
}

export function CircleCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="8" {...stroke} strokeWidth={1.6} />
      <path d="M6.5 10l2.2 2.2L13.5 7.5" {...stroke} strokeWidth={1.6} />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" {...stroke} strokeWidth={1.6} />
      <path d="M8.5 9v4M11.5 9v4" {...stroke} strokeWidth={1.6} />
    </Icon>
  );
}

/* ── Paginador (viewBox 14) ── */
function PgIcon({ size = 14, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function FirstPageIcon(props: IconProps) {
  return (
    <PgIcon {...props}>
      <path d="M11 2L6 7l5 5M6 2L1 7l5 5" {...stroke} strokeWidth={1.4} />
    </PgIcon>
  );
}

export function PrevPageIcon(props: IconProps) {
  return (
    <PgIcon {...props}>
      <path d="M9 2L4 7l5 5" {...stroke} strokeWidth={1.4} />
    </PgIcon>
  );
}

export function NextPageIcon(props: IconProps) {
  return (
    <PgIcon {...props}>
      <path d="M5 2l5 5-5 5" {...stroke} strokeWidth={1.4} />
    </PgIcon>
  );
}

export function LastPageIcon(props: IconProps) {
  return (
    <PgIcon {...props}>
      <path d="M3 2l5 5-5 5M8 2l5 5-5 5" {...stroke} strokeWidth={1.4} />
    </PgIcon>
  );
}
