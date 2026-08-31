# LicIA Analisadora — Backend

Serviço de API e persistência da LicIA Analisadora. **Fundação técnica (TSD-001): nenhuma feature de produto implementada ainda.** O que existe: o esqueleto NestJS, conexão com PostgreSQL via Prisma, o endpoint `/health`, os módulos de feature vazios e as fronteiras (portas + adapters) do SDD.

Stack: NestJS 11 · TypeScript · Prisma · PostgreSQL. Ver [`docs/architecture/sdd.md`](../docs/architecture/sdd.md).

## Pré-requisitos

- Node.js 20+ (ver [`../.nvmrc`](../.nvmrc))
- Docker **opcional** — só para rodar o serviço localmente (`docker compose up -d db`). Os testes (`npm run test:e2e`) **não** precisam de Docker: usam um PostgreSQL embutido.

## Rodando localmente

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run prisma:migrate      # aplica as migrations (histórico inicial vazio)
npm run start:dev
```

- Serviço: `http://localhost:3000`
- Health check: `http://localhost:3000/health` → `{ "status": "ok", "db": "up", "timestamp": "..." }`

## Scripts

| Script | O que faz |
|---|---|
| `npm run start:dev` | Sobe em watch mode |
| `npm run build` | `nest build` (compila para `dist/`) |
| `npm run lint` | ESLint + Prettier |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Jest — testes unitários (`test/unit/`) |
| `npm run test:e2e` | Jest + Supertest contra a app real + integração; sobe um PostgreSQL embutido (`test/e2e/`, `test/integration/`) |
| `npm run test:contract` | Testes de contrato das portas (`test/contract/`, vazio na fundação) |
| `npm run test:cov` | Cobertura (Jest) |
| `npm run prisma:validate` | Valida `prisma/schema.prisma` |
| `npm run prisma:migrate` | `prisma migrate deploy` |
| `npm run seed` | Importa `prisma/seed-data/requisitos.csv` para a base |
| `npm run seed:file -- <arquivo>` | Importa outro CSV de requisitos |
| `npm run ci` | `lint` → `typecheck` → `prisma:validate` → `test` → `build` |

`npm run test:e2e` **não precisa de Docker**: `test/embedded-postgres.globalSetup.ts` baixa/sobe um PostgreSQL self-contained e o derruba ao final. Para apontar para um banco externo (ex.: serviço de Postgres da CI): `E2E_EXTERNAL_DB=true` e `DATABASE_URL=...`.

## Variáveis de ambiente

Todas listadas em [`.env.example`](.env.example). Validadas no boot por `src/config/env.validation.ts` — se faltar uma obrigatória, o serviço não sobe.

| Variável | Obrigatória | Default | Descrição |
|---|---|---|---|
| `PORT` | não | `3000` | Porta HTTP |
| `NODE_ENV` | não | `development` | Ambiente |
| `DATABASE_URL` | **sim** | — | Conexão PostgreSQL |
| `ANALISTA_ATUAL_ID` | **sim** | — | Id do analista único do MVP (não há autenticação) |
| `ANALISTA_ATUAL_NOME` | **sim** | — | Nome do analista único do MVP |
| `IA_ADAPTER` | não | `stub` | `stub` ou `http` (este último ainda não implementado) |
| `ARMAZENAMENTO_PDF_DIR` | não | `./var/pdfs` | Diretório onde o adapter de filesystem grava os PDFs |

## Estrutura

```
src/
├── config/          # carregamento e validação de env
├── prisma/          # PrismaService + PrismaModule (global)
├── core/            # fronteiras do SDD §6/§8
│   ├── domain/      # StatusRequisito (3 valores do MVP)
│   ├── ports/       # AnaliseIaPort, ArmazenamentoPdfPort (interfaces + tokens)
│   ├── adapters/    # AnaliseIaStubAdapter, ArmazenamentoPdfFilesystemAdapter
│   ├── analista-atual/  # AnalistaAtualProvider (analista fixo por config)
│   └── core.module.ts   # liga portas → adapters por configuração
├── health/          # GET /health (checa SELECT 1 no banco)
├── analises/        # módulo vazio (RF-001, RF-002, RF-009, RF-012...)
├── requisitos/      # módulo vazio (RF-006, RF-007, RF-008, RF-011, RF-017)
├── processamento/   # módulo vazio (RF-005 — worker)
├── relatorio/       # módulo vazio (RF-016)
├── app.module.ts
└── main.ts
test/
├── unit/            # testes unitários
├── integration/     # vazio na fundação
├── contract/        # vazio na fundação
└── e2e/             # health.e2e-spec.ts
```

## O que NÃO está aqui (por escopo da TSD-001)

Nenhuma tabela de domínio (`analise`, `requisito`, `avaliacao_requisito`), nenhuma rota de análise, sem worker de processamento, sem adapter HTTP real da IA, sem autenticação, sem geração de relatório. Cada um entra na TSD do RF correspondente — ver [`docs/product/roadmap.md`](../docs/product/roadmap.md).
