function Icon({ size = 20, children, ...props }) {
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
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const ChevronDown = (p) => (
  <Icon {...p}>
    <path d="M5 7.5L10 12.5L15 7.5" {...stroke} />
  </Icon>
);

export const SearchIcon = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="6" {...stroke} strokeWidth={1.6} />
    <path d="M13.5 13.5L17 17" {...stroke} strokeWidth={1.6} />
  </Icon>
);

export const PlusIcon = (p) => (
  <Icon {...p}>
    <path d="M10 4v12M4 10h12" {...stroke} strokeWidth={1.6} />
  </Icon>
);

export const FilterIcon = (p) => (
  <Icon {...p}>
    <path d="M4 5h12l-4.6 5.5V15l-2.8 1.5v-6L4 5z" {...stroke} strokeWidth={1.5} />
  </Icon>
);

export const ArrowRight = (p) => (
  <Icon {...p}>
    <path d="M4 10h12M10 4l6 6-6 6" {...stroke} />
  </Icon>
);

export const ArrowLeft = (p) => (
  <Icon {...p}>
    <path d="M12.5 15L7.5 10L12.5 5" {...stroke} />
  </Icon>
);

export const CheckIcon = (p) => (
  <Icon viewBox="0 0 28 28" {...p}>
    <path d="M6 14L11 19L22 9" {...stroke} strokeWidth={2.5} />
  </Icon>
);

export const XmarkIcon = (p) => (
  <Icon {...p}>
    <path d="M5 5l10 10M15 5L5 15" {...stroke} strokeWidth={1.6} />
  </Icon>
);

export const UploadIcon = (p) => (
  <Icon {...p}>
    <path d="M10 13V4M6.5 7.5L10 4l3.5 3.5" {...stroke} strokeWidth={1.6} />
    <path d="M4 13v2.5h12V13" {...stroke} strokeWidth={1.6} />
  </Icon>
);

export const PencilIcon = (p) => (
  <Icon {...p}>
    <path d="M13.5 4.5l2 2L7 15l-2.5.5L5 13l8.5-8.5z" {...stroke} strokeWidth={1.5} />
  </Icon>
);

export const CircleCheckIcon = (p) => (
  <Icon {...p}>
    <circle cx="10" cy="10" r="8" {...stroke} strokeWidth={1.6} />
    <path d="M6.5 10l2.2 2.2L13.5 7.5" {...stroke} strokeWidth={1.6} />
  </Icon>
);

/** `trash-can` do Figma (280:6947), variante 16px — traçado exportado, sólido. */
export const TrashIcon = (p) => (
  <Icon {...p}>
    <path
      fill="currentColor"
      d="M7.27187 2.18437C7.40937 1.775 7.79063 1.5 8.22188 1.5H11.7812C12.2125 1.5 12.5937 1.775 12.7312 2.18437L13 3H16C16.5531 3 17 3.44687 17 4C17 4.55313 16.5531 5 16 5H4C3.44687 5 3 4.55313 3 4C3 3.44687 3.44687 3 4 3H7L7.27187 2.18437ZM4 6.5H16V16C16 17.1031 15.1031 18 14 18H6C4.89688 18 4 17.1031 4 16V6.5ZM6.75 8.5C6.33437 8.5 6 8.83437 6 9.25V15.25C6 15.6656 6.33437 16 6.75 16C7.16563 16 7.5 15.6656 7.5 15.25V9.25C7.5 8.83437 7.16563 8.5 6.75 8.5ZM10 8.5C9.58437 8.5 9.25 8.83437 9.25 9.25V15.25C9.25 15.6656 9.58437 16 10 16C10.4156 16 10.75 15.6656 10.75 15.25V9.25C10.75 8.83437 10.4156 8.5 10 8.5ZM13.25 8.5C12.8344 8.5 12.5 8.83437 12.5 9.25V15.25C12.5 15.6656 12.8344 16 13.25 16C13.6656 16 14 15.6656 14 15.25V9.25C14 8.83437 13.6656 8.5 13.25 8.5Z"
    />
  </Icon>
);

/** Setas de ordenação (cabeçalho de tabela). */
export const SortIcon = (p) => (
  <Icon {...p}>
    <path
      d="M7 8l-2.5-3L2 8M4.5 5v10M13 12l2.5 3 2.5-3M15.5 15V5"
      {...stroke}
      strokeWidth={1.4}
    />
  </Icon>
);

/* ── Paginador (viewBox 14) ── */
function PgIcon({ size = 14, children, ...props }) {
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

export const FirstPage = (p) => (
  <PgIcon {...p}>
    <path d="M11 2L6 7l5 5M6 2L1 7l5 5" {...stroke} strokeWidth={1.4} />
  </PgIcon>
);

export const PrevPage = (p) => (
  <PgIcon {...p}>
    <path d="M9 2L4 7l5 5" {...stroke} strokeWidth={1.4} />
  </PgIcon>
);

export const NextPage = (p) => (
  <PgIcon {...p}>
    <path d="M5 2l5 5-5 5" {...stroke} strokeWidth={1.4} />
  </PgIcon>
);

export const LastPage = (p) => (
  <PgIcon {...p}>
    <path d="M3 2l5 5-5 5M8 2l5 5-5 5" {...stroke} strokeWidth={1.4} />
  </PgIcon>
);

export const ChevronDownSmall = (p) => (
  <PgIcon {...p}>
    <path d="M3 5l4 4 4-4" {...stroke} strokeWidth={1.4} />
  </PgIcon>
);

/** Chevron do acordeão (viewBox 15). */
export const AccordionChevron = (p) => (
  <svg viewBox="0 0 15 15" fill="none" aria-hidden="true" focusable="false" {...p}>
    <path d="M3 5.5L7.5 10L12 5.5" {...stroke} />
  </svg>
);

/** pen-to-square — vetor exportado do Figma (Sumário/Linha-peça, ação editar). */
export const PenToSquareIcon = (p) => (
  <Icon {...p}>
    <path
      fill="currentColor"
      d="M16.7375 2.67813C16.0531 1.99375 14.9469 1.99375 14.2625 2.67813L13.5 3.44062L16.5594 6.5L17.3219 5.7375C18.0062 5.05312 18.0062 3.94688 17.3219 3.2625L16.7375 2.67813ZM7.3875 9.55313C7.19687 9.74375 7.05 9.97813 6.96562 10.2375L6.04063 13.0125C5.95 13.2813 6.02188 13.5781 6.22188 13.7813C6.42188 13.9844 6.71875 14.0531 6.99062 13.9625L9.76562 13.0375C10.0219 12.9531 10.2562 12.8063 10.45 12.6156L15.5 7.55938L12.4406 4.5L7.3875 9.55313ZM5 4C3.34375 4 2 5.34375 2 7V15C2 16.6563 3.34375 18 5 18H13C14.6562 18 16 16.6563 16 15V12C16 11.4469 15.5531 11 15 11C14.4469 11 14 11.4469 14 12V15C14 15.5531 13.5531 16 13 16H5C4.44687 16 4 15.5531 4 15V7C4 6.44688 4.44687 6 5 6H8C8.55313 6 9 5.55313 9 5C9 4.44687 8.55313 4 8 4H5Z"
    />
  </Icon>
);

/** minus — par do PlusIcon, usado no zoom do mapa do documento. */
export const MinusIcon = (p) => (
  <Icon {...p}>
    <path d="M4 10h12" {...stroke} strokeWidth={1.6} />
  </Icon>
);
