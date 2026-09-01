# TSD — Filtros por status + visão inicial priorizando não conformes (RF-009, frontend)

---
title: TSD - Filtros por status na tela de análise (RF-009, frontend)
type: tsd
status: em aprovação
created: 01/09/2026 // Vinicius
updated: 01/09/2026 // Vinicius
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/007-abrir-analise.tsd.md
- docs/engineering/specs/013-tela-analise-frontend.tsd.md
- docs/engineering/specs/014-status-ia-frontend.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

Slice de apresentação sobre o `PainelRevisao` do RF-010. Traz de volta os **chips de filtro
por status** (adiados do RF-010) e faz a tela abrir já **priorizando os não conformes**: o
filtro inicia em "Não conforme". Quando a aba corrente não tem nenhum item nesse status,
mostra uma mensagem clara e um atalho para "Todos" (PRD §9 — "nenhum item não conforme").

Sem mudança de contrato — o backend já entrega `avaliacoesPorArea` com os não conformes
primeiro e o `resumo` (TSD-007). Nenhuma chamada nova.

**User Story de origem:** `docs/product/roadmap.md`, RF-009 (recorte frontend).

## 2. Objetivo técnico

- `FiltroStatus` (client) — 4 chips: **Não conforme** (padrão), Conforme, Não se aplica, Todos;
  cor de ativo por status (padrão do protótipo).
- `filtrarPorStatus(grupos, filtro)` puro na camada de dados: mantém só os itens cujo
  `statusFinal` casa com o filtro; descarta grupos que ficam sem itens; ajusta a contagem do grupo.
- `PainelRevisao`: estado `filtro` (default `"NAO_CONFORME"`), compartilhado entre as abas;
  aplica o filtro na lista da aba corrente; estado "nenhum não conforme" com atalho "Ver todos".
- Testes: unit de `filtrarPorStatus`; componente de `FiltroStatus` e do `PainelRevisao`
  (filtro inicial, troca de filtro, grupos ocultos, estado "nenhum não conforme", filtro
  mantido ao trocar de aba).
- `npm run ci` verde; screenshots (filtro "Não conforme" ativo; "Todos"; aba sem não conformes)
  vs painel do protótipo.

## 3. Escopo

### Incluído

- `src/lib/data/filtro-requisito.ts` (novo):
  - `type FiltroRequisito = "NAO_CONFORME" | "CONFORME" | "NAO_SE_APLICA" | "TODOS"`.
  - `FILTRO_REQUISITO_OPCOES` (ordem dos chips) + `FILTRO_REQUISITO_LABEL`.
  - `filtrarPorStatus(grupos: AreaComItens[], filtro: FiltroRequisito): AreaComItens[]` — puro;
    `"TODOS"` devolve os grupos como estão; senão filtra `itens` por `statusFinal === filtro`,
    remove grupos vazios, não muta a entrada.
  - `contarPorFiltro(grupos, filtro): number` — total de itens que passam (para o estado vazio / evitar recontar).
- `src/components/analise/FiltroStatus.tsx` (+ `.module.css`, client) — `role="group"`, um
  `<button>` por opção, `aria-pressed`; ativo colorido (Não conforme = erro, Conforme = marca,
  Não se aplica = neutro, Todos = info); `onChange(filtro)`.
- `src/components/analise/PainelRevisao.tsx` (+ `.module.css`):
  - `useState<FiltroRequisito>("NAO_CONFORME")` — **compartilhado entre as abas** (trocar de aba
    não reseta o filtro).
  - Renderiza `FiltroStatus` abaixo da barra de progresso (posição do protótipo).
  - Aplica `filtrarPorStatus` à lista da aba ativa antes de passar para `ListaAba`.
  - **Estado "nenhum não conforme":** quando `filtro === "NAO_CONFORME"` e a aba ativa não tem
    itens não conformes → mensagem "Nenhum requisito não conforme nesta aba." + botão
    "Ver todos os requisitos" que faz `setFiltro("TODOS")`. (Para os outros filtros sem
    resultado: "Nenhum requisito neste filtro." — sem atalho.)
  - A legenda de "sugestões da IA" (RF-007) e o progresso continuam iguais.
- `src/lib/data/index.ts` — exporta os novos símbolos.
- Testes (Vitest + RTL): ver §7.1.

### Fora do escopo

- Reordenar a lista / ordenação alternativa — o backend já entrega não conformes primeiro (TSD-007).
- Busca textual dentro da análise; filtro por "verificado" / "pendente" (possível refinamento futuro).
- Persistir o filtro na URL — decisão da slice é **estado de client** (ver §9); trivial mudar depois.
- Contadores numéricos nos chips (o protótipo não tem).
- Edição de parecer (RF-008), verificado interativo (RF-011), comentário (RF-017), visor de PDF
  (RF-014), conclusão + modais de "etapa concluída" (RF-012).

## 4. Contexto consultado

- `docs/product/prd.md` — RF-009 (primeira visão destaca/filtra não conformes), RF-010 (navegação
  livre), §8 (Checklist/Técnica), §9 ("Nenhum item não conforme" → informar claramente + acesso fácil aos demais)
- `docs/architecture/sdd.md` — §7 "Abrir análise" item 2 (ordenação NAO_CONFORME primeiro, `resumo`)
- `docs/engineering/specs/013-tela-analise-frontend.tsd.md` — `PainelRevisao` (filtros adiados aqui),
  `RequisitoItem`, `separarPorAba`
- `docs/engineering/specs/014-status-ia-frontend.tsd.md` — legenda + `RequisitoItem` (não muda)
- `docs/product/glossario.md` — "Status do requisito" (3 valores; sem "Com ressalva")
- `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/AnalysisPanel.tsx` +
  `AnalysisPanel.module.css` — `.filters`/`.chip`/`.chipActive*`, `matchesFilter`, default
  `useState<ChecklistFilter>("nao-conforme")`

## 5. Impacto esperado

- **Produto:** ao abrir a análise, o analista já vê só os não conformes (o que mais importa —
  PRD RF-009), e alterna o recorte por status com um clique.
- **Arquitetura:** nenhuma — apresentação de dado já disponível.
- **Implementação:** `filtro-requisito.ts` + `FiltroStatus` + ajustes no `PainelRevisao`.
- **Testes:** unit de `filtrarPorStatus`; componente do filtro e do painel.
- **Documentação:** roadmap (RF-009 frontend), checkpoint, `.ai-dev/audit.md`, evidência visual.
- **Operação:** sem deploy.

## 6. Plano de implementação

1. `filtro-requisito.ts` (tipo, opções, `filtrarPorStatus`, `contarPorFiltro`) + export.
2. `FiltroStatus` (+ CSS) — portar `.filters`/`.chip`/`.chipActive*` do protótipo.
3. `PainelRevisao` — estado `filtro` (default `NAO_CONFORME`), renderizar `FiltroStatus`,
   aplicar filtro, estado "nenhum não conforme" com atalho.
4. Testes (unit + componente).
5. `npm run ci`; screenshots (filtro Não conforme; Todos; aba sem não conformes) vs protótipo.
6. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, evidência visual.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `filtrarPorStatus`: `"TODOS"` devolve tudo; cada status filtra por `statusFinal`; grupos que ficam vazios somem; não muta a entrada. `contarPorFiltro`. Componentes: `FiltroStatus` (4 chips, `aria-pressed`, `onChange` dispara com o valor certo, classe de ativo por status); `PainelRevisao` (abre em "Não conforme" mostrando só não conformes e ocultando grupos sem eles; clicar "Todos" mostra o resto; filtro mantido ao trocar de aba; aba sem não conformes no filtro padrão → mensagem + "Ver todos" leva a "TODOS"; estado processando/erro inalterado). |
| Integração (módulos/camadas reais) | Não nesta slice | Sem backend/dado novo; a cadeia é render + filtro puro, coberta no unitário. |
| Contrato (formato entre serviços) | Não nesta slice | Nenhum campo novo — `avaliacoesPorArea`/`statusFinal` já validados no contrato de `GET /analises/:id` (TSD-013). |
| Smoke/validação manual contra dependência externa real | Não | Sem chamada ao backend. |

Slice de interface: **screenshots** do painel com o filtro "Não conforme" (padrão), com "Todos",
e de uma aba sem não conformes (estado + atalho); comparação de enquadramento com o
`AnalysisPanel` do protótipo (`.filters`).

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run ci
```

## 8. Critérios de aceite

- [ ] O `PainelRevisao` mostra os 4 chips de filtro (Não conforme, Conforme, Não se aplica, Todos), com o ativo colorido.
- [ ] Ao abrir a tela, o filtro está em **"Não conforme"** e a lista mostra só os requisitos com `statusFinal = NAO_CONFORME`; grupos de área sem não conformes ficam ocultos.
- [ ] Clicar num chip troca o recorte; "Todos" mostra todos os requisitos da aba.
- [ ] Trocar de aba (Checklist ↔ Técnica) mantém o filtro selecionado.
- [ ] Aba corrente sem não conformes com o filtro "Não conforme" ativo → mensagem clara ("Nenhum requisito não conforme nesta aba.") + botão "Ver todos os requisitos" que passa o filtro para "Todos" (PRD §9).
- [ ] Estados `PROCESSANDO`/`ERRO_PROCESSAMENTO`/sem itens continuam como no RF-010 (sem chips, sem filtro).
- [ ] Nenhuma chamada nova ao backend; nenhum campo/tipo do contrato muda.
- [ ] `npm run ci` verde: `eslint .` + prettier, `tsc --noEmit`, testes, `next build`.
- [ ] §10 revisada; screenshots (Não conforme / Todos / aba sem não conformes) comparados com o protótipo — `frontend/docs/visual-reference/rf-009/`.

## 9. Riscos e decisões abertas

### Decisões da slice (a validar)

- **Filtro = estado de client**, não URL. É uma preferência de visualização transitória, como as
  abas do RF-010. Trivial migrar para `?filtro=` depois se o produto quiser links compartilháveis
  de "análise filtrada".
- **Filtro compartilhado entre as abas** (igual ao protótipo): trocar de aba não reseta o filtro.
- **Filtro por `statusFinal`** (parecer atual), não `statusSugeridoIa` — consistente com a
  ordenação do backend e com o badge principal do `RequisitoItem` (RF-007).
- **"Não se aplica" é um chip próprio** (o protótipo separa "Conforme" de "Não se aplica"); o MVP
  tem 3 status, então são 3 chips + "Todos". Sem chip de "Com ressalva" (não existe no MVP).
- **Grupos vazios somem** no filtro (comportamento do protótipo). A contagem do cabeçalho do
  grupo passa a ser a dos itens visíveis.
- **Estado vazio para filtros não-padrão** (ex.: "Conforme" sem resultado): mensagem simples, sem
  o atalho "Ver todos" (o atalho é a resposta ao caso do PRD §9, que é sobre não conformes).

### Riscos remanescentes

- **Sem caso real de "análise só com não conformes"** nas fixtures — o `AVALIACOES_EXEMPLO` tem
  mix; um teste com fixture forjada cobre "aba sem não conformes".
- **Interação com RF-007:** um item onde a IA divergiu mas o parecer atual é "Conforme" aparece
  sob o filtro "Conforme" (correto — filtro é por `statusFinal`). Coberto por teste.
- **Densidade visual:** progresso + legenda IA + chips empilhados acima da lista. Ajustar
  espaçamentos na inspeção visual se ficar apertado.

## 10. Referências visuais

Referência: `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/AnalysisPanel.tsx`
(+ `AnalysisPanel.module.css` — `.filters`, `.chip`, `.chipActive`, `.chipActiveError/Conforme/Na/Todos`).

| ID | Papel na aplicação | Link/localização | Nome na origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| REF-06 | Painel de revisão — barra de filtros | `.../components/AnalysisPanel.{tsx,module.css}` | `AnalysisPanel` (`.filters`) | filtro "Não-conforme" ativo (padrão); "Todos" | Inspecionado (RF-010 / TSD-013 §10) |

Do protótipo: `.filters` é uma linha de `.chip` (`padding: 4/8`, borda, `radius-8`, texto
caption semibold) logo abaixo da barra de progresso; o chip ativo perde a borda, ganha fundo
colorido por status (`chipActiveError` vermelho, `chipActiveConforme` verde, `chipActiveNa`
cinza forte, `chipActiveTodos` azul) e texto inverso. Default `"nao-conforme"`.

**Divergências intencionais a registrar:** o protótipo tem 4 chips porque separa
"Conforme"/"Com ressalva"; aqui são Não conforme / Conforme / Não se aplica / Todos (3 status
do MVP + Todos). O protótipo esconde grupos sem itens visíveis — mantido. O estado
"nenhum não conforme" + atalho "Ver todos" é acréscimo desta slice (PRD §9), não existe no
protótipo. Os modais de "etapa concluída" do protótipo não entram (RF-012).

Screenshots obrigatórios: painel com filtro "Não conforme" (padrão), com "Todos", e uma aba
sem não conformes (mensagem + atalho). Evidência em `frontend/docs/visual-reference/rf-009/`.

## 11. Rollback

Só `frontend/`. Rollback = reverter `PainelRevisao` ao estado do RF-007/RF-010, remover
`FiltroStatus`, `filtro-requisito.ts` e os testes desta slice. Nenhum contrato/tipo muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (015), a TSD-013/014 e o checkpoint.
Implemente só o escopo, em frontend/, na branch frontend/rf-009-filtros. Não faça merge sem
instrução. Traz de volta os chips de filtro por status no PainelRevisao (adiados do RF-010),
default "Não conforme"; filtrarPorStatus puro; filtro compartilhado entre abas; estado
"nenhum não conforme" com atalho "Ver todos" (PRD §9). Nenhuma chamada nova ao backend,
nenhum tipo do contrato muda. Escreva os testes previstos. Rode npm run ci e registre a
saída real. Screenshots (Não conforme / Todos / aba sem não conformes) vs protótipo.
Rode o Agente Crítico. Atualize roadmap, checkpoint e .ai-dev/audit.md.
Push da branch + merge na main + push da main.
```
