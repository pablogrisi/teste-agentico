# TSD — Exibição do status sugerido pela IA (RF-007, frontend)

---
title: TSD - Status sugerido pela IA na tela de análise (RF-007, frontend)
type: tsd
status: implementada na branch frontend/rf-007-status-ia — Crítico aprovou
created: 01/09/2026 // Vinicius
updated: 01/09/2026 // Vinicius
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/007-abrir-analise.tsd.md
- docs/engineering/specs/013-tela-analise-frontend.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

Slice pequena e puramente de apresentação, em cima do `RequisitoItem` criado no RF-010. Cada
requisito da tela de análise passa a mostrar o **status sugerido pela IA** (`statusSugeridoIa`)
de forma identificável, e a **destacar a divergência** quando o parecer atual (`statusFinal`)
já difere da sugestão. O backend já entrega os dois campos no `GET /analises/:id` — **nenhuma
mudança de contrato, nenhuma chamada nova**.

Como a edição do parecer (RF-008) ainda não existe, hoje `statusFinal === statusSugeridoIa`
para todos os itens; o caminho "diverge da IA" fica implementado e testado, pronto para RF-008.

**User Story de origem:** `docs/product/roadmap.md`, RF-007 (recorte frontend).

## 2. Objetivo técnico

- `RequisitoItem` mostra `statusSugeridoIa`:
  - recolhido: badge do status marcado como sugestão da IA quando igual ao final; quando
    difere, indicador secundário "IA: <sugestão>" ao lado do badge do parecer atual.
  - expandido: linha "Sugestão da IA: <status>"; se difere, linha "Parecer atual: <status>" +
    realce de divergência.
- `PainelRevisao`: nota curta no topo da lista ("Os status são sugestões da IA; o parecer
  final é definido na revisão.").
- Helper puro `divergeDaIa(item)` na camada de dados.
- Testes de componente cobrindo os dois casos (igual / diferente).
- `npm run ci` verde; screenshots do item (igual e — via fixture — divergente) vs protótipo.

## 3. Escopo

### Incluído

- `src/lib/data/analise-detalhe.ts` — `divergeDaIa(item: AvaliacaoItem): boolean`
  (`item.statusFinal !== item.statusSugeridoIa`). Exportado no `index.ts`.
- `src/components/analise/RequisitoItem.tsx` (+ `.module.css`):
  - **Recolhido:**
    - `statusSugeridoIa === statusFinal` → o badge já existente ganha um marcador discreto de
      "sugestão da IA" (ícone/rótulo "IA" no badge, ou caption "sugerido pela IA" abaixo do
      título). O badge continua sendo o `statusFinal`.
    - `statusSugeridoIa !== statusFinal` → além do badge do `statusFinal`, um chip secundário
      atenuado "IA: <STATUS_REQUISITO_LABEL[statusSugeridoIa]>" e uma marca de divergência
      (ex.: borda/realce no item).
  - **Expandido:** bloco novo antes da descrição:
    - "Sugestão da IA: <status>" sempre.
    - Se `divergeDaIa` → "Parecer atual: <status>" + destaque de divergência.
- `src/components/analise/PainelRevisao.tsx` (+ `.module.css`): uma linha de legenda acima da
  `.lista` (quando há itens) explicando que os status são sugestões da IA.
- `src/components/analise/StatusIaResumo.tsx` (novo, pequeno) — o bloco "Sugestão da IA / Parecer
  atual" reutilizável pelo `RequisitoItem` (mantém o `RequisitoItem` legível).
- Testes (Vitest + RTL): `analise-detalhe` (`divergeDaIa`); `requisito-item` (recolhido igual →
  marca de IA; recolhido diferente → chip "IA: X" + divergência; expandido → linhas de sugestão
  e parecer); `painel-revisao` (legenda aparece quando há itens, some quando não há).

### Fora do escopo

- Editar `statusFinal` / alterar o parecer → **RF-008** (é o que passa a produzir divergência real).
- Marcar verificado → **RF-011**; comentário → **RF-017**; filtros → **RF-009**.
- Qualquer chamada ao backend ou mudança de contrato/tipos (`statusSugeridoIa` já existe em
  `AvaliacaoItem`).
- Tooltip/ajuda rica, ícone de "IA" ilustrado — um rótulo textual basta no MVP.

## 4. Contexto consultado

- `docs/product/prd.md` — RF-007 (status inicial sugerido pela IA; 3 valores), §8 (a IA sugere,
  o analista decide)
- `docs/architecture/sdd.md` — §7 "Abrir análise" item 2 (`statusSugeridoIa` + `statusFinal` no payload)
- `docs/engineering/specs/007-abrir-analise.tsd.md` — item `AvaliacaoItem`
- `docs/engineering/specs/013-tela-analise-frontend.tsd.md` — `RequisitoItem`, `PainelRevisao`, `StatusBadgeRequisito`
- `docs/product/glossario.md` — "Status do requisito" (sugerido pela IA vs final)
- `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/` — `ChecklistItem` (o protótipo
  mostra só o status atual; não distingue "sugerido pela IA" — divergência a registrar)

## 5. Impacto esperado

- **Produto:** o analista passa a ver que o status é uma **sugestão da IA** e quando o parecer
  já foi alterado (atende ao critério de aceite do PRD RF-007).
- **Arquitetura:** nenhuma — só apresentação de campo já disponível.
- **Implementação:** `RequisitoItem` + `PainelRevisao` + 1 helper + 1 componente pequeno.
- **Testes:** componente (dois casos de divergência) + unit do helper.
- **Documentação:** roadmap (RF-007 frontend), checkpoint, `.ai-dev/audit.md`, evidência visual.
- **Operação:** sem deploy.

## 6. Plano de implementação

1. `divergeDaIa` em `analise-detalhe.ts` + export.
2. `StatusIaResumo` (bloco "Sugestão da IA / Parecer atual").
3. `RequisitoItem` — marca de IA no recolhido; chip secundário + realce quando diverge; bloco no expandido.
4. `PainelRevisao` — legenda acima da lista.
5. Testes (unit + componente).
6. `npm run ci`; screenshots (item igual; item divergente via fixture ad hoc no teste/preview) vs protótipo.
7. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, evidência visual.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `divergeDaIa` (igual → `false`, diferente → `true`). Componentes: `RequisitoItem` (recolhido igual = marca "IA" no badge, sem chip secundário; recolhido diferente = chip "IA: <sugestão>" + marca de divergência; expandido = "Sugestão da IA: X" sempre, "Parecer atual: Y" só quando diverge), `PainelRevisao` (legenda de IA visível com itens, ausente sem itens / no estado processando). |
| Integração (módulos/camadas reais) | Não nesta slice | Sem backend/dado novo; a apresentação é coberta pelos testes de componente. |
| Contrato (formato entre serviços que não sobem juntos) | Não nesta slice | Nenhum campo novo consumido — `statusSugeridoIa` já está no contrato de `GET /analises/:id` (validado na TSD-013). |
| Smoke/validação manual contra dependência externa real | Não | Sem chamada ao backend. |

Slice de interface: **screenshots** do `RequisitoItem` nos dois casos (sugestão = parecer;
sugestão ≠ parecer, via fixture de teste) e comparação com o item do protótipo (que não
distingue os dois — divergência registrada).

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run ci
```

## 8. Critérios de aceite

- [x] Todo `RequisitoItem` exibe o `statusSugeridoIa` de forma identificável como sugestão da IA (PRD RF-007).
- [x] Quando `statusFinal === statusSugeridoIa` (situação atual), o badge é marcado como sugestão da IA e **não** há chip secundário nem realce de divergência.
- [x] Quando `statusFinal !== statusSugeridoIa`, aparece o chip "IA: <sugestão>" ao lado do parecer atual e o item ganha realce de divergência; expandido mostra "Sugestão da IA: X" e "Parecer atual: Y".
- [x] `PainelRevisao` mostra a legenda "os status são sugestões da IA…" quando há itens; não mostra no estado processando/erro/sem itens.
- [x] Nenhuma chamada nova ao backend; nenhum campo/tipo novo; `AnaliseDetalhe` inalterado.
- [x] `npm run ci` verde: `eslint .` + prettier, `tsc --noEmit`, testes, `next build`.
- [x] §10 revisada; screenshots dos dois casos comparados com o protótipo — `frontend/docs/visual-reference/rf-007/`.

## 9. Riscos e decisões abertas

### Decisões da slice

- **Marca de "IA" textual**, não iconográfica — rótulo "IA" / "sugerido pela IA". Simples,
  acessível, sem asset novo.
- **Badge principal continua sendo o `statusFinal`** (parecer atual). A sugestão da IA é
  informação secundária quando difere; quando igual, é o mesmo valor rotulado como sugestão.
- **Caminho "diverge" implementado agora**, embora só passe a ocorrer com RF-008 — evita um
  segundo passo no `RequisitoItem` depois e já entra testado (fixture de teste com
  `statusFinal ≠ statusSugeridoIa`).
- **Legenda no topo da lista** (não por item) para não poluir cada linha.

### Riscos remanescentes

- **Sem caso real de divergência** até RF-008 — o caminho "diverge" só é exercitado por
  fixture de teste e por uma screenshot com dado forjado. Baixo risco (é apresentação pura).
- **Densidade visual do item** — adicionar chip + realce pode competir com o badge principal.
  Mitigar mantendo o chip atenuado e o realce sutil; ajustar na inspeção visual (§10) se ficar
  carregado.

## 10. Referências visuais

Referência: `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/ChecklistItem.tsx`
(+ `AnalysisPanel.module.css`).

| ID | Papel na aplicação | Link/localização | Nome na origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| REF-07 | Item de requisito (acordeão) — status | `.../components/ChecklistItem.tsx` | `ChecklistItem` | status atual (o protótipo não distingue "sugerido pela IA" do parecer) | Inspecionado (RF-010 / TSD-013 §10) |

O protótipo mostra apenas **um** status por item (`STATUS_LABEL[item.status]`, texto colorido)
e **não** diferencia sugestão da IA de parecer do analista. Esta slice **adiciona** essa
distinção — divergência intencional, alinhada ao PRD RF-007 e ao glossário ("status **sugerido
pela IA**" vs "status **final**").

Screenshots obrigatórios: `RequisitoItem` recolhido e expandido nos casos (a) sugestão =
parecer e (b) sugestão ≠ parecer (fixture forjada); legenda da lista. Comparação de
enquadramento com REF-07. Evidência em `frontend/docs/visual-reference/rf-007/`.

## 11. Rollback

Só `frontend/`. Rollback = reverter `RequisitoItem`/`PainelRevisao` ao estado do RF-010,
remover `StatusIaResumo`, `divergeDaIa` e os testes desta slice. Nenhum contrato/tipo muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (014), a TSD-013 e o checkpoint.
Implemente só o escopo, em frontend/, na branch frontend/rf-007-status-ia. Não faça merge
sem instrução. Slice de apresentação: RequisitoItem passa a mostrar statusSugeridoIa (marca
de IA quando igual ao final; chip "IA: X" + realce quando diverge; bloco no expandido) e
PainelRevisao ganha uma legenda. Helper puro divergeDaIa. Nenhuma chamada nova ao backend,
nenhum tipo novo. Escreva os testes previstos. Rode npm run ci e registre a saída real.
Screenshots dos dois casos vs protótipo. Atualize roadmap, checkpoint e .ai-dev/audit.md.
Push da branch + merge na main + push da main.
```
