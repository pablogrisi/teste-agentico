import type { SVGProps } from "react";

/**
 * Ícones SVG da aplicação. Usam `currentColor` para herdar a cor do contexto,
 * de modo que o estilo é controlado por tokens via CSS.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

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

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const ChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 7.5L10 12.5L15 7.5" {...stroke} />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="6" {...stroke} strokeWidth={1.6} />
    <path d="M13.5 13.5L17 17" {...stroke} strokeWidth={1.6} />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 4v12M4 10h12" {...stroke} strokeWidth={1.6} />
  </Icon>
);

export const FilterIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5h12l-4.6 5.5V15l-2.8 1.5v-6L4 5z" {...stroke} strokeWidth={1.5} />
  </Icon>
);

export const ArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10h12M10 4l6 6-6 6" {...stroke} />
  </Icon>
);

export const ArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12.5 15L7.5 10L12.5 5" {...stroke} />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon viewBox="0 0 28 28" {...p}>
    <path d="M6 14L11 19L22 9" {...stroke} strokeWidth={2.5} />
  </Icon>
);

export const XmarkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5l10 10M15 5L5 15" {...stroke} strokeWidth={1.6} />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 13V4M6.5 7.5L10 4l3.5 3.5" {...stroke} strokeWidth={1.6} />
    <path d="M4 13v2.5h12V13" {...stroke} strokeWidth={1.6} />
  </Icon>
);

export const PencilIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13.5 4.5l2 2L7 15l-2.5.5L5 13l8.5-8.5z" {...stroke} strokeWidth={1.5} />
  </Icon>
);

export const CircleCheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="10" r="8" {...stroke} strokeWidth={1.6} />
    <path d="M6.5 10l2.2 2.2L13.5 7.5" {...stroke} strokeWidth={1.6} />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" {...stroke} strokeWidth={1.6} />
    <path d="M8.5 9v4M11.5 9v4" {...stroke} strokeWidth={1.6} />
  </Icon>
);

/** Setas de ordenação (cabeçalho de tabela). */
export const SortIcon = (p: IconProps) => (
  <Icon {...p}>
    <path
      d="M7 8l-2.5-3L2 8M4.5 5v10M13 12l2.5 3 2.5-3M15.5 15V5"
      {...stroke}
      strokeWidth={1.4}
    />
  </Icon>
);

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

export const FirstPage = (p: IconProps) => (
  <PgIcon {...p}>
    <path d="M11 2L6 7l5 5M6 2L1 7l5 5" {...stroke} strokeWidth={1.4} />
  </PgIcon>
);

export const PrevPage = (p: IconProps) => (
  <PgIcon {...p}>
    <path d="M9 2L4 7l5 5" {...stroke} strokeWidth={1.4} />
  </PgIcon>
);

export const NextPage = (p: IconProps) => (
  <PgIcon {...p}>
    <path d="M5 2l5 5-5 5" {...stroke} strokeWidth={1.4} />
  </PgIcon>
);

export const LastPage = (p: IconProps) => (
  <PgIcon {...p}>
    <path d="M3 2l5 5-5 5M8 2l5 5-5 5" {...stroke} strokeWidth={1.4} />
  </PgIcon>
);

export const ChevronDownSmall = (p: IconProps) => (
  <PgIcon {...p}>
    <path d="M3 5l4 4 4-4" {...stroke} strokeWidth={1.4} />
  </PgIcon>
);

/** Chevron do acordeão (viewBox 15). */
export const AccordionChevron = (p: IconProps) => (
  <svg viewBox="0 0 15 15" fill="none" aria-hidden="true" focusable="false" {...p}>
    <path d="M3 5.5L7.5 10L12 5.5" {...stroke} />
  </svg>
);
