# Frontend — LicIA Analisadora

App **Next.js (App Router) + TypeScript** da LicIA Analisadora. Frente `frontend/` do
monorepo; a frente `backend/` (NestJS) roda isolada. Método e docs de produto/arquitetura
vivem na raiz.

> **Estado:** fundação (TSD-002) + **RF-002** (listagem, TSD-011) + **RF-001/RF-004** (modal
> "Nova análise", TSD-012) + **RF-010** (tela de análise, TSD-013) + **RF-007** (status
> sugerido pela IA, TSD-014). `/` lista as análises e abre o modal de criação;
> `/analise/[id]` mostra cabeçalho + abas Checklist/Técnica (navegação livre) com os
> requisitos em acordeão **somente leitura**, cada um indicando o status **sugerido pela IA**
> e a divergência quando o parecer atual difere. Filtros, edição de parecer, verificado
> interativo e visor de PDF entram em RF-009/008/011/014.

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
- `/analise/<id>` — tela de análise (RF-010): cabeçalho + abas Checklist/Técnica + lista de
  requisitos avaliados (read-only); polling enquanto a análise está processando; visor de PDF
  é placeholder (RF-014).

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

Ver `.env.example`. `NEXT_PUBLIC_API_BASE_URL` — base do backend LicIA. Definida →
`getAnalisesGateway()` usa o gateway HTTP (contrato TSD-005). Vazia → fixtures.

## Notas / follow-ups

- **Brasão do Ceará:** `CearaLogo.tsx` é um placeholder local; o brasão oficial entra num
  passo de acabamento posterior (TSD-002 §10.2).
- **Lint:** migrado de `next lint` (deprecado no Next 15) para `eslint .` com flat config
  (`eslint.config.mjs`). `next build` não repete o lint — ele roda no `npm run ci`.
- **`HttpAnalisesGateway`:** validado por teste de contrato (formato do payload). Falta um
  smoke contra o backend real (sem ambiente conjunto neste momento).
- Sem trava de largura (`min-width: 1440px` do protótipo não replicado).
