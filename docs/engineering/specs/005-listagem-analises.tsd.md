# TSD — Listagem de análises (RF-002, backend)

---
title: TSD - Listagem de análises (RF-002, backend)
type: tsd
status: draft
created: 31/08/2026 // Pablo Grisi (Engenheiro)
updated: 31/08/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/004-criar-analise.tsd.md
---

## 1. Resumo

Adiciona `GET /analises` — a listagem paginada das análises do analista atual, com busca textual, filtro por status e ordenação. Cobre o recorte backend do RF-002. Sem alteração de modelo.

**User Story de origem:** `docs/product/roadmap.md`, feature RF-002 (recorte backend), User Story e decisões de P-06 aprovadas em 31/08/2026.

## 2. Objetivo técnico

- `GET /analises` com `q`, `status`, `ordenarPor`, `ordem`, `pagina`, `tamanho`.
- Resposta `{ itens: [...], total, pagina, tamanho }`, `itens` só com os campos de listagem.
- Sempre filtrado pelo analista atual (`AnalistaAtualProvider`).
- Validação dos query params → `422` com motivo, sem consultar o banco.
- Testes unitários do parser/serviço e integração contra PostgreSQL embutido.

## 3. Escopo

### Incluído

- **`GET /analises`** no `AnalisesController`:
  - `q` (string, opcional) — busca em `nup` **ou** `objeto`, `contains`, `mode: 'insensitive'`.
  - `status` (string, opcional) — um ou mais valores separados por vírgula (`?status=PENDENTE,CONCLUIDA`); cada um validado contra `STATUS_ANALISE`; inválido → `422`.
  - `ordenarPor` (opcional) — `iniciadaEm` (default) | `nup`; outro valor → `422`.
  - `ordem` (opcional) — `asc` | `desc` (default `desc`); outro valor → `422`.
  - `pagina` (opcional) — inteiro ≥ 1, default `1`; inválido → `422`.
  - `tamanho` (opcional) — inteiro entre `1` e `100`, default `20`; fora da faixa → `422`.
- **`ListarAnalisesQuery`** (parser puro): recebe o objeto de query cru (strings), devolve `{ q?, status?: string[], ordenarPor, ordem, pagina, tamanho }` ou lança `UnprocessableEntityException` com a lista de erros.
- **`AnalisesService.listar(params)`**:
  - `where = { analistaId, ...(q → OR nup/objeto contains), ...(status?.length → status: { in }) }`.
  - `prisma.$transaction([findMany({ where, orderBy: { [ordenarPor]: ordem }, skip: (pagina-1)*tamanho, take: tamanho, select }), count({ where })])`.
  - `select`: `id`, `nup`, `objeto`, `status`, `iniciadaEm`, `concluidaEm`.
  - devolve `{ itens, total, pagina, tamanho }`.
- **Testes** (ver §7).

### Fora do escopo

- Contagem de requisitos / de não conformes por linha (depende de RF-007).
- Ordenação por outros campos, filtros por intervalo de data, busca avançada.
- Paginação por cursor.
- Qualquer alteração no modelo `Analise` ou em outros endpoints.
- Escopo multiusuário / 403 (P-10) — o filtro por `analistaId` já está lá; com analista único o efeito é lista vazia para outro id.
- Frente frontend (estado vazio com texto, componentes de filtro).

## 4. Contexto consultado

- `docs/product/prd.md` — RF-002, §8 ("Busca, filtros, ordenação e paginação fazem parte do MVP"), §9 (estado "sem dados")
- `docs/product/roadmap.md` — RF-002, decisões de P-06
- `docs/architecture/sdd.md` — §7 ("Listar"), §8 (`analise`)
- `docs/engineering/specs/004-criar-analise.tsd.md` — `AnalisesService`, `AnalisesController`, `STATUS_ANALISE`
- `docs/product/questoes-abertas.md` — P-06

## 5. Impacto esperado

- **Produto:** o analista passa a poder listar/buscar/filtrar suas análises.
- **Arquitetura:** nenhuma mudança estrutural; primeiro endpoint com query params validados + paginação (padrão para as próximas listagens).
- **Implementação:** `src/analises/` (+ parser, + método no serviço, + rota no controller).
- **Testes:** primeira integração com múltiplas linhas semeadas via `createMany`.
- **Documentação:** SDD §7 (detalhar o contrato de `GET /analises`); `questoes-abertas.md` P-06 → resolvida; checkpoint, roadmap, audit.

## 6. Plano de implementação

1. `ListarAnalisesQuery` (parser + validação) em `src/analises/listar-analises.query.ts` + testes unitários.
2. `AnalisesService.listar(params)` + testes unitários (montagem do `where`/`orderBy`/`skip`/`take`, shape da resposta) com prisma mockado.
3. Rota `@Get()` no `AnalisesController` (antes de `@Get(':id')`), com `@Query()`.
4. Integração `test/integration/listagem-analises.integration-spec.ts`: `createMany` de ~5 análises com `iniciadaEm`/`status`/`nup` variados; casos de listagem, busca, filtro, ordenação, paginação, `422` e lista vazia.
5. `npm run ci` + `npm run test:e2e`; registrar saída real.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `ListarAnalisesQuery` (defaults; `status` inválido; `ordenarPor`/`ordem` inválidos; `pagina < 1`; `tamanho` fora de 1–100; split de `status` por vírgula). `AnalisesService.listar` com prisma mockado (monta `where` com `analistaId` + `OR` de `q` + `status in`; `orderBy` dinâmico; `skip`/`take`; devolve `{ itens, total, pagina, tamanho }`). |
| Integração | Sim | App real + PostgreSQL embutido. ~5 análises semeadas: lista completa ordenada por `iniciadaEm desc`; `q` filtra por `nup`/`objeto`; `status` filtra (inclusive multi); `ordenarPor=nup&ordem=asc`; `pagina=2&tamanho=2` devolve a fatia certa + `total`; `status` inválido → `422`; sem análises → `{ itens: [], total: 0 }`. |
| Contrato | Não | Sem serviço externo. |
| Smoke/validação manual contra dependência externa real | Não | — |

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## 8. Critérios de aceite

- [ ] `GET /analises` sem query devolve as análises do analista atual, ordenadas por `iniciadaEm desc`, no formato `{ itens, total, pagina, tamanho }` com `tamanho = 20`, `pagina = 1`.
- [ ] Cada item traz `id`, `nup`, `objeto`, `status`, `iniciadaEm`, `concluidaEm` — e nada além disso.
- [ ] `q` filtra por `nup` ou `objeto` (contém, sem distinção de maiúsculas).
- [ ] `status` aceita um ou vários valores (vírgula) e filtra; valor fora de `STATUS_ANALISE` → `422` sem consultar o banco.
- [ ] `ordenarPor` ∈ {`iniciadaEm`, `nup`} e `ordem` ∈ {`asc`, `desc`}; outro valor → `422`.
- [ ] `pagina`/`tamanho` inválidos (não inteiro, `pagina < 1`, `tamanho` fora de 1–100) → `422`.
- [ ] `pagina=2&tamanho=2` devolve a segunda fatia e `total` reflete o total filtrado (não o da página).
- [ ] Sem análises → `{ itens: [], total: 0, pagina: 1, tamanho: 20 }`.
- [ ] `npm run ci` e `npm run test:e2e` verdes, com saída real registrada.

## 9. Riscos e decisões abertas

- **`status` por vírgula vs. repetição do parâmetro**: adotado vírgula (`?status=A,B`) por simplicidade; se o frontend preferir `?status=A&status=B`, o parser aceita os dois com um ajuste pequeno — registrar se acontecer.
- **`mode: 'insensitive'`** no `contains` do Prisma requer PostgreSQL (ok — é o banco do projeto e do teste embutido).
- **Sem índice para busca textual**: `contains` faz sequential scan; aceitável no volume do MVP. Índice trigram (pg_trgm) fica para se o volume crescer.
- Não altera decisão do SDD além de detalhar o contrato de `GET /analises` (§7) — Documentador ajusta.

## 10. Referências visuais

Não se aplica — slice de backend.

## 11. Rollback

Remover a rota `@Get()` do `AnalisesController`, o método `listar` do `AnalisesService`, `listar-analises.query.ts` e `test/integration/listagem-analises.integration-spec.ts`. Nada depende disso ainda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (005), a TSD-004 e o checkpoint.
Implemente só o escopo: GET /analises com q/status/ordenarPor/ordem/pagina/tamanho,
resposta { itens, total, pagina, tamanho }, itens com os 6 campos de listagem, filtro
sempre por analista atual, 422 na validação de query. Sem mudar modelo nem outros endpoints.
Rode npm run ci e npm run test:e2e; registre a saída real. Atualize checkpoint e audit.
```
