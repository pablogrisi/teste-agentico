# Auditoria — LicIA Analisadora

Trilha cronológica detalhada de sessões e intervenções, separada do estado resumido do checkpoint. Cada entrada deve ser suficiente para reconstituir o que foi feito, por quê, e o que ficou pendente, sem precisar ler o git log inteiro.

Uma entrada nova a cada sessão relevante (implementação, decisão, investigação, correção de processo). Não é necessário registrar leituras que não geraram mudança.

## Formato sugerido por entrada

```text
## <data> — <resumo curto>

Contexto: <por que essa sessão aconteceu>
Alterações: <o que mudou, com caminhos de arquivo>
Validações: <o que foi executado e o resultado>
Decisões: <decisões tomadas nesta sessão, com link pro decision record se houver>
Pendências: <o que ficou em aberto>
```

---

<!-- Entradas abaixo, da mais recente para a mais antiga -->

## 31/08/2026 — RF-009 / TSD-007: abrir análise (backend)

Contexto: usuário mandou "faz o merge e abre o ciclo de RF-009". TSD-006 mergeada na `main` (`64b2909` fecha; `67ff89f` traz o código). Ciclo na branch `backend/rf-009-abrir-analise`.

Papéis:
- **PM**: 4 perguntas — statusFinal e resumo escolhidos pelo usuário; formato do endpoint e agrupamento "você decide" → IA: enriquecer `GET /analises/:id`, agrupado por área no backend. Registrado em `perguntas-e-respostas.md`.
- **Engenheiro**: `docs/engineering/specs/007-abrir-analise.tsd.md`.
- **Dev**: `src/analises/analise-detalhe.ts` (`montarAnaliseDetalhe` pura — agrupa por área alfabética, `NAO_CONFORME` por `statusFinal` primeiro depois `ordem`, `norma` estruturada, `resumo`); `AnalisesService.abrir` (buscarPorId + `findMany` com `include: requisito`); `GET /analises/:id` passa a devolver o `AnaliseDetalhe`. Contrato anterior preservado. +4 unit + 1 integração.
- **Testes**: `npm run ci` ✅ (65 unit) · `npm run test:e2e` ✅ 24/24.
- **Crítico**: aprovado, sem desvios. Menores: payload cresce com a base real (§9); método do controller ainda `buscar`.
- **Documentador**: SDD §7 item 2 (payload de `GET /analises/:id`); checkpoint; roadmap RF-009 → `implementada` (branch).

Estado: ciclo fechado, **branch aguardando sign-off + merge**. Próximo backend: RF-008 + RF-011 + RF-017 (revisão de requisito).

## 31/08/2026 — RF-005 + RF-007 / TSD-006: processamento da análise (backend)

Contexto: usuário mandou "faz o merge e abre o ciclo de RF-005+RF-007". RF-002/TSD-005 mergeada na `main` (`ce30442` fecha; `57b170f` traz o código). Ciclo na branch `backend/rf-005-processamento`.

Papéis:
- **PM**: agrupou RF-005+RF-007. 4 perguntas, todas "você decide" → decisões da IA: disparo imediato + varredura 5s + recuperação no boot (sob `PROCESSAMENTO_AUTO`); `POST /analises/:id/reprocessar`; `IA_TIMEOUT_MS=120000`; base vazia → `ERRO_PROCESSAMENTO`. Registrado em `perguntas-e-respostas.md`.
- **Engenheiro**: `docs/engineering/specs/006-processamento-analise.tsd.md`.
- **Dev**: model `AvaliacaoRequisito` + migration `20260901010000` (FK cascade/restrict, `@@unique`); `ProcessamentoService` (claim atômico via `updateMany` count, `comTimeout`, gravação transacional de 1 avaliação/requisito com default `NAO_SE_APLICA`, `PRONTA_PARA_REVISAO`/`ERRO_PROCESSAMENTO`, `processarPendentes` single-flight, `recuperarPresas`, `disparar`); `AnalisesService.criar` dispara; `reprocessar` + `POST /analises/:id/reprocessar`. Config `IA_TIMEOUT_MS`/`PROCESSAMENTO_INTERVALO_MS`/`PROCESSAMENTO_AUTO`. **`@nestjs/schedule` descartado** (ESM-only, quebra o ts-jest CJS) → `setInterval` próprio + `onModuleDestroy`.
- **Testes**: `npm run ci` ✅ (**61 unit**) · `npm run test:e2e` ✅ **21/21** (+ integração `processamento`: processar, claim atômico não duplica, base vazia→erro, reprocessar 200/409/404, `recuperarPresas`).
- **Crítico**: aprovado. Desvio do `@nestjs/schedule` justificado. Menores: falha na transação da etapa 6 deixa `PROCESSANDO` até o boot (varredura só olha `PENDENTE`) → nova questão **A-07**; `comTimeout` não cancela a chamada subjacente.
- **Documentador**: SDD §6/§7/§8/§9; checkpoint; roadmap RF-005/RF-007 → `implementada` (branch); `questoes-abertas.md` A-07.

Estado: ciclo fechado, **branch aguardando sign-off + merge**. Próximo backend: RF-009 (abrir análise — leitura das avaliações agrupadas/ordenadas).

## 31/08/2026 — RF-002 / TSD-005: listagem de análises (backend)

Contexto: usuário mandou "segue pro próximo passo". Antes de abrir RF-002, a branch `backend/rf-001-criar-analise` (TSD-004) foi empurrada e mergeada na `main` por fast-forward (`6c7e983..9dd6792`). Ciclo de RF-002 na branch `backend/rf-002-listagem` (a partir do `main`).

Papéis:
- **PM**: User Story + critérios no roadmap; P-06 (contrato da listagem) fechado — usuário respondeu "você decide" nas 3 perguntas; a IA decidiu: contrato completo (`q` em nup+objeto insensitive, `status` multi, `ordenarPor` iniciadaEm|nup, `ordem`, `pagina`/`tamanho` 20/máx 100), resposta `{ itens, total, pagina, tamanho }`, itens com 6 campos, sem contagens.
- **Engenheiro**: `docs/engineering/specs/005-listagem-analises.tsd.md`.
- **Dev**: `src/analises/listar-analises.query.ts` (parser + 422), `AnalisesService.listar` (where + orderBy dinâmico + skip/take + `$transaction([findMany, count])`), rota `GET /analises` no controller. `test:e2e` passou a rodar `--runInBand` (dois integration specs mutam a mesma tabela `analise` no Postgres compartilhado). +11 unit + 1 integração (7 casos).
- **Testes**: `npm run ci` ✅ (49 unit) · `npm run test:e2e` ✅ 16/16.
- **Crítico**: aprovado, com feedback aplicado no ciclo — parser passou a aceitar param repetido (`?status=A&status=B`), não só vírgula (antes: 500 em vez de 422). +1 unit. Re-teste verde.
- **Documentador**: SDD §7 (contrato de `GET /analises`); checkpoint §1/§2/§3/§3.1/§5/§7; roadmap RF-002 → `implementada` (branch); `questoes-abertas.md` P-06 → fechada (R-05).

Estado: ciclo fechado, **branch aguardando sign-off + merge**. Próximo backend: RF-005 + RF-007 (worker + gravação da sugestão) — cria `avaliacao_requisito`.

## 31/08/2026 — RF-001 + RF-004 + RF-018 / TSD-004: criar análise com PDF persistido (backend)

Contexto: usuário pediu "abre o ciclo do PM e siga com o desenvolvimento das próximas partes". Ciclo completo na branch `backend/rf-001-criar-analise` (a partir do `main` `13b111e`).

Papéis:
- **PM**: agrupou RF-001+RF-004+RF-018 num ciclo backend. User Story + critérios no roadmap; 4 perguntas ao usuário. Respostas: PDF válido = mimetype `application/pdf` + magic bytes `%PDF-` + limite 25 MB (`ANALISE_PDF_TAMANHO_MAX_MB`) + recusa `/Encrypt`; NUP string livre (≤60); `status` todos os valores do SDD como string+allowlist; NUP repetido permitido (sem unique).
- **Engenheiro**: `docs/engineering/specs/004-criar-analise.tsd.md`.
- **Dev**: model `Analise` + migration `20260901000000_criar_analise`; `src/analises/` (`status-analise.ts`, `ValidacaoAnaliseService`, `AnalisesService`, `AnalisesController`); `POST /analises` (multipart via `FileInterceptor`), `GET /analises/:id`, `GET /analises/:id/pdf` (`StreamableFile`); config `ANALISE_PDF_TAMANHO_MAX_MB`; dep `@types/multer`. +15 unit + 1 integração (`analises.integration-spec`).
- **Testes**: `npm run ci` ✅ (lint, typecheck, prisma validate, **38 unit**, build) · `npm run test:e2e` ✅ **9/9** (health + requisitos-importador + analises: criar→buscar→baixar PDF, 422 sem criar linha, 404s), Postgres embutido.
- **Crítico**: aprovado. Refinação: `POST /analises` responde **201** (não 202 — nada assíncrono na requisição); SDD §7 ajustado. Menores: `STATUS_ANALISE` seam para RF-005; heurística `/Encrypt`; teto multer 60 MB; PDF órfão possível se `create` falha após `salvar` (aceito no MVP).
- **Documentador**: SDD §7/§8 (`analise` implementada, 201); checkpoint §1/§2/§3/§5/§7; roadmap RF-001/004/018 → `implementada`; nova questão **P-11** (máscara do NUP).

Estado: ciclo fechado, **branch aguardando sign-off + merge na `main`**. Próximo backend: RF-002 (listagem — depende de P-06).

## 31/08/2026 — Merge da fundação backend + RF-006 na `main`; modelo de branch definido

Contexto: usuário questionou se valia fazer merge na `main` ou manter uma branch longa por pessoa até o fim. Decidido: **merge frequente na `main`**, porque os documentos vivos do método (`checkpoint.md`, `roadmap.md`, `audit.md`, `questoes-abertas.md`) são fonte de verdade única e branches longas divergentes os inviabilizam.

Ações:
- `git push -u origin backend/tsd-001-fundacao-tecnica` (backup/visibilidade).
- `git checkout main && git merge --ff-only backend/tsd-001-fundacao-tecnica` → fast-forward `0b90f8a..13b111e` (76 arquivos, sem commit de merge, sem conflito).
- `git push origin main`.

Modelo de branch adotado daqui pra frente: **uma branch curta por ciclo/TSD**, mergeada no `main` quando o Documentador fecha. Frentes backend/frontend em pastas distintas → merges por ciclo quase não conflitam. A branch `backend/tsd-001-fundacao-tecnica` acumulou 3 ciclos (TSD-001 + RF-006 + infra de teste) — foi o sintoma do modelo "uma branch por pessoa"; agora mergeada, não usar mais.

Fechamento (Documentador): TSD-001 e TSD-003 → `concluída`; roadmap RF-006 (backend) → `implementada`; checkpoint §1/§2/§3/§5/§7 atualizados.

Próximo: backend abre ciclo de RF-001+RF-004+RF-018 em `backend/rf-001-criar-analise`; frontend faz a TSD-002 em `frontend/tsd-002-fundacao`, ambas a partir do `main` `13b111e`.

## 31/08/2026 — Infra de teste: PostgreSQL embutido (resolve pendência de e2e)

Contexto: usuário perguntou se dava pra instalar Docker nesta máquina. Não dá — sem WSL2, sem privilégio de admin, e Docker Desktop mexe em config de sistema/virtualização (fora do que a IA deve fazer). Alternativa implementada para destravar `test:e2e` sem Docker.

Alterações (`backend/`):
- dep dev `embedded-postgres` (só publica betas — `18.4.0-beta.17`; aceito por ser infra de teste, com teardown blindado).
- `test/embedded-postgres.globalSetup.ts`: sobe um PostgreSQL self-contained numa porta dedicada (54329), aplica `prisma migrate deploy`, grava um handle em `os.tmpdir()`. `E2E_EXTERNAL_DB=true` + `DATABASE_URL` pula o embutido (CI com serviço de Postgres).
- `test/embedded-postgres.globalTeardown.ts`: mata o processo pelo `postmaster.pid` (hard kill cross-platform — `taskkill /F /T` no Windows, `SIGKILL` no resto), com `pg.stop()` como fallback; limpa o tmp dir com retries. Nunca trava, nunca falha a run.
- `test/embedded-postgres.d.ts`: tipos mínimos (pacote é ESM-only sem campo `types`; `moduleResolution: node` clássico não acha os `.d.ts`).
- `test/jest-e2e.json`: `globalSetup`/`globalTeardown` + `testTimeout` 30s. `test:e2e` roda com `--forceExit`.
- `setup-e2e-env.ts`: `DATABASE_URL` sai daqui (quem define é o globalSetup).
- `prisma/migrations/20260831010000_base_fixa_requisitos/migration.sql`: removida uma linha `warn ...` do Prisma que tinha vazado no arquivo pelo `>` de stdout na autoria (causava `syntax error at or near "warn"` no `migrate deploy`).

Validação (Windows, sem Docker):
- `npm run ci` ✅ (lint, typecheck, prisma validate, `test` 23/23, build)
- `npm run test:e2e` ✅ 5/5 (`health.e2e-spec` + `requisitos-importador.integration-spec`), rodado 2× seguidas (idempotência de porta/dir), sem processos ou tmp dirs órfãos.

Efeito: a pendência de ambiente carregada por TSD-001 e TSD-003 está **resolvida**. Ambas passam a bateria completa; falta só o sign-off humano e o merge na `main`. Docs atualizadas: `quality-gates.md`, `context-map.md`, `backend/README.md`, checkpoint, TSD-001 §9, TSD-003 §7.1/§9.

Follow-up aberto: migrar `package.json#prisma` para `prisma.config.ts` antes do Prisma 7 (hoje só um warning).

## 31/08/2026 — RF-006 / TSD-003: base fixa de requisitos (backend)

Contexto: pós-TSD-001, usuário pediu "siga com o processo" e commits na branch de backend. Ciclo completo de RF-006 (recorte backend) na branch `backend/tsd-001-fundacao-tecnica`.

Papéis:
- **PM**: confirmou RF-006 como início; rascunhou User Story + critérios no roadmap; 5 perguntas ao usuário. Respostas aplicadas: seed via importador de arquivo externo (não lista em código); `norma_referencia` estruturada; sem coluna de versão (imutabilidade + `ativo=false`); `area` como campo flexível, não enum; sem endpoint HTTP neste slice. `obrigatorio` decidido imutável (efeito normativo).
- **Engenheiro**: `docs/engineering/specs/003-base-fixa-requisitos.tsd.md` (aprovada pelo usuário).
- **Dev**: modelo Prisma `Requisito` + migration `20260831010000_base_fixa_requisitos`; `src/requisitos/` (areas allowlist, importador `parse`/`validar`/`importarRequisitos` transacional, `ImportadorRequisitosService`, `RequisitosService.listarAtivos()`); `prisma/seed.ts` + `seed-data/requisitos.csv` (placeholder 12 itens); dep `csv-parse`; `test:e2e` passou a cobrir `test/integration/`. 4 specs unit novas.
- **Testes (mecânico)**: `lint` ✅ · `typecheck` ✅ · `prisma validate` ✅ · `test` ✅ 23/23 (8 suites) · `build` ✅ · `test:e2e` ⛔ (health + integração) — sem Docker/Postgres nesta máquina (`Can't reach database server at localhost:5432`).
- **Crítico**: aprovado; todos os critérios da TSD-003 atendidos no código e nos unitários; pendência = rodar os testes de integração contra Postgres. Observações menores: aviso de deprecação `package.json#prisma`; `ImportadorRequisitosService` sem consumidor ainda.
- **Documentador**: checkpoint §1/§3.1/§4/§7, SDD §8 (linha `requisito`), roadmap (RF-006 backend → `em validação`), `questoes-abertas.md` (A-03 fechada).

Decisões: ver linhas novas no checkpoint §4. Nada de merge na `main` até a bateria com Postgres passar.

Pendências: `docker compose up -d db && npm run prisma:migrate && npm run seed && npm run test:e2e`; depois fechar TSD-001 + RF-006 e mergear; abrir próximo ciclo backend (RF-001+RF-004+RF-018).

## 31/08/2026 — TSD-001: implementação da fundação técnica do backend

Contexto: TSD-001 aprovada. Usuário pediu para implementar o backend numa branch separada.

Branch: `backend/tsd-001-fundacao-tecnica` (a partir da `main`).

Alterações:
- Raiz: `.gitignore`, `.gitattributes` (LF), `.nvmrc` (20), `README.md` reescrito para o projeto (duas frentes); README do método movido para `.ai-dev/README.md` (via `git mv`).
- `backend/`: projeto NestJS 11 + TypeScript (strict). `package.json` com scripts `lint`/`typecheck`/`test`/`test:e2e`/`test:contract`/`build`/`ci` e `prisma:*`. ESLint flat (`eslint.config.mjs`) + Prettier. `tsconfig(.build).json`, `nest-cli.json`.
- Prisma: `schema.prisma` (datasource postgres, generator client, **sem tabelas de domínio**), migration inicial vazia + `migration_lock.toml`. `docker-compose.yml` com Postgres 16.
- `src/`: `ConfigModule` global com `validateEnv` (falha no boot se faltar env obrigatória); `PrismaModule`/`PrismaService` (connect no boot, `healthCheck` = `SELECT 1`); `CoreModule` com as portas `AnaliseIaPort` e `ArmazenamentoPdfPort` (interfaces + tokens), adapters `AnaliseIaStubAdapter` (determinístico) e `ArmazenamentoPdfFilesystemAdapter`, e `AnalistaAtualProvider` (analista fixo por config); `HealthModule` (`GET /health` → 200 com `{status, db, timestamp}`); módulos de feature vazios `Analises/Requisitos/Processamento/Relatorio`. `main.ts` com `enableShutdownHooks`.
- `test/`: `test/unit/` com 4 specs (health service, stub adapter, filesystem adapter, analista atual provider — 8 testes); `test/e2e/health.e2e-spec.ts` (Supertest); `test/integration/` e `test/contract/` vazios (`.gitkeep`); configs `jest-e2e.json` e `jest-contract.json`.

Validações (rodadas de `backend/`):
- `npm run lint` ✅ (após `--fix` de formatação Prettier)
- `npm run typecheck` ✅
- `npx prisma validate` ✅ · `npx prisma generate` ✅ (client v6.19.3)
- `npm run test` ✅ — 8 testes, 4 suites
- `npm run build` ✅
- `npm run test:contract` ✅ (sem testes, `--passWithNoTests`)
- `npm run test:e2e` ⛔ **não executável nesta máquina** — sem Docker/Postgres: `PrismaClientInitializationError: Can't reach database server at localhost:5432`. Não é defeito de código; TSD-001 §9 previu esse gap. Pendência aberta: rodar com Docker.

Decisões: código do serviço em `backend/` (fecha a questão de local do código); sem gerenciador de workspace no monorepo (cada pacote isolado); `AnaliseIaPort` com `IA_ADAPTER=http` falhando explicitamente até existir adapter real (A-02).

Pendências: e2e com Postgres; revisão do Crítico; merge da branch na `main` após fechamento do ciclo.

## 31/08/2026 — Fundação: bootstrap do método para LicIA Analisadora

Contexto: repositório continha o Método Agentico v2 + um exemplo preenchido (PRD LicIA + protótipo visual) e nenhum `docs/engineering/checkpoint.md`. Usuário pediu para começar o projeto; confirmado que o projeto é a própria LicIA Analisadora. Seguido o roteiro de `.ai-dev/bootstrap.md`.

Alterações:
- Etapa 0: `{{NOME_DO_PROJETO}}` → "LicIA Analisadora" em `START_HERE.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.ai-dev/workflow.md`, `.ai-dev/quality-gates.md`, `.ai-dev/audit.md`, `.ai-dev/context-map.md`.
- Etapa 1: `docs/product/prd.md` aprovado como baseline; RF-016 e RF-018 promovidos a Must/MVP; RF-003 e estado "sem permissão" marcados pós-MVP; regras de negócio de identidade reescritas (analista único fixo). Criado `docs/product/questoes-abertas.md` (P-01..P-10, A-01..A-06, R-01..R-04).
- Etapa 2: criado `docs/architecture/sdd.md` (aprovado); `.ai-dev/quality-gates.md` preenchido com comandos NestJS/Prisma reais; criado `docs/engineering/decisions/001-framework-backend-nestjs.md` (NestJS; Fastify descartado).
- Etapas 3–4: `.ai-dev/context-map.md` seções de testes e de contexto visual preenchidas (inclui divergências protótipo × PRD).
- Etapa 5: criado `docs/product/glossario.md`.
- Etapa 6: criados `docs/engineering/checkpoint.md`, `docs/product/roadmap.md` e `docs/engineering/specs/001-fundacao-tecnica.tsd.md` (draft).
- Após revisão da Etapa 6, o usuário pediu para dividir o trabalho em **duas frentes paralelas num monorepo**: `backend/` (Pablo) e `frontend/` (Vinicius, em branch). Reescrito o `roadmap.md` com duas tabelas de sequenciamento (Backend / Frontend); ajustados SDD §2/§3/§5, `quality-gates.md`, `context-map.md` e checkpoint; TSD-001 reescopada para `backend/` (decisão de local do código fechada); criada `docs/engineering/specs/002-fundacao-frontend.tsd.md` (draft, Next.js + Vitest + camada de dados com fixtures).

Validações: nenhuma execução de código (fundação documental). Nenhum quality gate rodado — não há projeto de código ainda.

Decisões: nome do projeto; PRD baseline; RF-016/RF-018 no MVP; MVP sem identidade (analista único); stack Node/TS/NestJS/PostgreSQL/Prisma (DR-001); processamento assíncrono em processo; relatório PDF sob demanda; monorepo com frentes backend/frontend independentes; fundação em TSD-001 (backend) + TSD-002 (frontend).

Estado no fim da sessão: TSD-001 aprovada mas NÃO implementada (a pedido do usuário). TSD-002 aguardando aprovação.

Pendências: aprovar TSD-002; subir fundação no GitHub para handoff; implementar TSD-001 e TSD-002; questões abertas A-02, A-03/P-07, A-05/P-09, P-10; confirmar se `docs/licia-analisadora-product-discovery.md` está versionado.
