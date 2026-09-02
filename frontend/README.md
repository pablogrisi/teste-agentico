# Frontend — LicIA Analisadora

App **Next.js (App Router) + TypeScript** da LicIA Analisadora. Frente `frontend/` do
monorepo; a frente `backend/` (NestJS) roda isolada. Método e docs de produto/arquitetura
vivem na raiz.

> **Estado:** fundação (TSD-002) + **RF-002** (listagem, TSD-011) + **RF-001/RF-004** (modal
> "Nova análise", TSD-012) + **RF-010** (tela de análise, TSD-013) + **RF-007** (status
> sugerido pela IA, TSD-014) + **RF-009** (filtros por status, TSD-015) + **RF-008** (modal
> "Alterar parecer", TSD-016) + **RF-011** (checkbox de "verificado" interativo, TSD-017) +
> **RF-017** (justificativa da alteração visível, TSD-018) + **RF-014** (visor de PDF +
> referência de página, TSD-019) + **RF-012** (concluir análise + modal de confirmação,
> TSD-020). `/` lista as análises e abre o modal de criação; `/analise/[id]` mostra cabeçalho
> (com o botão **"Concluir análise"** ao lado do status), o **visor do PDF** à esquerda
> (`<iframe>` de `GET /analises/:id/pdf` navegado por `#page=N` — ou um aviso sem backend) e, à
> direita, as abas Checklist/Técnica com os requisitos em acordeão: status **sugerido pela
> IA** + a **justificativa** quando o parecer difere; lista filtrada por **não conformes** com
> chips de status (na URL); cada requisito tem **"Alterar parecer"**, **checkbox de
> "verificado"** e a **referência de página clicável** (leva o visor à folha) + editor de
> página inline — tudo via `PATCH /analises/:id/requisitos/:requisitoId`, aplicando
> `{ item, resumo }` sem recarregar. **"Concluir análise"** só habilita quando não há
> obrigatório pendente; confirmar chama `POST /analises/:id/concluir` e a tela vira `CONCLUIDA`
> (read-only) na hora. O download do relatório entra em RF-016.

## Pré-requisitos

- Node.js **20+** (ver `.nvmrc`), npm.

## Como rodar

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

> `npm install` num ambiente com npm 11 pode pedir para aprovar os install scripts de
> `esbuild`/`unrs-resolver` (binários nativos): `npm approve-scripts esbuild unrs-resolver`
> e `npm rebuild`. Já declarados em `package.json#allowScripts`.

Rotas:

- `/` — lista de análises (RF-002) + modal "Nova análise" (RF-001/RF-004): tabela + busca +
  filtro por status + ordenação + paginação; "Nova análise" cria via `POST /analises` e navega
  para a análise.
- `/analise/<id>` — tela de análise: **visor de PDF** à esquerda (RF-014 — `<iframe>` de
  `GET /analises/:id/pdf` por `#page=N`, ou aviso sem backend) + abas Checklist/Técnica à
  direita (RF-010); chips de filtro por status (RF-009 — abre em "Não conforme",
  `?requisitos=<slug>` na URL); em cada requisito: **"Alterar parecer"** (RF-008),
  **checkbox de "verificado"** (RF-011) e a **referência de página clicável** + editor de
  página inline (RF-014) — via `PATCH .../requisitos/:requisitoId`, `{ item, resumo }` sem
  recarregar; polling enquanto a análise está processando.

## Scripts

| Comando              | O que faz                                                               |
| -------------------- | ----------------------------------------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento (hot reload)                                |
| `npm run build`      | Build de produção (`next build`; não roda lint)                         |
| `npm run start`      | Serve o build de produção                                               |
| `npm run lint`       | `eslint .` (flat config, `next/core-web-vitals`) + `prettier --check .` |
| `npm run lint:fix`   | `eslint . --fix` + `prettier --write .`                                 |
| `npm run typecheck`  | `tsc --noEmit`                                                          |
| `npm run test`       | Vitest (uma passada)                                                    |
| `npm run test:watch` | Vitest em watch                                                         |
| `npm run ci`         | `lint` → `typecheck` → `test` → `build`                                 |

## Estrutura

```
src/
├── app/                       # App Router
│   ├── layout.tsx             # <html>/<body>, fonte Kanit (next/font), globals.css
│   ├── globals.css            # importa os tokens de tema + reset/base
│   ├── theme/                 # tokens CSS portados do protótipo
│   ├── page.tsx               # rota /  — listagem (Server Component; estado na URL)
│   ├── loading.tsx            # skeleton de carregamento
│   ├── error.tsx              # fallback de erro ("tentar novamente")
│   └── analise/[id]/page.tsx  # rota /analise/[id] — casca
├── components/
│   ├── topbar/                # Topbar institucional (Governo do Ceará)
│   ├── layout/PageShell.tsx   # frame base: Topbar + área de conteúdo
│   ├── brand/CearaLogo.tsx    # placeholder do brasão
│   ├── icons/                 # ícones SVG
│   └── analises/              # AnalisesTable, AnalisesToolbar, SearchField,
│                              # StatusFilter, Paginator, StatusBadge, AnalisesListaVazia
└── lib/
    └── data/                  # SEAM DE DADOS — ver abaixo
test/
└── unit/                      # Vitest + React Testing Library (+ 1 teste de contrato)
```

## Camada de dados (seam)

Todo acesso a dados de análise passa por `src/lib/data/`. **Nenhum componente de tela fala
HTTP direto.**

- `analises-gateway.ts` — interface `AnalisesGateway` (`listarAnalises(query?)`) + `AnalisesGatewayError`.
- `analises-query.ts` — `parseListarAnalisesQuery` (normaliza a querystring, nunca lança) e
  `queryParaString` (serializa omitindo defaults). `TAMANHO_PADRAO=20`, `TAMANHO_MAX=100`.
- `fixtures-analises-gateway.ts` — implementação sem backend; aplica busca (acento/caixa),
  filtro multi-status, ordenação e paginação sobre `fixtures.ts` (24 itens de exemplo).
- `http-analises-gateway.ts` — consumidor do contrato REST `GET /analises` (TSD-005), com
  validação do formato da resposta.
- `index.ts` — **ponto único de composição**: `getAnalisesGateway()`. Devolve
  `HttpAnalisesGateway` quando `NEXT_PUBLIC_API_BASE_URL` está definida; senão, as fixtures.
- `status-analise.ts` — `STATUS_ANALISE`, rótulos e tom de cor por status; `isStatusAnalise`.
- `types.ts` — tipos alinhados ao glossário. `StatusRequisito` tem **três** valores
  (`CONFORME`, `NAO_CONFORME`, `NAO_SE_APLICA`) — o "Com ressalva" do protótipo não existe no MVP.

O estado da listagem (busca, filtros, ordenação, página) vive na **URL** (`?q=&status=&…`);
`/` é Server Component e lê `searchParams`. `SearchField`/`StatusFilter` são Client
Components que fazem `router.replace`.

## Tema

Tokens portados de `Prototipo Licia Analisadora/src/theme/` para CSS custom properties em
`src/app/theme/`. Fonte **Kanit** via `next/font/google`.

## Variáveis de ambiente

Ver `.env.example`. `NEXT_PUBLIC_API_BASE_URL` — base do backend LicIA. Vazia → fixtures.
Definida → `getAnalisesGateway()` usa o `HttpAnalisesGateway`, que fala os contratos já
implementados no `backend/`: `GET /analises`, `POST /analises`, `GET /analises/:id`,
`GET /analises/:id/pdf`, `PATCH /analises/:id/requisitos/:requisitoId`,
`POST /analises/:id/concluir`.

## Rodar contra o backend real

O `backend/` (NestJS) sobe um PostgreSQL embutido nos testes, mas em dev precisa de um
Postgres (`cd backend && docker compose up -d db`). Com o banco de pé:

```bash
# terminal 1 — backend na :3000
cd backend && npm install && npm run prisma:migrate && npm run seed && npm run start:dev

# terminal 2 — frontend na :3001 apontando para o backend
cd frontend
echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:3000' > .env.local
npm run dev -- -p 3001
```

Do lado do backend, deixe o CORS liberar a origem do frontend:
`CORS_ORIGINS=http://localhost:3001` no `backend/.env` (vazio já reflete a origem).

Estado atual da integração:

- **Smoke conjunto rodado contra o backend real** (NestJS + PostgreSQL 17) em 02/09/2026:
  criar análise → processar → visor carregando `GET /analises/:id/pdf` no `<iframe>` →
  editor de página gravando `PATCH { paginaReferencia }` no banco → navegação por `#page=N`
  (RF-014). E, no mesmo dia (RF-012): botão "Concluir análise" bloqueado por obrigatórios →
  verificar o último pela UI destrava sem reload → corrida real `POST /analises/:id/concluir`
  `422` com a lista de `requisitosPendentes` → re-verificar → `200` → tela `CONCLUIDA`
  read-only, `concluidaEm` gravado. Evidência em `docs/visual-reference/rf-014/rf014-real-*.png`
  e `docs/visual-reference/rf-012/`.
- **5 contratos consumidos** batem campo a campo com `backend/src/analises`:
  `GET /analises`, `POST /analises`, `GET /analises/:id`, `PATCH /analises/:id/requisitos/:requisitoId`,
  `POST /analises/:id/concluir`.
- **CORS:** habilitado no backend (`app.enableCors`, commit `35ee46d`) — os modais (fetch no
  navegador) passam; sem `CORS_ORIGINS` o backend reflete a origem.
- `GET /analises/:id/relatorio` existe no backend mas ainda não tem consumidor no frontend
  (RF-016 — último RF do MVP frontend).

## Notas / follow-ups

- **Brasão do Ceará:** `CearaLogo.tsx` é um placeholder local; o brasão oficial entra num
  passo de acabamento posterior (TSD-002 §10.2).
- **Lint:** migrado de `next lint` (deprecado no Next 15) para `eslint .` com flat config
  (`eslint.config.mjs`). `next build` não repete o lint — ele roda no `npm run ci`.
- **`HttpAnalisesGateway`:** validado por teste de contrato + smoke conjunto contra o
  NestJS real (02/09/2026 — ver "Rodar contra o backend real").
- Sem trava de largura (`min-width: 1440px` do protótipo não replicado).
