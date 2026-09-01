import type { SVGProps } from "react";

/**
 * Placeholder do brasão do Governo do Estado do Ceará (topbar).
 *
 * O protótipo referencia o brasão por uma URL efêmera do Figma MCP
 * (`src/assets/brand.ts`), que não pode ir para o app real. Este SVG é um
 * substituto local; o brasão oficial entra num passo de acabamento posterior
 * (ver TSD-002 §10.2). Usa `currentColor` — a cor vem do contexto (topbar).
 */
export function CearaLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 232 32"
      role="img"
      aria-label="Governo do Estado do Ceará"
      fill="none"
      {...props}
    >
      <rect x="0" y="0" width="32" height="32" rx="6" fill="currentColor" opacity="0.16" />
      <circle cx="16" cy="16" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path d="M16 8.5v15M8.5 16h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <text x="44" y="13.5" fill="currentColor" fontSize="10" fontWeight="700" letterSpacing="0.6">
        GOVERNO DO ESTADO
      </text>
      <text x="44" y="26" fill="currentColor" fontSize="10" fontWeight="400" letterSpacing="0.6">
        DO CEARÁ
      </text>
    </svg>
  );
}
