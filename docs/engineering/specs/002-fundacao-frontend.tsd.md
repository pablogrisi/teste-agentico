# TSD — Fundação técnica do frontend LicIA Analisadora

---
title: TSD - Fundação técnica do frontend LicIA Analisadora
type: tsd
status: implementada na branch frontend/tsd-002-fundacao — aguardando revisão e merge
created: 31/08/2026 // Pablo Grisi (rascunho); implementação: Vinicius
updated: 01/09/2026 // Vinicius (implementação da fundação + §10 + validações)
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/001-fundacao-tecnica.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

Esta slice cria o esqueleto do **app frontend** da LicIA Analisadora em `frontend/`: um projeto Next.js + TypeScript que sobe, tem as duas rotas do produto como telas-casca (`/` e `/analise/:id`), um tema/tokens adaptados do protótipo, uma camada de dados isolada atrás de um seam (com fixtures, sem backend real) e os quality gates rodando (`lint`, `typecheck`, `test`, `build`). **Não entrega nenhuma feature de produto**: as telas são cascas com layout e navegação, sem a lógica de listagem, criação, revisão ou conclusão.

É a fundação paralela à TSD-001 (backend). As duas são independentes: Vinicius implementa esta numa branch, Pablo implementa a TSD-001; o merge junta `backend/` e `frontend/` no monorepo.

**User Story de origem:** nenhuma — TSD-002 é fundação técnica, não vem do ciclo de uma feature de produto.

## 2. Objetivo técnico

Ao final desta slice (comandos rodados de `frontend/`):

- `npm install && npm run dev` sobe o app localmente (Next.js).
- `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` rodam e passam.
- Existem as rotas `/` (lista de análises) e `/analise/[id]` (tela de análise) renderizando um layout base (Topbar + área de conteúdo) com conteúdo placeholder — sem dados reais de produto.
- Há um tema (tokens de cor, tipografia, espaçamento, raio, elevação) adaptado do protótipo `Prototipo Licia Analisadora/src/theme/`, aplicado ao layout base.
- Há uma **camada de dados** (`lib/api/` ou equivalente) atrás de uma interface, com uma implementação de **fixtures** e um ponto único onde, no futuro, entra o cliente HTTP real contra o backend. Nenhum componente de tela fala com `fetch` direto.
- Setup de teste de componente (Vitest + React Testing Library) com 1 teste trivial provando que a infra funciona.
- `README.md` do frontend: como rodar, testar, e onde fica o seam de dados.
- `.env.example` com as variáveis previstas (ex.: `NEXT_PUBLIC_API_BASE_URL`, ainda não usada de fato).

## 3. Escopo

### Incluído

- `frontend/` com projeto Next.js + TypeScript (App Router), ESLint + Prettier, `tsconfig` estrito.
- Scripts no `package.json` do frontend: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (Vitest), `test:watch`, `ci` (encadeia `lint && typecheck && test && build`).
- Layout base: componente de Topbar e shell de página, a partir da referência visual (ver §10). Marca/logo tratada como asset, não copiada de código.
- Tema: tokens adaptados de `Prototipo Licia Analisadora/src/theme/` (`primitiveColors`, `semanticColors`, `typography`, `spacing`, `borderRadius`, `elevation`) para a convenção do projeto real (CSS variables / solução de styling escolhida na implementação e registrada).
- Rotas:
  - `/` — tela-casca "Lista de análises" com o layout base e um estado placeholder.
  - `/analise/[id]` — tela-casca "Análise" com o layout base, um espaço para o visor de PDF e um espaço para o painel de revisão, ambos placeholder.
- Camada de dados: interface (ex.: `AnalisesGateway`) + `FixturesAnalisesGateway` com dados de exemplo derivados do protótipo (`src/data/`). Um único módulo de composição escolhe a implementação por env/config.
- Setup de teste de componente: Vitest + React Testing Library + jsdom; config e um teste do layout base.
- `README.md` do frontend e `.env.example`.
- Ajuste do `.gitignore` para artefatos do Next (`.next/`, etc.) se ainda não coberto pela raiz.

### Fora do escopo

- Qualquer feature de produto (RF-001…RF-018): nada de listar/criar/revisar/concluir de verdade, nada de filtros, modais funcionais, upload real, visor de PDF real.
- Integração HTTP real com o backend — só o seam fica pronto; a implementação real entra nos ciclos de cada RF.
- Autenticação / tela de login (não há identidade no MVP).
- Fidelidade pixel a pixel das telas — isso é trabalho dos ciclos por RF, com o `visual-reference-workflow`. Aqui só o frame/layout base.
- Backend (`backend/`) e qualquer coisa da TSD-001.
- SSR/ISR avançado, i18n, PWA, análise de performance.

## 4. Contexto consultado

- `START_HERE.md`
- `.ai-dev/context-map.md` (seções "testes" e "Contexto visual e discovery")
- `docs/engineering/checkpoint.md`
- `docs/product/prd.md` (§6 jornada, §7 RFs — para nomear rotas e telas)
- `docs/architecture/sdd.md` (§2 — monorepo, frentes; §7 — formato geral dos fluxos que o frontend vai consumir)
- `docs/product/glossario.md` (nomes de domínio nas telas)
- `.ai-dev/visual-reference-workflow.md`
- `Prototipo Licia Analisadora/` (referência visual — `src/theme/`, `src/components/Topbar/`, `src/routes/`)
- `docs/engineering/specs/001-fundacao-tecnica.tsd.md` (alinhar versão de Node / gerenciador de pacotes)

## 5. Impacto esperado

- **Produto:** nenhum comportamento de produto novo — telas-casca.
- **Arquitetura:** materializa a frente `frontend/` do monorepo e o seam de dados que isola a UI do transporte HTTP.
- **Implementação:** cria o app frontend do zero.
- **Testes:** estabelece a infraestrutura de teste de componente que o Agente de Testes do frontend vai usar.
- **Documentação:** `README.md` do frontend; atualização de checkpoint e `.ai-dev/audit.md` ao final.
- **Operação:** nenhum deploy nesta slice.

## 6. Plano de implementação

1. Criar `frontend/` e inicializar Next.js + TypeScript (App Router). Alinhar Node/npm com a TSD-001.
2. Configurar ESLint + Prettier + `tsconfig` estrito; scripts `lint`, `typecheck`.
3. Configurar Vitest + React Testing Library + jsdom; script `test`; criar `test/` (ou `__tests__/`).
4. Inspecionar a referência visual (protótipo) e preencher/rever a §10 desta TSD **antes** de ativar a slice no checkpoint.
5. Portar os tokens de tema do protótipo para a convenção do projeto real (sem copiar CSS bruto).
6. Construir o layout base (Topbar + shell) a partir da referência.
7. Criar as rotas `/` e `/analise/[id]` como telas-casca usando o layout base.
8. Criar a camada de dados: interface + `FixturesAnalisesGateway` + módulo de composição por env. Fixtures derivados de `Prototipo Licia Analisadora/src/data/`.
9. Escrever 1 teste de componente do layout base.
10. Escrever `README.md` do frontend e `.env.example`.
11. Rodar `lint`, `typecheck`, `test`, `build` e registrar a saída real.
12. Capturar screenshots das telas-casca e comparar o frame com a referência (§10).

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário (lógica isolada, dependências mockadas) | Sim | Provar a infra de teste de componente: 1 teste do layout base (renderiza Topbar, renderiza children). O `FixturesAnalisesGateway` ganha um teste simples de que devolve a fixture esperada. Volume pequeno de propósito — não há lógica de produto. |
| Integração (módulos/camadas reais) | Não nesta slice | Não há backend real nem integração entre camadas além de render + gateway de fixture (coberto no unitário). O seam de dados real entra nos ciclos por RF. |
| Contrato (formato entre serviços que não sobem juntos) | Não nesta slice | O contrato REST com o backend ainda não existe (definido por RF na TSD de backend). Quando existir, o frontend valida o formato que consome via teste de contrato contra um schema/exemplo compartilhado. |
| Smoke/validação manual contra dependência externa real | Não | Sem dependência externa real nesta slice. |

Além disso, por ser slice de interface: **screenshots antes/depois** do frame das telas-casca e comparação visual com a referência do protótipo (`visual-reference-workflow.md`).

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

## 8. Critérios de aceite

- [x] `npm install` a partir de um clone limpo + `npm run dev` sobe o app sem erro. *(npm 11 pede aprovar os install scripts de `esbuild`/`unrs-resolver` — declarados em `package.json#allowScripts`; ver §9.)*
- [x] `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` terminam com sucesso — saída real registrada no checkpoint e em `.ai-dev/audit.md` (01/09/2026: lint ✓, typecheck ✓, test ✓ 4/4, build ✓ 4 rotas).
- [x] `/` e `/analise/[id]` renderizam o layout base (Topbar + conteúdo) com placeholder; navegação entre elas funciona. *(`/analise/[id]` é rota dinâmica — server-rendered on demand.)*
- [x] Os tokens de tema do protótipo estão portados e aplicados ao layout base (cores, tipografia Kanit via `next/font`, espaçamento) — `src/app/theme/*.css`.
- [x] Nenhum componente de tela chama `fetch`/HTTP diretamente; todo acesso a dados passa pela interface da camada de dados (`src/lib/data/`, `AnalisesGateway`), hoje servida por fixtures.
- [x] Há 1 teste de componente do layout base (`test/unit/page-shell.test.tsx`) e 1 do gateway de fixtures (`test/unit/fixtures-analises-gateway.test.ts`), ambos passando.
- [x] Nenhuma feature de produto implementada (sem listagem real, criação, revisão, conclusão, filtros, upload, visor de PDF real).
- [x] §10 preenchida e revisada antes da ativação; screenshots do frame capturados e comparados com a referência — `frontend/docs/visual-reference/` (frame de REF-02/03/04 confere; sem gaps de enquadramento).
- [x] `README.md` do frontend e `.env.example` presentes.

## 9. Riscos e decisões abertas

### Decisões tomadas na implementação (01/09/2026)

- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript estrito. Node 20 + npm (bate com a TSD-001 e o `.nvmrc` da raiz).
- **Solução de styling:** **CSS Modules + CSS custom properties**. Tokens do protótipo portados por **valor** para `src/app/theme/*.css` (nomes de token preservados; estrutura de arquivos adaptada, sem copiar CSS cru). Fonte **Kanit** via `next/font/google` (sem `<link>` manual).
- **Runner de teste:** **Vitest + React Testing Library + jsdom** (alinhado a `quality-gates.md`). `next/font` é mockado no `vitest.setup.ts`. Alias `@/*` replicado em `vitest.config.ts` via `resolve.alias` (sem `vite-tsconfig-paths` — ESM-only, quebrava o carregamento do config `.ts`).
- **Lint:** `next lint` (`next/core-web-vitals`) + `prettier --check`. `next lint` está deprecado no Next 15 — **follow-up**: migrar para ESLint CLI num ciclo futuro.
- **Camada de dados:** `AnalisesGateway` (interface) + `FixturesAnalisesGateway` + `getAnalisesGateway()` como ponto único de composição (`src/lib/data/index.ts`). Com `NEXT_PUBLIC_API_BASE_URL` definida, `getAnalisesGateway()` lança erro explícito (gateway HTTP entra nos ciclos por RF).
- **Brasão do Ceará:** placeholder SVG local (`CearaLogo.tsx`); a URL do Figma MCP do protótipo não foi para o app real. Brasão oficial = acabamento posterior.
- **Sem trava de largura:** o `min-width: 1440px` do protótipo não foi replicado.
- **`npm 11` + install scripts:** `esbuild` e `unrs-resolver` têm binários nativos; declarados em `package.json#allowScripts`. Num `npm install` limpo o npm 11 ainda pede `npm approve-scripts` — documentado no `README.md` do frontend.

### Riscos remanescentes

- **Contrato de API inexistente:** o frontend avança com fixtures até cada RF de backend publicar seu contrato. Risco de retrabalho no gateway quando os contratos chegarem — mitigado por manter a UI atrás da interface e os fixtures espelhando o glossário.
- **Divergências protótipo × PRD** (`.ai-dev/context-map.md` + §10.2): 3 status (não 4, sem "Com ressalva"), semântica da área Técnica em aberto (P-04), sem "responsável" por linha. As fixtures e os tipos (`StatusRequisito`) já seguem o PRD.

## 10. Referências visuais

Referência: protótipo navegável `Prototipo Licia Analisadora/` (React + Vite). Esta slice implementa **apenas o frame/layout base e as cascas de rota** — não as telas completas.

| ID | Papel na aplicação | Link/localização | Nome na ferramenta de origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| REF-01 | Tema / tokens visuais (cor, tipografia, espaçamento, raio, elevação) | `Prototipo Licia Analisadora/src/theme/` | `theme/*` | tokens base (claro) | Inspecionado — 01/09/2026 (Vinicius) |
| REF-02 | Topbar / cabeçalho global | `Prototipo Licia Analisadora/src/components/Topbar/` | `Topbar` | padrão | Inspecionado — 01/09/2026 (Vinicius) |
| REF-03 | Shell da tela de lista de análises (frame, sem a tabela/dados) | `Prototipo Licia Analisadora/src/routes/HomePage/` | `HomePage` | com conteúdo (frame); estado vazio é de RF-002, fora desta slice | Inspecionado — 01/09/2026 (Vinicius) |
| REF-04 | Shell da tela de análise (frame: espaço do visor + espaço do painel) | `Prototipo Licia Analisadora/src/routes/AnalysisPage/` | `AnalysisPage` | frame; abas/filtros/modais são de RFs próprios, fora desta slice | Inspecionado — 01/09/2026 (Vinicius) |

### 10.1 Observações da inspeção (01/09/2026)

**REF-01 — Tema / tokens** (`src/theme/*.css`, importados por `index.css` na ordem de dependência):

- **primitiveColors.css** — escalas 50–1000: `verde` (marca, `--color-verde-1000: #26a736`), `laranja` (`#f49c00`), `azul` (`#54a5af`), `vermelho` (`#fc5757`), `cinza`, `preto` (base `#003234`). Tokens avulsos: `verde-gov-*` (brasão do Governo do Ceará — verde institucional `#00853b`, **distinto** do verde de marca), `azulado-700` (observação técnica), `amarelo-100` (fundo de alerta), `neutro-*` (superfícies de chrome: desktop `#e0e2e8`, visor de PDF, toolbar, divisória).
- **semanticColors.css** — camada semântica sobre as primitivas: `--color-brand-*`, `--color-text-*` (title/body/secondary/disabled/inverse/brand), `--color-icon-*`, `--color-bg-*` (page `#fafafa`, card branco, hover, selected, desktop, viewer, toolbar, alert), `--color-topbar-*`, `--color-border-*`, `--color-success/warning/error/info-{default,subtle,text}`.
- **typography.css** — família **Kanit** (`--font-family-base: 'Kanit', sans-serif`), pesos 300–700. Escala de tamanho `--font-size-10…52` (rem), `--line-height-14…82`, e estilos nomeados espelhando o Figma: `--text-h1…h5`, `--text-large`, `--text-body`, `--text-body-semibold`, `--text-body-bold`, `--text-small`, `--text-small-semibold`, `--text-small-bold`, `--text-caption`, `--text-caption-xs` (cada um com `-size`/`-line-height`/`-weight`).
- **spacing.css** — `--spacing-2…128` (escala em rem, base 4px; inclui 10 e 12).
- **borderRadius.css** — `--radius-0/2/4/8/12/16/24/full`. Padrão de botões/inputs/cards = `--radius-8`; modais = `--radius-16`.
- **elevation.css** — `--shadow-card`, `--shadow-modal`, `--shadow-menu`.
- **Reset** em `index.css`: `box-sizing: border-box`, zera `margin`/`padding`, `html,body` com `height:100%`, `font-family` base, `background: var(--color-bg-desktop)`, `color: var(--color-text-body)`, `-webkit-font-smoothing: antialiased`. `button { font-family: inherit }`, `a { color: inherit; text-decoration: none }`.
- **Fonte Kanit** carregada por `<link>` do Google Fonts no `index.html` do protótipo (`wght@300;400;500;600;700`). No app real: usar `next/font/google` (Kanit, mesmos pesos) — sem `<link>` manual, sem copiar a tag.
- **Porte:** tokens vão para CSS custom properties num arquivo global (ex.: `src/app/theme/*.css` ou `tokens.css` importado no `layout.tsx`). Copiar os **valores** dos tokens, não a estrutura de arquivos nem os comentários do protótipo verbatim. Nomes de token preservados para reduzir tradução nos ciclos por RF.

**REF-02 — Topbar** (`Topbar.tsx` + `Topbar.module.css`):

- `<header>` sticky, `top: 0`, `z-index: 100`, **altura 64px**, `flex` com `justify-content: space-between`, `padding: 0 var(--spacing-48)`, `border-bottom: 1px solid var(--color-topbar-divider)`.
- Fundo: `var(--color-topbar-base)` (verde-gov) com dois `linear-gradient` de sombra (`color-mix`) nas bordas — efeito sutil de vinheta lateral.
- Conteúdo: **logo do brasão do Ceará** à esquerda (`height: 32px`) + à direita um `<button>` "seletor de usuário" (largura 263px, pill `--radius-8`, fundo `--color-topbar-user`, borda `--color-topbar-user-border`, texto inverso `--text-small-semibold`, `ChevronDown` 16px, texto com `ellipsis`).
- **Prop:** `userName?: string` (default `"Usuário Analista"`). No MVP há analista único fixo — o nome virá da camada de dados/config nos ciclos por RF; nesta slice pode ficar o default ou um valor de placeholder.
- **Asset da marca:** o protótipo referencia o brasão por **URL do Figma MCP** (`src/assets/brand.ts` → `https://www.figma.com/api/mcp/asset/...`). Isso **não** pode ir para o app real (URL efêmera, dependência externa). Nesta slice: usar um placeholder local (SVG/texto "Governo do Estado do Ceará" em `public/` ou `src/`), tratado como asset substituível. Trocar pelo brasão oficial é item de acabamento posterior, não desta fundação.
- O seletor de usuário é **estático** (sem dropdown) — chrome de layout, não comportamento de produto nesta slice.

**REF-03 — Shell da HomePage** (`HomePage.tsx` + `.module.css`):

- Frame: `.app` = coluna flex, `min-height: 100vh`, `background: var(--color-bg-page)`; o protótipo fixa `min-width: 1440px` (viewport de design travado) — no app real **não** replicar o trava de largura; usar largura fluida com o mesmo padding.
- `<main>` com `padding: var(--spacing-24) var(--spacing-32)`, `gap: var(--spacing-16)`, coluna.
- **Cabeçalho:** bloco de título com `breadcrumb` ("Início") + `<h1>` "Lista de análises", `border-bottom: 2px solid var(--color-brand-default)`. Linha de ações: campo de busca (428px, ícone lupa, placeholder "Busque pelo NUP ou objeto da contratação"), botão "Filtros" (com ícone), botão "Nova análise" (verde de marca, texto inverso, ícone +) alinhado à direita.
- **Tabela:** container com borda + `--radius-4`; cabeçalho (`background: var(--color-bg-hover)`) com 4 colunas — NUP (180px), Objeto da contratação (flex), Adicionado em (148px), Adicionado por (224px) — cada uma com ícone de ordenação. Linhas com `height: 80px`, fundo card, hover, `-webkit-line-clamp: 2` no objeto.
- **Paginador:** rodapé alinhado à direita — texto "Mostrando resultados X-Y de N", botões primeira/anterior/páginas/próxima/última (circulares 42px, ativa com `--color-bg-selected`), seletor de tamanho de página.
- **Nesta slice:** só o **frame** — cabeçalho + título + a área onde a tabela/paginador entram, com **placeholder** (sem linhas reais, sem busca/filtro/paginação funcionais). Coluna "Adicionado por" existe no protótipo mas o MVP tem analista único (`context-map.md`); não modelar "responsável por linha" — decisão dos ciclos RF-002.

**REF-04 — Shell da AnalysisPage** (`AnalysisPage.tsx` + `.module.css` + `PdfPanel.module.css` + `AnalysisPanel.module.css`):

- Frame: `.app` idêntico ao da HomePage (coluna, `bg-page`); `.content` = `height: calc(100vh - 64px)` (desconta a Topbar), `flex` `align-items: flex-start`, `gap: var(--spacing-16)`, `padding-top: var(--spacing-20)`, `overflow: hidden`.
- **Dois painéis lado a lado:**
  - **Painel de revisão** (`AnalysisPanel`) — **largura fixa 596px**, altura total, fundo card, borda com `--radius-8` só nos cantos esquerdos. Dentro (tudo fora do escopo desta slice, mas define o espaço): abas Checklist/Técnica, barra de progresso, chips de filtro por status, lista rolável de itens em acordeão.
  - **Painel do PDF** (`PdfPanel`) — `flex: 1` (ocupa o resto), altura total, fundo `--color-bg-viewer`. Tem header (44px: botão voltar + label "NUP"/valor + nome do arquivo), toolbar do visor (44px: nome, navegação de página centralizada) e área rolável com a "folha" do documento (card 796px centralizado, `--shadow-card`).
- **Nesta slice:** só o **frame de dois painéis** — um bloco placeholder "espaço do visor de PDF" (`flex: 1`) e um bloco placeholder "espaço do painel de revisão" (596px), ambos com o enquadramento/altura corretos, sem abas, sem filtros, sem visor real, sem dados. `id` da rota lido de `params` mas usado só para exibição placeholder.

### 10.2 Divergências e itens de chrome a NÃO implementar como produto

- **Brasão via URL do Figma** (`brand.ts`) — substituir por asset local placeholder (ver REF-02).
- **`min-width: 1440px`** nas telas — trava de viewport do protótipo; o app real usa largura fluida (a fidelidade responsiva fina é dos ciclos por RF, mas não nascer travado).
- **4 situações de requisito / "Com ressalva" / `warning`** no `AnalysisPanel` e em `src/data/types.ts` — o MVP tem **3** (`CONFORME`, `NAO_CONFORME`, `NAO_SE_APLICA`), conforme PRD/glossário. As fixtures desta slice usam os 3.
- **Aba Técnica como "observações" sem status** — semântica é questão aberta (P-04); não replicar comportamento, é só espaço no frame.
- **"Adicionado por" por linha** na HomePage — MVP tem analista único; não modelar responsável por linha.
- Seletor de usuário da Topbar, botão "voltar", toolbars e navegação de página do PDF — **chrome de layout**, sem lógica nesta slice.

Screenshots obrigatórios: `/` (casca) e `/analise/[id]` (casca), antes (não há — telas novas) e depois; comparação do frame (Topbar 64px + verde-gov, grid de layout, tokens de cor/tipografia/espaçamento) com REF-02/03/04.

Gaps conhecidos entre implementação atual e referência: telas-casca não têm tabela, filtros, modais, visor de PDF nem dados — todos previstos para os ciclos por RF, não para esta slice. Divergências protótipo × PRD listadas em `.ai-dev/context-map.md` e em §10.2 valem aqui.

Esta TSD não deve ser ativada no checkpoint nem implementada enquanto os `Status de inspeção` acima estiverem `Pendente`. **Estão `Inspecionado` desde 01/09/2026 — falta a revisão humana desta §10 para ativar a slice.**

## 11. Rollback

A slice cria `frontend/` isolado. Rollback = remover `frontend/` e reverter os ajustes de `.gitignore` da raiz, sem impacto em `.ai-dev/`, `docs/`, `backend/` ou no protótipo.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD, o checkpoint de engenharia e
.ai-dev/visual-reference-workflow.md.
Implemente apenas o escopo desta TSD (fundação técnica do frontend, em frontend/). Não crie
nenhuma feature de produto: as telas são cascas com layout e navegação, sem dados reais nem
lógica de listagem/criação/revisão/conclusão. Não toque em backend/.
Inspecione a referência visual e preencha/reveja a seção 10 antes de ativar a slice no checkpoint.
Nenhum componente deve chamar HTTP direto — todo acesso a dados passa pela camada de dados (fixtures).
Execute lint, typecheck, test e build de dentro de frontend/, e registre a saída real de cada um.
Capture screenshots das cascas e compare o frame com a referência.
Marque um critério de aceite ou validação como concluído somente com evidência real de execução.
Atualize checkpoint e .ai-dev/audit.md ao final, com pendências e próximo passo recomendado.
```
