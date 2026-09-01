# Comparação visual — RF-009 (visão inicial priorizando não conformes + filtros por status)

Evidência da validação visual do ciclo RF-009 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 01/09/2026, viewport 1440×900, via Chrome (playwright-core), contra
`npm run build && npx next start -p 3200` do frontend (gateway de fixtures).

| Arquivo                             | O que é                                                                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rf009-nao-conforme.png`            | `/analise/1` — visão inicial: chip **"Não conforme"** ativo (vermelho), só os requisitos com `statusFinal = NAO_CONFORME`; grupos com contagem dos itens visíveis                               |
| `rf009-todos.png`                   | Mesmo item, chip **"Todos"** (azul) — todos os requisitos da aba                                                                                                                                |
| `rf009-grupo-vazio-placeholder.png` | `/analise/1`, filtro **"Não se aplica"** — "Dados gerais" fica com `0` itens mas **continua visível** com a linha "Nenhum requisito neste grupo com o filtro atual."; "Orcamento" mostra o item |
| `rf009-nenhum-nao-conforme.png`     | `/analise/7` (sem nenhum não conforme) — estado do PRD §9: "Nenhum requisito não conforme nesta aba." + botão **"Ver todos os requisitos"**                                                     |
| `rf009-ver-todos.png`               | Após "Ver todos os requisitos" — filtro passa para "Todos", lista revelada, URL `…/analise/7?requisitos=todos`                                                                                  |

Referência: **REF-06** — `AnalysisPanel` do protótipo (`.filters` / `.chip` / `.chipActive*`),
já inspecionada no RF-010 / TSD-013 §10. Imagem do painel do protótipo em
`../rf-007/prototipo-painel.png`.

## Resultado da comparação (REF-06)

**Enquadramento:** ✓ A barra de chips fica logo abaixo da barra de progresso, com a mesma
anatomia do protótipo (`padding 4/8`, borda, `radius-8`, caption semibold; chip ativo sem
borda, fundo colorido por status, texto inverso). Ordem: Não conforme · Conforme ·
Não se aplica · Todos. Visão inicial em "Não conforme".

**Divergências intencionais** (TSD-015 §9 / §10 — decisões validadas pelo usuário em 01/09/2026):

- **3 chips de status + "Todos"** (o protótipo tem 4 porque separa "Conforme"/"Com ressalva";
  o MVP tem 3 status de requisito).
- **Grupos sem itens no filtro continuam visíveis** com uma linha de placeholder — o protótipo
  oculta o grupo. Decisão do usuário ("pode deixar aparecendo").
- **Filtro persistido na URL** (`?requisitos=<slug>`, omitido quando `= Não conforme`) — o
  protótipo usa só estado de client. Sobrevive a F5 e ao polling; compartilhável por link.
- **Estado "nenhum não conforme" + atalho "Ver todos os requisitos"** — acréscimo desta slice
  (PRD §9), não existe no protótipo.
- Filtro por `statusFinal` (parecer atual — a IA só sugere) e **compartilhado entre as abas**.

**Ponto de atenção:** o chip "Não se aplica" ativo usa `--color-border-strong` como fundo
(token do protótipo, `.chipActiveNa`); o contraste com o texto inverso é o mesmo do protótipo.

Sem gaps de enquadramento remanescentes para o escopo da slice.
