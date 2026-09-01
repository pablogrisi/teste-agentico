# TSD — Tela de análise: abas Checklist/Técnica + navegação livre (RF-010, frontend)

---
title: TSD - Tela de análise (RF-010, frontend)
type: tsd
status: implementada na branch frontend/rf-010-tela-analise
created: 01/09/2026 // Vinicius
updated: 01/09/2026 // Vinicius (decisões validadas: Técnica fiel ao backend; polling ligado; §10 inspecionada)
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/007-abrir-analise.tsd.md
- docs/engineering/specs/012-nova-analise-frontend.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

Terceiro ciclo de feature de produto do frontend. Transforma `/analise/[id]` (hoje casca da
TSD-002) na **tela de análise real**: carrega `GET /analises/:id` pelo seam de dados e
renderiza o cabeçalho da análise + o frame de dois painéis, com o **painel de revisão**
mostrando as abas **Checklist** e **Técnica**, **navegação livre** entre elas, e a lista de
requisitos avaliados (agrupada por área, em acordeão, **somente leitura**) + barra de
progresso.

Não inclui filtros, edição de parecer, marcação de verificado, comentário, visor de PDF real
nem conclusão — cada um é um ciclo próprio a seguir (RF-009, RF-008, RF-011, RF-017, RF-014,
RF-012).

**User Story de origem:** `docs/product/roadmap.md`, RF-010 (recorte frontend).

## 2. Objetivo técnico

- `AnalisesGateway.abrirAnalise(id): Promise<AnaliseDetalhe>` nas duas implementações
  (`Fixtures` e `Http`) + teste de contrato do payload de `GET /analises/:id`.
- `/analise/[id]` = Server Component que busca o detalhe e renderiza; `not-found`/erro tratados.
- `AnaliseHeader` (NUP, objeto, badge de status, responsável, datas).
- `PainelRevisao` (client): abas Checklist/Técnica com navegação livre, barra de progresso
  a partir do `resumo`, lista de requisitos por área em acordeão read-only.
- `RequisitoItem` (accordion): recolhido = título + `StatusBadgeRequisito`; expandido =
  descrição, norma, comentário, referência de página (texto).
- `npm run ci` verde; screenshots das duas abas comparados com o painel do protótipo.

## 3. Escopo

### Incluído

- **Camada de dados** (`src/lib/data/`):
  - `types.ts` — `AnaliseDetalhe`, `ResumoAnalise`, `AreaComItens`, `AvaliacaoItem`,
    `NormaReferencia`, `StatusRequisito` (já existe). Espelham o payload de `GET /analises/:id`
    (SDD §7 / TSD-007 + TSD-009 + TSD-010): campos da análise + `analistaId`/`analistaNome` +
    `totalPaginasPdf` + `resumo` + `avaliacoesPorArea`.
  - `analise-detalhe.ts` — `AREA_CHECKLIST_PREFIXO = "CHECKLIST"`, `AREA_TECNICA_PREFIXO = "TECNICA"`;
    `separarPorAba(avaliacoesPorArea)` → `{ checklist: AreaComItens[], tecnica: AreaComItens[], outras: AreaComItens[] }`;
    `rotuloArea(area)` (remove o prefixo, formata para exibição).
  - `analises-gateway.ts` — `abrirAnalise(id): Promise<AnaliseDetalhe>` na interface;
    `AnaliseNaoEncontradaError extends AnalisesGatewayError` (para o `404`).
  - `fixtures-analise-detalhe.ts` (novo) — fixtures de `AnaliseDetalhe` por `id`: pelo menos
    uma `PRONTA_PARA_REVISAO` com áreas Checklist + Técnica e mix de status, uma `PROCESSANDO`,
    uma `ERRO_PROCESSAMENTO`. Os `id` batem com os de `fixtures.ts` da listagem.
  - `fixtures-analises-gateway.ts` — `abrirAnalise` devolve a fixture; `id` desconhecido →
    `AnaliseNaoEncontradaError`.
  - `http-analises-gateway.ts` — `abrirAnalise` = `GET {base}/analises/{id}`; `404` →
    `AnaliseNaoEncontradaError`; `5xx`/rede → `AnalisesGatewayError`; valida o formato do payload
    (`validarAnaliseDetalhe`).
  - `index.ts` — exporta os novos símbolos.
- **Rota** `src/app/analise/[id]/page.tsx` (reescrita): Server Component `async` que resolve
  `params`, chama `getAnalisesGateway().abrirAnalise(id)`; `AnaliseNaoEncontradaError` →
  `notFound()`; outros erros propagam para `error.tsx`. `src/app/analise/[id]/not-found.tsx`
  (novo) com link para `/`.
- **Componentes** `src/components/analise/`:
  - `AnaliseHeader` — NUP, objeto, `StatusBadge` (reusa o da listagem), responsável
    (`analistaNome`), `iniciadaEm`/`concluidaEm`.
  - `AnaliseVisorPlaceholder` — mantém o espaço do visor de PDF (RF-014).
  - `PainelRevisao` (client) — estado `aba` (`"checklist" | "tecnica"`), navegação livre
    (clicar em qualquer aba, sem ordem); abas Legislação/Outros renderizadas **desabilitadas**
    (`aria-disabled`); barra de progresso (`resumo.verificados` / `resumo.total`); por aba,
    grupos de `AreaComItens` com cabeçalho (rótulo da área + contagem) e a lista de
    `RequisitoItem`. Estado "sem itens" por aba. Quando a análise não está pronta
    (`avaliacoesPorArea` vazio): mensagem "processando" / `motivoErro`.
  - `AutoRefreshAnalise` (client) — enquanto `status ∈ {PENDENTE, PROCESSANDO}`, chama
    `router.refresh()` num intervalo (`ANALISE_POLL_MS`, ~4 s); para de reagendar assim que o
    status sai desse conjunto; limpa o timer no unmount. É o único mecanismo de atualização
    (o Server Component re-busca a cada refresh).
  - `RequisitoItem` (client, accordion) — recolhido: `checkbox` **desabilitado** (placeholder
    de RF-011) + título + `StatusBadgeRequisito` + chevron; expandido: descrição, `NormaTexto`
    (lei art. inciso …), comentário (se houver), "Página N do PDF" como **texto** (RF-014 torna
    clicável). Sem botão "editar parecer" (RF-008).
  - `StatusBadgeRequisito` — badge para `StatusRequisito` (`CONFORME`/`NAO_CONFORME`/`NAO_SE_APLICA`)
    com rótulo PT e tom de cor (verde / vermelho / cinza).
- Ícones novos se necessário (chevron do acordeão — pode reusar `ChevronDownIcon`).
- Testes (Vitest + RTL): `analise-detalhe` (separar por aba, rótulo de área),
  `fixtures-analises-gateway` (`abrirAnalise` ok / 404), `http-analises-gateway` (`abrirAnalise`
  — contrato: URL, mapeamento, `404`, payload inválido), `painel-revisao` (render das abas,
  troca livre de aba, progresso, estado processando), `requisito-item` (recolhido/expandido,
  badge), `analise-header`.

### Fora do escopo

- Filtros por status / "priorizar não conformes" na UI (o backend já ordena) → **RF-009**.
- Diferenciar visualmente `statusSugeridoIa` de `statusFinal` → **RF-007**.
- Marcar "verificado" de verdade (o checkbox fica desabilitado) → **RF-011**.
- Modal de alteração de `statusFinal` → **RF-008**; comentário obrigatório → **RF-017**.
- Visor de PDF real + `#page=N` clicável → **RF-014** (o espaço fica placeholder).
- Modal de conclusão / botão global → **RF-012**.
- Semântica definitiva da aba Técnica (P-04) — ver §9 (neste ciclo, decisão validada: fiel ao backend).

## 4. Contexto consultado

- `docs/product/prd.md` — RF-010, RF-009, §8 (Checklist/Técnica, ordem livre), §9 (nenhum não conforme; erro de carregamento; erro no processamento)
- `docs/architecture/sdd.md` — §7 "Abrir análise / listar" item 2 (payload final de `GET /analises/:id`)
- `docs/engineering/specs/007-abrir-analise.tsd.md` — `AnaliseDetalhe`, `avaliacoesPorArea`, `resumo`, ordenação
- `docs/engineering/specs/009-*`, `010-*` — `totalPaginasPdf`, `analistaId`/`analistaNome` no payload
- `docs/engineering/specs/012-nova-analise-frontend.tsd.md` — seam de dados, padrão de gateway
- `docs/product/glossario.md` — "Avaliação de requisito", "Verificado", "Checklist", "Técnica" (P-04), "Referência de página"
- `Prototipo Licia Analisadora/src/routes/AnalysisPage/` — `AnalysisPanel`, `ChecklistItem`, `ObservationItem`, `PdfPanel`
- `.ai-dev/visual-reference-workflow.md`, `.ai-dev/quality-gates.md`

## 5. Impacto esperado

- **Produto:** a tela de análise passa a existir — o analista abre uma análise e lê os
  requisitos avaliados nas duas abas.
- **Arquitetura:** `AnalisesGateway` ganha `abrirAnalise`; consolida no frontend o contrato de
  leitura da análise. Nenhuma decisão nova.
- **Implementação:** rota `/analise/[id]` real + componentes de painel/itens + tipos do detalhe.
- **Testes:** teste de contrato de `GET /analises/:id` no frontend; testes de componente do painel.
- **Documentação:** roadmap (RF-010 frontend), checkpoint, `.ai-dev/audit.md`, evidência visual.
- **Operação:** sem deploy.

## 6. Plano de implementação

1. Tipos do `AnaliseDetalhe` + `analise-detalhe.ts` (separar por aba, rótulo de área).
2. `AnalisesGateway.abrirAnalise` + `AnaliseNaoEncontradaError`; implementar nas duas gateways.
3. `fixtures-analise-detalhe.ts`.
4. `StatusBadgeRequisito`, `RequisitoItem`, `PainelRevisao`, `AnaliseHeader`, `AnaliseVisorPlaceholder`.
5. `app/analise/[id]/page.tsx` (Server Component) + `not-found.tsx`.
6. Testes (unit + contrato + componente).
7. `npm run ci`; screenshots das abas; comparação com o painel do protótipo.
8. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, evidência visual.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `separarPorAba` (prefixos CHECKLIST/TECNICA, "outras" áreas, ordem preservada), `rotuloArea`. `FixturesAnalisesGateway.abrirAnalise` (ok / `404`). Componentes: `PainelRevisao` (renderiza as duas abas, alterna livremente, progresso do `resumo`, estado "processando" quando `avaliacoesPorArea` vazio), `RequisitoItem` (recolhido → expande → mostra descrição/norma/comentário/página; badge do `statusFinal`; checkbox desabilitado), `AnaliseHeader`. |
| Integração (módulos/camadas reais) | Não nesta slice | Sem backend/servidor real; a cadeia rota→gateway→(fixtures) é coberta no unitário. Integração real entra quando houver ambiente conjunto. |
| Contrato (formato entre serviços que não sobem juntos) | Sim | `HttpAnalisesGateway.abrirAnalise` consome `GET /analises/:id` (TSD-007 + 009 + 010). `test/unit/http-analises-gateway.test.ts` valida: URL `{base}/analises/{id}`, mapeamento de um payload completo (`resumo` + `avaliacoesPorArea` + `analistaNome` + `totalPaginasPdf`), `404` → `AnaliseNaoEncontradaError`, `5xx`/rede → `AnalisesGatewayError`, payload sem `avaliacoesPorArea`/`resumo` ou item sem campo obrigatório → rejeitado. |
| Smoke/validação manual contra dependência externa real | Não | Backend não está no ar aqui; `NEXT_PUBLIC_API_BASE_URL` desligada. |

Slice de interface: **screenshots** das abas Checklist e Técnica (com itens expandidos e
recolhidos) e do estado "processando"; comparação de enquadramento com `AnalysisPanel` do protótipo.

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run ci
```

## 8. Critérios de aceite

- [x] `/analise/[id]` carrega `GET /analises/:id` pelo `AnalisesGateway`; nenhum componente chama HTTP direto.
- [x] Cabeçalho mostra NUP, objeto, status (badge), responsável e datas.
- [x] Painel de revisão tem abas **Checklist** e **Técnica**; clicar em qualquer uma alterna imediatamente, sem ordem obrigatória (RF-010 / PRD RF-010). Legislação/Outros aparecem desabilitadas.
- [x] Cada aba lista os requisitos **agrupados por área**, na ordem recebida do backend; item em acordeão: recolhido = título + badge do `statusFinal`; expandido = descrição + norma + comentário (se houver) + "Página N" (texto).
- [x] Barra de progresso reflete `resumo.verificados` / `resumo.total`.
- [x] Análise `PENDENTE`/`PROCESSANDO` → mensagem "processando" no lugar da lista **e polling** (`router.refresh()` a cada ~4 s) que para sozinho quando o status sai desse conjunto; `ERRO_PROCESSAMENTO` → `motivoErro` (sem polling); `404` → página "análise não encontrada" com link para `/`.
- [x] Nada interativo além da troca de aba e do expandir/recolher: checkbox desabilitado, sem modal de parecer, sem filtros, sem visor real.
- [x] `abrirAnalise` existe nas duas gateways; `HttpAnalisesGateway.abrirAnalise` tem teste de contrato.
- [x] `npm run ci` verde: `eslint .` + prettier, `tsc --noEmit`, testes (inclui contrato de `GET /analises/:id`), `next build`.
- [x] §10 preenchida e revisada; screenshots das abas comparados com o protótipo — `frontend/docs/visual-reference/rf-010/`.

## 9. Riscos e decisões abertas

### Decisões da slice (validadas pelo responsável — 01/09/2026)

- **Server Component + polling client:** `/analise/[id]` busca o detalhe no servidor a cada
  request (`dynamic`). Enquanto `status ∈ {PENDENTE, PROCESSANDO}`, o `AutoRefreshAnalise`
  (client) chama `router.refresh()` a cada `ANALISE_POLL_MS` (~4 s) e para de reagendar quando
  o status sai desse conjunto. `ERRO_PROCESSAMENTO` não faz polling (o analista reprocessa no
  backend). Sem WebSocket/SSE no MVP.
- **Aba Técnica fiel ao backend:** o backend grava `statusFinal` para **todo** requisito ativo
  (TSD-006), inclusive Técnica. Decisão validada: a aba Técnica renderiza os itens **iguais aos
  de Checklist**, com badge de `statusFinal`. **Divergência do protótipo** (que trata Técnica
  como "observações" neutras, sem status) — registrada na §10. Se a P-04 fechar noutro sentido,
  é um ajuste visual localizado no `RequisitoItem`/aba.
- **Abas por prefixo de `area`:** o backend usa `area` string com convenção que começa por
  `CHECKLIST`/`TECNICA` (RF-006). A aba Checklist agrega as áreas `CHECKLIST*`, Técnica as
  `TECNICA*`; qualquer outra área cai em "outras" (renderizada como um terceiro grupo dentro de
  Checklist, para não sumir dado — improvável no MVP).
- **Somente leitura:** o checkbox de "verificado" aparece **desabilitado** (placeholder visual
  de RF-011) para o enquadramento bater com o protótipo; nada é editável neste ciclo.
- **`AnaliseDetalhe` no frontend espelha o payload atual** (TSD-004+007+009+010). Se o backend
  evoluir o contrato, o `validarAnaliseDetalhe` do gateway HTTP acusa a divergência.

### Riscos remanescentes

- **Sem smoke contra o backend real** (sem ambiente conjunto): `abrirAnalise` HTTP validado só
  por teste de contrato com payload de exemplo. Refazer smoke abrir análise quando houver ambiente.
- **Payload grande** com a base real (~300 avaliações) — a tela renderiza tudo de uma vez;
  virtualização/paginação por área fica para depois se pesar (já anotado na TSD-007 §9).
- **Fixtures de detalhe podem divergir do formato real** em detalhes sutis (ex.: `norma` com
  campos nulos, `paginaReferencia` nula). Mitigado por espelhar o exemplo do contrato.

## 10. Referências visuais

Referência: `Prototipo Licia Analisadora/src/routes/AnalysisPage/` — `AnalysisPanel`,
`ChecklistItem`, `ObservationItem`, `PdfPanel`.

| ID | Papel na aplicação | Link/localização | Nome na origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| REF-06 | Painel de revisão — abas, progresso, lista em acordeão | `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/AnalysisPanel.{tsx,module.css}` | `AnalysisPanel` | aba Checklist; aba Técnica; item recolhido/expandido | Inspecionado — 01/09/2026 (Vinicius) |
| REF-07 | Item de requisito (acordeão) | `.../components/ChecklistItem.tsx` + `ObservationItem.tsx` | `ChecklistItem` / `ObservationItem` | recolhido; expandido | Inspecionado — 01/09/2026 (Vinicius) |
| REF-04 | Frame da tela de análise (dois painéis) | `.../AnalysisPage.tsx` + `PdfPanel.module.css` | `AnalysisPage` | frame (já inspecionado na TSD-002 §10 / REF-04) | Inspecionado (TSD-002) |

### 10.1 Observações da inspeção (01/09/2026)

**REF-06 — `AnalysisPanel`** (`.module.css`):

- `.panel` — largura fixa **596px**, altura total, fundo card, borda com `--radius-8` só nos
  cantos esquerdos, `border-right: none`, `overflow: hidden`. (É o painel direito do frame
  REF-04; nesta slice o `PainelRevisao` ocupa esse espaço.)
- `.tabs` — barra de abas `flex`, `gap: --spacing-16`, `padding: 0 --spacing-32 0 --spacing-16`,
  `border-bottom: 1px solid --color-border-default`. Cada `.tab`: altura 44px, `padding-bottom`
  negativo de −1px (a aba ativa "come" a borda), `border-bottom: 2px solid transparent`.
  - `.tabActive` → `border-bottom-color: --color-brand-default`; label em `--color-brand-default`.
  - `.tabInactive` (Legislação/Outros) → `cursor: default`, label em `--color-text-disabled`.
  - `.tabBadge` — pílula 24×24, `--radius-12`, fundo `--color-bg-hover` / (ativa) `--color-brand-muted`.
    No protótipo o badge do Checklist é a contagem de não-conformes; da Técnica é o total.
- `.progress` — bloco com `.progressRow` (label "Progresso da análise" + contador
  "X/Y itens verificados") e `.progressBar` (4px, `--color-border-default`) com `.progressFill`
  (`--color-brand-default`, `transition: width .3s`).
- `.filters` — linha de `.chip` (chips de filtro por status). **Fora do escopo desta slice
  (RF-009)** — o `PainelRevisao` não renderiza os filtros ainda.
- `.list` — coluna rolável (`overflow-y: auto`), `gap: --spacing-8`, `padding` assimétrico,
  fundo `--color-bg-page`.
- `.group` — `.groupHeader` (`.groupLabel` bold caption + `.groupBadge` 20×20 com a contagem)
  + `.items` (coluna, `gap: --spacing-8`).

**REF-07 — `ChecklistItem` / `ObservationItem`**:

- `.item` — `border-left: 4px solid var(--accent)` + `--radius-8`; o `--accent` vem da classe
  de status: `.itemSuccess` = verde de marca, `.itemError` = vermelho, `.itemNa` = cinza forte,
  `.itemObs` = azulado (`--color-obs-accent`). `.itemInner` = card branco com borda; aberta
  (`.itemOpen`) a borda fica na cor do accent.
- `.itemHeader` — `flex`, `gap: --spacing-16`, `padding: --spacing-12 --spacing-16`,
  `border-bottom`, clicável (alterna o acordeão; cliques no checkbox/links não propagam).
  Dentro: `.checkbox` (18×18, `appearance: none`, borda 2px; `:checked` fica verde com o
  "tick" via `::after`; `:disabled` → `opacity: .4`), `.itemText` (`.question` = texto do
  requisito; `.pages` = "p. 18–22" clicável — **RF-014**), e à direita `.status`
  (`.statusLabel` na cor do status + `.chevron` 15px que rotaciona 180° quando aberto).
- `.detail` (só quando aberto) — `.detailRow` com `.detailText` (o texto da análise/IA);
  `.detailActions` com "Ver p. …" (**RF-014**) e "Alterar parecer" (**RF-008**) —
  **ambos fora do escopo**. `ObservationItem` (Técnica) não tem `.status` nem `.detailActions`
  no protótipo (item neutro) — nesta slice, por decisão validada, a Técnica passa a ter o
  badge de `statusFinal` como o Checklist.

### 10.2 Divergências intencionais em relação ao protótipo

- **Aba Técnica com badge de `statusFinal`** (protótipo: "observações" neutras sem status) —
  decisão validada, o backend entrega status para todo requisito (P-04).
- **Sem filtros por status** (chips) → RF-009. **Sem checkbox interativo** (fica desabilitado)
  → RF-011. **Sem "Alterar parecer"** → RF-008. **Sem "Ver p." clicável** ("Página N" é texto)
  → RF-014. **Sem modais de conclusão / toasts** → RF-012.
- **Legislação / Outros** aparecem como abas desabilitadas (indisponíveis no MVP — glossário).
- **Badge das abas** = contagem de itens da aba (não "não-conformes" no Checklist como o
  protótipo) — simplificação; a priorização de não conformes é RF-009.
- **Progresso** = `resumo.verificados / resumo.total` para as duas abas (o protótipo tem
  contadores separados por aba com totais "verificáveis"); os contadores de conclusão de etapa
  do protótipo não entram (RF-012).
- Sem trava `min-width: 1440px` (herdado da TSD-002); o painel mantém os 596px fixos.

Screenshots obrigatórios: aba Checklist (itens recolhidos + um expandido), aba Técnica, estado
"processando"; comparação de enquadramento (abas, barra de progresso, grupo de área, acordeão)
com REF-06/REF-07. Evidência em `frontend/docs/visual-reference/rf-010/`.

## 11. Rollback

Só `frontend/`. Rollback = restaurar `app/analise/[id]/page.tsx` para a casca da TSD-002,
remover `not-found.tsx`, `src/components/analise/`, `src/lib/data/fixtures-analise-detalhe.ts`,
`analise-detalhe.ts`, o método `abrirAnalise` das gateways e da interface,
`AnaliseNaoEncontradaError`, os tipos do detalhe e os testes desta slice. Nenhum contrato de
backend muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (013), a TSD-007 (contrato) e o checkpoint.
Implemente só o escopo, em frontend/, na branch frontend/rf-010-tela-analise. Não faça merge.
/analise/[id] carrega GET /analises/:id pelo AnalisesGateway.abrirAnalise. Painel com abas
Checklist/Técnica e navegação livre; lista de requisitos por área em acordeão, SOMENTE LEITURA
(checkbox desabilitado, sem modal de parecer, sem filtros, sem visor real). Estados
processando / erro / 404. Antes de codar, inspecione AnalysisPanel/ChecklistItem/ObservationItem
do protótipo e preencha a §10. Escreva os testes previstos, incl. contrato de GET /analises/:id.
Rode npm run ci e registre a saída real. Screenshots das abas vs protótipo.
Atualize roadmap, checkpoint e .ai-dev/audit.md. Push da branch + merge na main + push da main.
```
