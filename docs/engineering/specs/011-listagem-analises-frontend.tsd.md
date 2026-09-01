# TSD — Tela de listagem de análises (RF-002, frontend)

---
title: TSD - Tela de listagem de análises (RF-002, frontend)
type: tsd
status: implementada na branch frontend/rf-002-listagem — aguardando revisão e merge
created: 01/09/2026 // Vinicius
updated: 01/09/2026 // Vinicius
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/002-fundacao-frontend.tsd.md
- docs/engineering/specs/005-listagem-analises.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

Primeiro ciclo de feature de produto do frontend. Substitui a casca da rota `/` por uma
**tela de listagem de análises** real: tabela com identificação e status de cada análise,
busca por NUP/objeto, filtro por status, ordenação, paginação e **estados vazio, carregando
e erro**. Consome o contrato REST `GET /analises` (TSD-005) através do seam de dados da
fundação — que nesta slice passa a ter uma implementação HTTP além das fixtures.

Não implementa criação de análise (RF-001), nem a tela de análise (RF-010+).

**User Story de origem:** `docs/product/roadmap.md`, RF-002 (recorte frontend).

## 2. Objetivo técnico

Ao final da slice (comandos de `frontend/`):

- `/` renderiza a listagem das análises do analista a partir do `AnalisesGateway`, com
  `q`, `status` (multi), `ordenarPor` (`iniciadaEm`|`nup`), `ordem`, `pagina`, `tamanho`
  refletidos na **URL** (estado navegável/compartilhável).
- Estado vazio distingue "analista sem nenhuma análise" de "nenhuma corresponde aos filtros".
- Estado de carregamento (`loading.tsx`) e de erro (`error.tsx`, com "tentar novamente").
- O seam de dados ganha `HttpAnalisesGateway` (contrato TSD-005) + teste de contrato; a
  composição (`getAnalisesGateway`) passa a devolvê-lo quando `NEXT_PUBLIC_API_BASE_URL`
  estiver definida.
- `npm run ci` verde. Screenshots dos estados capturados e comparados com a referência.

## 3. Escopo

### Incluído

- **`src/app/page.tsx`** reescrito como Server Component: lê `searchParams`, chama o gateway,
  renderiza tabela + toolbar + paginador, ou o estado vazio.
- **`src/app/loading.tsx`** e **`src/app/error.tsx`** (skeleton e fallback de erro).
- Componentes em `src/components/analises/`:
  - `AnalisesTable` (+ `StatusBadge`) — tabela com colunas NUP, Objeto, Status, Iniciada em;
    cabeçalhos NUP e "Iniciada em" ordenáveis (links que alternam `ordem`); linha inteira
    clicável para `/analise/[id]`.
  - `AnalisesToolbar` — compõe `SearchField` (client, debounce → URL) e `StatusFilter`
    (client, chips multi-seleção → URL); botão "Nova análise" **desabilitado** (RF-001).
  - `Paginator` — links de primeira/anterior/páginas/próxima/última + "Mostrando X–Y de N".
  - `AnalisesListaVazia` — variantes `sem-analises` e `sem-resultado`.
- Camada de dados (`src/lib/data/`):
  - `types.ts` — `ListarAnalisesQuery`, `OrdenarAnalisesPor`, `OrdemListagem`.
  - `analises-query.ts` — `parseListarAnalisesQuery` (normaliza a querystring, nunca lança) e
    `queryParaString` (serializa omitindo defaults). `TAMANHO_PADRAO=20`, `TAMANHO_MAX=100`.
  - `status-analise.ts` — `STATUS_ANALISE`, `STATUS_ANALISE_LABEL`, `STATUS_ANALISE_TONE`,
    `isStatusAnalise`.
  - `analises-gateway.ts` — `listarAnalises(query?)` + `AnalisesGatewayError`.
  - `fixtures-analises-gateway.ts` — passa a aplicar busca/filtro/ordenação/paginação; fixtures
    ampliadas para 24 itens.
  - `http-analises-gateway.ts` — consumidor REST do contrato TSD-005, com validação de formato.
  - `index.ts` — `getAnalisesGateway()` devolve `HttpAnalisesGateway` se `NEXT_PUBLIC_API_BASE_URL`.
- Ícones novos em `src/components/icons/` (busca, ordenação, paginação).
- Testes (Vitest + RTL): parser da query, `status-analise`, `FixturesAnalisesGateway`,
  contrato do `HttpAnalisesGateway`, `AnalisesTable`, `AnalisesListaVazia`, `Paginator`,
  `SearchField`.
- **Follow-up desta slice:** migração de `next lint` → `eslint .` (ESLint CLI + flat config),
  scripts do `package.json` adaptados.

### Fora do escopo

- Criação de análise / modal "Nova análise" (RF-001, frontend).
- Tela de análise `/analise/[id]` além da casca da TSD-002 (RF-010+).
- Painel/modal de filtros consolidado (esta slice usa chips inline de status).
- Seletor de tamanho de página na UI (o `tamanho` continua aceito via URL).
- Contagens de requisitos por linha (dependem de RF-007; fora do contrato TSD-005).
- Autenticação, `NEXT_PUBLIC_API_BASE_URL` apontando para um backend real em CI/deploy.

## 4. Contexto consultado

- `START_HERE.md`, `.ai-dev/context-map.md`, `docs/engineering/checkpoint.md`
- `docs/product/prd.md` (RF-002, §9 estados vazio/erro), `docs/product/roadmap.md` (RF-002)
- `docs/architecture/sdd.md` (§7 — contrato `GET /analises`)
- `docs/engineering/specs/005-listagem-analises.tsd.md` (contrato de backend consumido)
- `docs/engineering/specs/002-fundacao-frontend.tsd.md` (seam de dados, tema)
- `docs/product/glossario.md` (Análise, NUP, Status do requisito × status da análise)
- `.ai-dev/visual-reference-workflow.md`, `.ai-dev/quality-gates.md`
- `Prototipo Licia Analisadora/src/routes/HomePage/`

## 5. Impacto esperado

- **Produto:** primeira tela funcional — o analista vê e reabre suas análises, com busca,
  filtro, ordenação e paginação (RF-002; PRD §9 "Sem dados" e "Erro de carregamento").
- **Arquitetura:** fecha o seam de dados da fundação com um consumidor REST real do contrato
  TSD-005; nenhuma decisão de arquitetura nova.
- **Implementação:** rota `/` deixa de ser casca; novos componentes e camada de query.
- **Testes:** primeiro teste de contrato do frontend (`test/unit/http-analises-gateway.test.ts`).
- **Documentação:** roadmap RF-002 (frontend), checkpoint, `.ai-dev/audit.md`, evidência visual.
- **Operação:** sem deploy. `next build` deixa de repetir o lint (roda no `npm run ci`).

## 6. Plano de implementação

1. Camada de query (`analises-query.ts`, `status-analise.ts`) + tipos.
2. `AnalisesGateway.listarAnalises(query?)`; `FixturesAnalisesGateway` aplica a semântica; ampliar fixtures.
3. `HttpAnalisesGateway` (contrato TSD-005) + `getAnalisesGateway` por env.
4. Componentes: `StatusBadge`, `AnalisesTable`, `Paginator`, `SearchField`, `StatusFilter`, `AnalisesToolbar`, `AnalisesListaVazia`.
5. `page.tsx` (Server Component) + `loading.tsx` + `error.tsx`.
6. Ícones necessários.
7. Testes (unit + contrato + componente).
8. Migração `next lint` → `eslint .` (flat `eslint.config.mjs`, `@eslint/eslintrc`, scripts).
9. `npm run ci`; screenshots dos estados; comparação com REF-03.
10. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, evidência visual.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário (lógica isolada, deps mockadas) | Sim | Parser da querystring (defaults, clamps, valores inválidos), `status-analise`, `FixturesAnalisesGateway` (busca acento-insensitive, filtro multi-status, ordenação, paginação, clamp), e componentes de apresentação (`AnalisesTable`, `Paginator`, `AnalisesListaVazia`, `SearchField` com `next/navigation` mockado). |
| Integração (módulos/camadas reais) | Não nesta slice | Não há backend real nem banco; a integração UI↔gateway↔fixtures é coberta pelos unitários. A integração real UI↔API entra quando houver ambiente com o backend no ar. |
| Contrato (formato entre serviços que não sobem juntos) | Sim | `HttpAnalisesGateway` consome `GET /analises` (TSD-005). `test/unit/http-analises-gateway.test.ts` valida montagem da URL, mapeamento de um payload no formato do contrato, e **rejeição** de payloads fora do contrato (sem `total`, status fora da allowlist, item sem `nup`, não-OK, erro de rede). |
| Smoke/validação manual contra dependência externa real | Não | O backend não está no ar neste ambiente; `NEXT_PUBLIC_API_BASE_URL` fica desligada (fixtures). Quando houver ambiente conjunto, rodar um smoke `/` → API real. |

Slice de interface: **screenshots** dos estados (lista, paginada, com busca/filtro/ordenação,
vazio-sem-resultado) e comparação de enquadramento com REF-03 (`.ai-dev/visual-reference-workflow.md`).

### 7.2 Comandos previstos

```text
npm run lint       # eslint . && prettier --check .
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
npm run build      # next build
npm run ci         # os quatro encadeados
```

## 8. Critérios de aceite

- [x] `/` lista as análises do analista via `AnalisesGateway`; nenhum componente chama `fetch` direto.
- [x] Cada linha traz NUP, objeto, **status** e data de início, e leva a `/analise/[id]`.
- [x] `q`, `status` (multi), `ordenarPor`, `ordem`, `pagina`, `tamanho` funcionam e ficam na URL; querystring inválida cai em default sem quebrar.
- [x] Estado vazio: "sem-analises" (orienta a criar) e "sem-resultado" (com limpar busca/filtros) — PRD §9.
- [x] Estado de carregamento (`loading.tsx`) e de erro com "tentar novamente" (`error.tsx`) — PRD §9.
- [x] `HttpAnalisesGateway` implementa o contrato TSD-005 e rejeita payload fora do formato; `getAnalisesGateway` o usa quando `NEXT_PUBLIC_API_BASE_URL` está definida.
- [x] `npm run ci` verde: `eslint .` + prettier, `tsc --noEmit`, 43 testes (9 arquivos), `next build`.
- [x] `next lint` removido; `.eslintrc.json` → `eslint.config.mjs` (flat); `lint`/`lint:fix` adaptados.
- [x] §10 preenchida e revisada; screenshots dos estados comparados com REF-03 — `frontend/docs/visual-reference/rf-002/`.

## 9. Riscos e decisões abertas

### Decisões da slice

- **URL como estado:** filtros/ordenação/paginação vivem na querystring; `/` é Server
  Component (`dynamic = "force-dynamic"`). `SearchField`/`StatusFilter` são Client Components
  que fazem `router.replace`; ordenação e paginação são `<Link>`. Padrão idiomático do App
  Router; dá views compartilháveis e SSR sem `useEffect` de dados.
- **Filtro por status:** chips inline multi-seleção (não o botão "Filtros" + modal do
  protótipo). Cobre o parâmetro `status` do contrato. Um painel consolidado pode vir depois.
- **Coluna "Status":** adicionada à tabela (o protótipo não tinha; RF-002 exige mostrar o
  status). **Coluna "Adicionado por" removida** (analista único no MVP).
- **"Nova análise":** botão presente mas **desabilitado** — a criação é RF-001 (frontend).
- **Tamanho de página:** fixo em 20 na UI; `tamanho` (até 100) continua aceito via URL.
- **Página fora do intervalo:** `page.tsx` redireciona para a última página válida.
- **`next build` sem lint:** `eslint.ignoreDuringBuilds: true` — o lint roda no `npm run ci`
  via `eslint .`; o `next lint` interno está deprecado no Next 15.

### Riscos remanescentes

- **Divergência stub × API real:** o `HttpAnalisesGateway` foi validado só por teste de
  contrato com payload de exemplo; sem smoke contra o backend real (não há ambiente conjunto).
  Mitigado pela validação de formato no gateway; refazer smoke quando houver ambiente.
- **`FixturesAnalisesGateway` reimplementa a semântica do backend** (busca/ordenação/paginação).
  Risco de divergência sutil (ex.: colação de acento, tie-breaking). Aceito no MVP — as
  fixtures são andaime; a fonte de verdade é a API quando `NEXT_PUBLIC_API_BASE_URL` liga.

## 10. Referências visuais

Referência: `Prototipo Licia Analisadora/` (rota `/`, `HomePage`).

| ID | Papel na aplicação | Link/localização | Nome na origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| REF-03 | Tela de lista de análises (tabela, busca, filtros, paginador) | `Prototipo Licia Analisadora/src/routes/HomePage/` | `HomePage` | preenchida (dados de exemplo) | Inspecionado — 01/09/2026 (Vinicius) |
| REF-03b | Estado vazio da listagem | — (não há no protótipo) | — | vazio | N/A — texto definido pelo PRD §9 |

### 10.1 Observações da inspeção

`HomePage` do protótipo: cabeçalho (breadcrumb "Início" + "Lista de análises" com regra
inferior de 2px na cor de marca); linha de ações com busca (esq., ~428px, ícone lupa),
botão "Filtros", botão "Nova análise" (dir., verde); tabela com cabeçalho `bg-hover`,
colunas **NUP / Objeto da contratação / Adicionado em / Adicionado por**, cada uma com
ícone de ordenação; linhas altas (80px) com objeto em 2 linhas (`-webkit-line-clamp`);
paginador à direita ("Mostrando X-Y de N" + primeira/anterior/1..5/próxima/última circulares,
página ativa em `bg-selected`, seletor de tamanho).

### 10.2 Divergências intencionais em relação ao protótipo

- Coluna **Status** adicionada; coluna **"Adicionado por" removida** (analista único — MVP).
- **"Adicionado em"** vira **"Iniciada em"** (campo `iniciadaEm` do contrato).
- Filtro por status = **chips inline** (não o botão "Filtros" + modal).
- Botão **"Nova análise" desabilitado** (RF-001, frontend).
- **Seletor de tamanho de página** não incluído na UI.
- Sem `min-width: 1440px` (herdado da TSD-002).

### Screenshots

`frontend/docs/visual-reference/rf-002/`: `lista.png`, `pagina-2.png`,
`busca-filtro-ordenacao.png`, `vazio-sem-resultado.png` + `prototipo-home.png`. Comparação e
resultado em `frontend/docs/visual-reference/rf-002/README.md`. Sem gaps de enquadramento
para o escopo da slice.

## 11. Rollback

A slice toca só `frontend/`. Rollback = restaurar `src/app/page.tsx`/`page.module.css` para a
casca da TSD-002, remover `src/app/loading.tsx`, `src/app/error.tsx`,
`src/components/analises/`, os módulos `analises-query.ts`/`status-analise.ts`/
`http-analises-gateway.ts` e reverter `fixtures*.ts`/`types.ts`/`index.ts`/`icons`. A migração
do ESLint pode ser mantida (independe da feature) ou revertida restaurando `.eslintrc.json` e
o script `next lint`. Nenhum dado ou contrato de backend muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD, o checkpoint e
docs/engineering/specs/005-listagem-analises.tsd.md (contrato consumido).
Implemente apenas o escopo desta TSD, em frontend/. Não implemente criação de análise
(RF-001) nem a tela de análise. Todo acesso a dados passa pelo AnalisesGateway.
Reflita busca/filtro/ordenação/paginação na URL. Cubra os estados vazio/carregando/erro.
Escreva os testes previstos, incluindo o de contrato do HttpAnalisesGateway.
Faça a migração next lint -> eslint . adaptando os scripts.
Rode `npm run ci` e registre a saída real. Capture screenshots dos estados e compare com REF-03.
Atualize roadmap, checkpoint e .ai-dev/audit.md. Não faça merge na main.
```
