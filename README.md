# LicIA Analisadora

Ferramenta de verificação assistida por IA da conformidade de documentos de processos licitatórios. Um analista técnico cria uma análise (NUP, objeto e um PDF), o sistema compara o documento com uma base fixa de requisitos normativos, jurídicos e técnicos e sugere um status por requisito; o analista revisa, ajusta o diagnóstico, marca cada requisito como verificado e conclui a análise.

- Produto: [`docs/product/prd.md`](docs/product/prd.md)
- Arquitetura: [`docs/architecture/sdd.md`](docs/architecture/sdd.md)
- Roadmap e status: [`docs/product/roadmap.md`](docs/product/roadmap.md)
- Estado atual de engenharia: [`docs/engineering/checkpoint.md`](docs/engineering/checkpoint.md)
- Método de desenvolvimento por IA: [`START_HERE.md`](START_HERE.md) e [`.ai-dev/`](.ai-dev/) (o pacote do método está descrito em [`.ai-dev/README.md`](.ai-dev/README.md))

## Estrutura do repositório

Monorepo com **duas frentes independentes**, cada uma com seu próprio ciclo de desenvolvimento e suas TSDs:

| Pasta | Frente | Stack | Fundação | Responsável |
|---|---|---|---|---|
| [`backend/`](backend/) | Serviço de API e persistência | NestJS + Prisma + PostgreSQL | [`docs/engineering/specs/001-fundacao-tecnica.tsd.md`](docs/engineering/specs/001-fundacao-tecnica.tsd.md) | Pablo |
| `frontend/` | Aplicação web | Next.js | [`docs/engineering/specs/002-fundacao-frontend.tsd.md`](docs/engineering/specs/002-fundacao-frontend.tsd.md) | Vinicius |
| `Prototipo Licia Analisadora/` | Protótipo de referência visual (não é produto) | React + Vite | — | — |

Método, PRD, SDD, roadmap, glossário e questões abertas ficam na raiz / em `docs/` e são compartilhados pelas duas frentes. Quando um requisito envolve as duas, o contrato de API é definido na TSD de backend do RF e consumido pela de frontend.

## Como rodar

Requisitos: **Node.js 20+** (ver [`.nvmrc`](.nvmrc)) e, para o backend, **Docker** (PostgreSQL local via `docker compose`).

### Backend

```bash
cd backend
cp .env.example .env
docker compose up -d db
npm install
npm run prisma:migrate
npm run start:dev
```

Serviço em `http://localhost:3000`; health check em `http://localhost:3000/health`. Detalhes e variáveis de ambiente em [`backend/README.md`](backend/README.md).

### Frontend

Ainda não inicializado — ver TSD-002.

## Qualidade

Os comandos de lint, typecheck, teste e build de cada frente estão em [`.ai-dev/quality-gates.md`](.ai-dev/quality-gates.md).
