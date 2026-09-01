# Comparação visual — TSD-002 (fundação do frontend)

Evidência da validação visual da fundação (`.ai-dev/visual-reference-workflow.md`).
Esta slice implementa **só o frame/layout base e as cascas de rota** — não as telas
completas. A comparação é do **enquadramento** (Topbar, grid de layout, tokens), não de
fidelidade pixel a pixel (isso é dos ciclos por RF).

Capturado em 01/09/2026, viewport 1440×900, via Chrome (playwright-core), contra
`npm run build && npm run start` do frontend e `npm run dev` do protótipo.

| Arquivo                 | O que é                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `shell-home.png`        | Casca `/` implementada                                               |
| `prototipo-home.png`    | Referência REF-03 (`Prototipo Licia Analisadora`, rota `/`)          |
| `shell-analise.png`     | Casca `/analise/[id]` implementada                                   |
| `prototipo-analise.png` | Referência REF-04 (`Prototipo Licia Analisadora`, rota `/analise/1`) |

## Resultado da comparação

**REF-02 — Topbar:** ✓ enquadra igual. Altura 64px, gradiente verde-gov institucional,
seletor de usuário (pill) à direita com chevron, divisória inferior. Diferença
**intencional**: o protótipo carrega o brasão por uma URL do Figma MCP (quebrada na
captura); a casca usa um placeholder SVG local (TSD-002 §10.2).

**REF-03 — frame da HomePage:** ✓ enquadra igual. Breadcrumb "Início" + título "Lista de
análises" com regra inferior de 2px na cor de marca; área de conteúdo com o mesmo padding.
Tabela, busca, filtros e paginador **ausentes de propósito** — são o ciclo de RF-002.

**REF-04 — frame da AnalysisPage:** ✓ enquadra igual. Visor de PDF à esquerda (flexível,
fundo do visor), painel de revisão à direita (596px fixo, cantos esquerdos arredondados,
sem borda direita), ambos ocupando `calc(100vh - 64px)` com gap de 16px. Abas, progresso,
filtros por status, lista de requisitos e visor real **ausentes de propósito** — ciclos de
RF-010, RF-007/009, RF-008/011/017, RF-014.

Sem gaps de enquadramento remanescentes. Divergências protótipo × PRD tratadas na
TSD-002 §10.2 (sem trava de 1440px; 3 status; sem "responsável por linha").
