# TSD — Fundação técnica do serviço LicIA Analisadora

---
title: TSD - Fundação técnica do serviço LicIA Analisadora
type: tsd
status: implementada em branch (backend/tsd-001-fundacao-tecnica) — em validação
created: 31/08/2026 // Pablo Grisi
updated: 31/08/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/decisions/001-framework-backend-nestjs.md
---

## 1. Resumo

Esta slice cria o esqueleto do **serviço backend** da LicIA Analisadora em `backend/`: um projeto NestJS + TypeScript que sobe, conecta num PostgreSQL local via Prisma, roda os quality gates (`lint`, `typecheck`, `test`, `test:e2e`, `build`) e expõe um endpoint de health. Ela deixa preparadas as **fronteiras** definidas no SDD — as portas (`AnaliseIaPort`, `ArmazenamentoPdfPort`, `AnalistaAtualProvider`) com adapters mínimos — mas **não entrega nenhuma feature de produto**: não há criação de análise, base de requisitos, processamento nem telas.

O repositório é um monorepo com duas frentes independentes: `backend/` (esta TSD) e `frontend/` (TSD-002). As duas fundações podem ser implementadas em paralelo. Esta TSD também estabelece a estrutura mínima da **raiz** do monorepo (o que fica compartilhado vs. por pacote).

**User Story de origem:** nenhuma — TSD-001 é fundação técnica, não vem do ciclo de uma feature de produto.

## 2. Objetivo técnico

Ao final desta slice (comandos rodados de `backend/`, salvo indicação):

- `npm install && npm run start:dev` sobe o serviço localmente.
- `docker compose up -d db` sobe um PostgreSQL para desenvolvimento e testes.
- `npx prisma migrate dev` aplica um schema inicial vazio (sem tabelas de domínio ainda, ou só com uma migration base).
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e` e `npm run build` rodam e passam.
- `GET /health` responde `200` com status do serviço e checagem de conexão com o banco.
- Existe a estrutura de módulos vazia espelhando o SDD §6, e as portas do SDD §8 declaradas como interfaces com um adapter mínimo cada (stub/config), registráveis por injeção de dependência.
- Há um pipeline de CI (ou script único `npm run ci`) que roda todos os quality gates.

## 3. Escopo

### Incluído

- **Raiz do monorepo:** `.gitignore` consolidado, `README.md` da raiz explicando as duas frentes e como cada uma roda, e um `.nvmrc`/decisão de versão de Node comum. Sem gerenciador de workspace (npm workspaces/turbo) nesta slice, salvo se trivial — cada pacote tem seu próprio `package.json` e roda isolado, para não acoplar as frentes. O protótipo (`Prototipo Licia Analisadora/`) permanece como está.
- **Serviço backend em `backend/`:** projeto NestJS + TypeScript — `package.json`, `tsconfig`, `nest-cli.json`, estrutura `src/`.
- Scripts de quality gate no `package.json`: `lint` (ESLint + Prettier), `typecheck` (`tsc --noEmit`), `test` (Jest unitário), `test:e2e` (Jest + Supertest), `test:contract` (placeholder que roda a pasta `test/contract/`), `build` (`nest build`), `ci` (encadeia todos).
- ESLint + Prettier configurados (`@typescript-eslint`).
- Prisma: `schema.prisma` com datasource PostgreSQL e generator client; uma migration inicial (pode ser vazia de tabelas de domínio). `prisma validate` no CI.
- `docker-compose.yml` com um serviço `db` (PostgreSQL) para dev e testes.
- Configuração por ambiente (`@nestjs/config`): `DATABASE_URL`, `ANALISTA_ATUAL_ID` / `ANALISTA_ATUAL_NOME`, `IA_ADAPTER` (`stub` | `http`), `ARMAZENAMENTO_PDF_DIR`.
- Módulo `HealthModule` com `GET /health` (inclui `SELECT 1` no banco).
- Estrutura de módulos vazia: `AnalisesModule`, `RequisitosModule`, `ProcessamentoModule`, `RelatorioModule` — declarados, sem rotas de produto.
- Portas e adapters mínimos:
  - `AnaliseIaPort` (interface) + `AnaliseIaStubAdapter` (retorna vazio/determinístico) — sem `HttpAdapter` real ainda.
  - `ArmazenamentoPdfPort` (interface) + `ArmazenamentoPdfFilesystemAdapter` (grava/lê em `ARMAZENAMENTO_PDF_DIR`).
  - `AnalistaAtualProvider` (lê da config e devolve `{ analistaId, nome }`).
- `README.md` do serviço: como rodar, como testar, variáveis de ambiente.
- Setup de teste: config Jest unit + e2e, helper para subir a app Nest em teste e apontar para um banco de teste; 1 teste unitário trivial e 1 teste e2e do `/health` para provar que a infra de teste funciona.
- Estrutura de pastas de teste: `test/unit/`, `test/integration/`, `test/contract/`.

### Fora do escopo

- Qualquer feature de produto (RF-001…RF-018). Nenhuma tabela de domínio (`analise`, `requisito`, `avaliacao_requisito`), nenhuma rota de análise.
- `HttpAdapter` real da `AnaliseIaPort` (depende de A-02).
- Worker de processamento com lógica (só o módulo vazio).
- Autenticação, identidade real, qualquer coisa ligada a RF-003 / P-10.
- Deploy em ambiente da PGE (só o `Dockerfile` pode entrar se for trivial; pipeline de deploy não).
- Geração de PDF de relatório.
- **Frontend (`frontend/`)** — fundação própria na TSD-002, implementada em paralelo por Vinicius. Esta TSD não cria o app Next.js.
- Gerenciador de workspace do monorepo (npm workspaces, turborepo, nx).

## 4. Contexto consultado

- `START_HERE.md`
- `.ai-dev/context-map.md`
- `docs/engineering/checkpoint.md`
- `docs/product/prd.md` (§7, §8 — para nomear módulos e portas de forma alinhada ao domínio)
- `docs/architecture/sdd.md` (§2, §3, §5, §6, §8, §9 — stack, estrutura, portas)
- `docs/engineering/decisions/001-framework-backend-nestjs.md`
- `.ai-dev/quality-gates.md` (comandos)
- `docs/product/glossario.md` (nomes de domínio)

## 5. Impacto esperado

- **Produto:** nenhum comportamento de produto novo.
- **Arquitetura:** materializa a estrutura de módulos e as fronteiras (portas) do SDD; nenhuma decisão nova além do que já está no SDD e no DR-001.
- **Implementação:** cria o repositório de código do serviço do zero.
- **Testes:** estabelece a infraestrutura de testes (Jest unit + e2e, banco de teste) e os comandos que o Agente de Testes vai usar dali em diante.
- **Documentação:** `README.md` do serviço; atualização de checkpoint e `.ai-dev/audit.md` ao final.
- **Operação:** `docker-compose.yml` para banco local; `Dockerfile` opcional. Sem deploy.

## 6. Plano de implementação

1. Criar `backend/` e inicializar o projeto NestJS + TypeScript dentro dele. Ajustar `.gitignore` da raiz e escrever o `README.md` da raiz (duas frentes).
2. Configurar ESLint + Prettier + `tsconfig` estrito; adicionar scripts `lint`, `typecheck`.
3. Configurar Jest unitário e e2e; adicionar `test`, `test:e2e`, `test:contract`, criar `test/unit|integration|contract/`.
4. Adicionar `@nestjs/config` e o schema de variáveis de ambiente; `.env.example`.
5. Adicionar Prisma: `schema.prisma` (datasource Postgres), `prisma migrate dev` inicial, script de `prisma validate`.
6. Criar `docker-compose.yml` com `db` (Postgres) e documentar `DATABASE_URL` para dev e teste.
7. Criar `HealthModule` com `GET /health` (app + `SELECT 1`); teste e2e do endpoint.
8. Criar os módulos vazios `AnalisesModule`, `RequisitosModule`, `ProcessamentoModule`, `RelatorioModule` e registrá-los no `AppModule`.
9. Declarar as portas (`AnaliseIaPort`, `ArmazenamentoPdfPort`, `AnalistaAtualProvider`) como interfaces + tokens de DI; implementar `AnaliseIaStubAdapter`, `ArmazenamentoPdfFilesystemAdapter`, `AnalistaAtualProvider` (config). Um teste unitário por adapter mínimo.
10. Adicionar script `ci` encadeando `lint && typecheck && prisma validate && test && build` (e `test:e2e` se o CI tiver Postgres) e/ou workflow de CI.
11. Escrever o `README.md` do serviço.
12. Rodar todos os quality gates e registrar a saída real.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário (lógica isolada, dependências mockadas) | Sim | Provar que a infra de teste unitário funciona e cobrir os adapters mínimos (`AnaliseIaStubAdapter`, `ArmazenamentoPdfFilesystemAdapter`, `AnalistaAtualProvider`). Sem lógica de domínio ainda, então o volume é pequeno de propósito. |
| Integração (módulos/camadas reais, ex.: contra banco de teste) | Sim | Um teste e2e de `GET /health` subindo a app Nest real e batendo no PostgreSQL de teste, para provar que app + config + Prisma + banco conversam. |
| Contrato (formato entre serviços que não sobem juntos) | Não nesta slice | As portas existem, mas não há adapter real nem contrato externo fechado (A-02). A pasta `test/contract/` e o script ficam criados e vazios; o primeiro teste de contrato entra quando a `AnaliseIaPort` ganhar `HttpAdapter`. |
| Smoke/validação manual contra dependência externa real | Não | Não há integração externa real nesta slice. |

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npx prisma validate
npm run test
npm run test:e2e      # requer o Postgres do docker-compose no ar
npm run build
```

## 8. Critérios de aceite

- [ ] `npm install` a partir de um clone limpo, seguido de `docker compose up -d db` e `npm run start:dev`, sobe o serviço sem erro.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e` e `npm run build` terminam com sucesso, com a saída real registrada no checkpoint/relatório de sessão.
- [ ] `GET /health` responde `200` com corpo indicando serviço no ar e conexão com o banco OK; há teste e2e cobrindo isso.
- [ ] `schema.prisma` valida (`npx prisma validate`) e a migration inicial aplica num banco limpo.
- [ ] `AppModule` registra `AnalisesModule`, `RequisitosModule`, `ProcessamentoModule`, `RelatorioModule` — todos sem rota de produto.
- [ ] As três portas do SDD estão declaradas como interfaces com token de DI e um adapter mínimo cada, coberto por teste unitário.
- [ ] Nenhuma tabela de domínio, nenhuma rota de análise, nenhuma feature de produto foi implementada.
- [ ] `README.md` do serviço documenta execução, testes e variáveis de ambiente.
- [ ] `.env.example` lista todas as variáveis usadas.

## 9. Riscos e decisões abertas

- **Local do código:** decidido — serviço backend em `backend/` (monorepo; `frontend/` é a outra frente, TSD-002). Sem gerenciador de workspace nesta slice.
- **`test:e2e` no CI** depende de ter um PostgreSQL no runner; se não houver de imediato, rodar e2e só localmente e registrar a lacuna (não marcar como "não se aplica").
- **Versão do Node / gerenciador de pacotes** (npm vs. pnpm): assumir Node LTS 20+ e npm salvo indicação contrária; fixar com `.nvmrc` / `engines`. A escolha deve ser a mesma nas duas frentes — alinhar com a TSD-002.
- **Contrato de API para o frontend:** não é escopo desta slice. Cada RF de backend define seu contrato REST na TSD do RF; a TSD-002 e os ciclos de frontend consomem. Até lá, o frontend trabalha com fixtures.
- Não fecha nenhuma questão de `questoes-abertas.md`; apenas cria os seams para A-02, A-05 e P-10 serem endereçados sem retrabalho estrutural.

## 10. Referências visuais

Não se aplica — esta slice não altera interface visível (não há frontend nesta TSD).

## 11. Rollback

A slice cria `backend/` isolado. Rollback = remover `backend/` e reverter os arquivos de raiz adicionados (`.gitignore`, `README.md` da raiz, `docker-compose.yml` se estiver na raiz, workflow de CI), sem impacto em `.ai-dev/`, `docs/`, `frontend/` ou no protótipo. Nenhuma migração de dados real a reverter.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD e o checkpoint de engenharia.
Implemente apenas o escopo desta TSD (fundação técnica do backend, em backend/). Não crie
nenhuma feature de produto, tabela de domínio ou rota de análise. Não toque em frontend/
(fundação própria na TSD-002). Não expanda escopo silenciosamente.
Execute lint, typecheck, prisma validate, test, test:e2e e build de dentro de backend/, e registre a saída real de cada um.
Marque um critério de aceite ou validação como concluído somente com evidência real de execução.
Atualize checkpoint e .ai-dev/audit.md ao final, com pendências e próximo passo recomendado.
```
