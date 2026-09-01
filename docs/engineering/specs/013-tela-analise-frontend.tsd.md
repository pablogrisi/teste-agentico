# TSD — Tela de análise: abas Checklist/Técnica + navegação livre (RF-010, frontend)

---
title: TSD - Tela de análise (RF-010, frontend)
type: tsd
status: em aprovação
created: 01/09/2026 // Vinicius
updated: 01/09/2026 // Vinicius
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
- Semântica definitiva da aba Técnica (P-04) — ver §9.
- Polling/atualização automática enquanto `PROCESSANDO` (recarregar é manual neste ciclo).

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

- [ ] `/analise/[id]` carrega `GET /analises/:id` pelo `AnalisesGateway`; nenhum componente chama HTTP direto.
- [ ] Cabeçalho mostra NUP, objeto, status (badge), responsável e datas.
- [ ] Painel de revisão tem abas **Checklist** e **Técnica**; clicar em qualquer uma alterna imediatamente, sem ordem obrigatória (RF-010 / PRD RF-010). Legislação/Outros aparecem desabilitadas.
- [ ] Cada aba lista os requisitos **agrupados por área**, na ordem recebida do backend; item em acordeão: recolhido = título + badge do `statusFinal`; expandido = descrição + norma + comentário (se houver) + "Página N" (texto).
- [ ] Barra de progresso reflete `resumo.verificados` / `resumo.total`.
- [ ] Análise `PENDENTE`/`PROCESSANDO` → mensagem "processando" no lugar da lista; `ERRO_PROCESSAMENTO` → `motivoErro`; `404` → página "análise não encontrada" com link para `/`.
- [ ] Nada interativo além da troca de aba e do expandir/recolher: checkbox desabilitado, sem modal de parecer, sem filtros, sem visor real.
- [ ] `abrirAnalise` existe nas duas gateways; `HttpAnalisesGateway.abrirAnalise` tem teste de contrato.
- [ ] `npm run ci` verde: `eslint .` + prettier, `tsc --noEmit`, testes (inclui contrato de `GET /analises/:id`), `next build`.
- [ ] §10 preenchida e revisada; screenshots das abas comparados com o protótipo — `frontend/docs/visual-reference/rf-010/`.

## 9. Riscos e decisões abertas

### Decisões da slice

- **Server Component + carga única:** `/analise/[id]` busca o detalhe no servidor a cada
  request (`dynamic`), sem polling. Enquanto `PROCESSANDO`, o analista recarrega a página para
  ver o resultado. Polling/refresh automático fica para um refinamento (ou entra junto de RF-007).
- **Abas por prefixo de `area`:** o backend usa `area` string com convenção que começa por
  `CHECKLIST`/`TECNICA` (RF-006). A aba Checklist agrega as áreas `CHECKLIST*`, Técnica as
  `TECNICA*`; qualquer outra área cai em "outras" (renderizada como um terceiro grupo dentro de
  Checklist, para não sumir dado — improvável no MVP).
- **Aba Técnica renderizada como Checklist:** o backend grava `statusFinal` para **todo**
  requisito ativo (TSD-006), inclusive Técnica. Então os itens de Técnica mostram badge de
  status igual aos de Checklist. **Divergência do protótipo** (que trata Técnica como
  "observações" neutras, sem status) — registrada na §10; a semântica definitiva é a P-04 e, se
  mudar, é um ajuste visual localizado.
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
| REF-06 | Painel de revisão — abas, progresso, lista em acordeão | `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/AnalysisPanel.tsx` | `AnalysisPanel` | aba Checklist; aba Técnica; item recolhido/expandido | Pendente |
| REF-07 | Item de requisito (acordeão) | `.../components/ChecklistItem.tsx` + `ObservationItem.tsx` | `ChecklistItem` / `ObservationItem` | recolhido; expandido | Pendente |
| REF-04 | Frame da tela de análise (dois painéis) | `.../AnalysisPage.tsx` + `PdfPanel.module.css` | `AnalysisPage` | frame (já inspecionado na TSD-002 §10 / REF-04) | Inspecionado (TSD-002) |

Screenshots obrigatórios: aba Checklist (itens recolhidos + um expandido), aba Técnica, estado
"processando"; comparação de enquadramento (abas, barra de progresso, grupo de área, acordeão)
com REF-06/REF-07. **Divergências a registrar:** aba Técnica com badge de status (protótipo:
neutra); filtros/checkbox/editar-parecer ausentes (entram em RF-009/011/008); Legislação/Outros
desabilitadas; sem "Progresso"/contadores de conclusão do protótipo além de verificados/total.

**Esta TSD não deve ser implementada enquanto o `Status de inspeção` de REF-06/REF-07 estiver
`Pendente`** — a inspeção do painel do protótipo e o preenchimento da §10 vêm antes de codar
(gate do `visual-reference-workflow`).

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
