# Engineering Checkpoint - LicIA Analisadora

---
title: Engineering Checkpoint - LicIA Analisadora
type: checkpoint
status: ativo
created: 31/08/2026 // Pablo Grisi
updated: 31/08/2026 // Pablo Grisi
---

## 1. Estado atual

Fundação percorrida (`.ai-dev/bootstrap.md`): PRD e SDD aprovados, `questoes-abertas.md`, glossário, `quality-gates.md` e `context-map.md` preenchidos, decision record 001 (NestJS) registrado.

Projeto organizado em **duas frentes paralelas num monorepo**: `backend/` (NestJS, Pablo) e `frontend/` (Next.js, Vinicius), método e docs compartilhados na raiz. Cada frente roda seu próprio ciclo de seis papéis.

- **`main` `9dd6792`**: TSD-001 (fundação backend) + RF-006/TSD-003 (base de requisitos) + RF-001/004/018/TSD-004 (criar análise com PDF) integradas.
- **RF-002 / TSD-005** (listagem de análises, backend) — **ciclo aberto** na branch `backend/rf-002-listagem`. PM aguardando definição de P-06.
- **TSD-002** (`frontend/`) — aprovada; **não implementada**. Por Vinicius, em branch a partir da `main`.
- Infra de teste: `test:e2e` sobe/derruba um PostgreSQL embutido (`embedded-postgres`) — sem Docker.
- Integração com o serviço de IA real (`HttpAdapter` da `AnaliseIaPort` + A-02) foi **adiada para o fim do MVP** por decisão do responsável (31/08/2026); até lá o `StubAdapter` sustenta os ciclos.
- **Modelo de branch:** uma branch curta por ciclo/TSD, merge na `main` quando o Documentador fecha.

## 2. Spec ativa

- Branch `backend/rf-002-listagem`: ciclo de RF-002 aberto pelo PM; User Story rascunhada, aguardando resposta de **P-06** (contrato de filtros/ordenação/paginação da listagem) antes do Engenheiro.
- Frontend: `docs/engineering/specs/002-fundacao-frontend.tsd.md` aguardando o Vinicius.

## 3. Specs concluídas

| Spec | Resultado | Validação |
|---|---|---|
| TSD-001 — Fundação técnica do backend | Projeto NestJS + Prisma + PostgreSQL em `backend/`; config com validação de boot; `/health`; 4 módulos de feature vazios; 3 portas (`AnaliseIaPort`, `ArmazenamentoPdfPort`, `AnalistaAtualProvider`) com adapter mínimo; PostgreSQL embutido no `test:e2e`. Sem código de produto. | `npm run ci` ✅ (lint, typecheck, prisma validate, test 23/23, build) · `npm run test:e2e` ✅ 5/5 · Crítico ✅ · mergeada `main` `13b111e` |
| TSD-003 — Base fixa de requisitos (RF-006, backend) | Modelo `Requisito` + migration; importador de CSV externo com imutabilidade de texto/`obrigatorio` e abort transacional; `RequisitosService.listarAtivos()`; seed placeholder (12 itens). Sem endpoint HTTP. | Unit 23/23 ✅ · integração `requisitos-importador` ✅ (idempotência, rollback, ordenação) · Crítico ✅ · mergeada `main` `13b111e` |
| TSD-004 — Criar análise com PDF persistido (RF-001/004/018, backend) | Modelo `Analise` + migration; `POST /analises` (multipart) com validação de PDF (mimetype + `%PDF-` + limite 25 MB + recusa `/Encrypt`); `GET /analises/:id` e `/:id/pdf`; `status` string+allowlist (só `PENDENTE`); 422 sem criar linha, 502 se falha ao gravar PDF. Sem listagem/worker/avaliação. | `npm run ci` ✅ (38 unit) · `npm run test:e2e` ✅ 9/9 (+ integração `analises`: criar→buscar→baixar PDF, 422, 404) · build ✅ · Crítico ✅ · mergeada `main` `9dd6792` |

### 3.1 Notas de revisão dos ciclos fechados

**Crítico — TSD-001 (31/08/2026):** **aprovado**. Escopo cumprido, sem vazamento de escopo de produto. Toda a bateria passa, incluindo `test:e2e` (a pendência de ambiente foi resolvida com PostgreSQL embutido). Observações menores não bloqueantes: leve duplicação de defaults entre `configuration.ts` e `env.validation.ts`; `STATUS_REQUISITO` ainda não usado (seam para RF-007); `package.json#prisma` gera aviso de deprecação (migrar para `prisma.config.ts` em algum momento antes do Prisma 7).

**Crítico — RF-006 / TSD-003 (31/08/2026):** **aprovado**. Todos os critérios de aceite da TSD-003 atendidos, com evidência: modelo + migration, `area` como string com allowlist (não enum), importador de CSV com imutabilidade de `titulo`/`descricao`/`norma*`/`obrigatorio` e abort transacional, `RequisitosService.listarAtivos()`, CSV placeholder (12 itens), sem endpoint HTTP, sem outra tabela. Testes de integração (idempotência, rollback transacional, ordenação) **executados e verdes** contra Postgres embutido. Observações menores: `package.json#prisma` gera aviso de deprecação (follow-up: `prisma.config.ts`); `ImportadorRequisitosService` ainda sem consumidor (seam intencional; o seed usa a função pura); `test/jest-e2e.json` passou a cobrir `test/integration/` (correção alinhada ao `quality-gates.md`); `migration.sql` teve uma linha de warning do Prisma removida (tinha vazado pelo redirect de stdout na autoria).

**Crítico — RF-001/004/018 / TSD-004 (31/08/2026):** **aprovado**. Todos os critérios da TSD-004 com evidência (38 unit + 9 e2e): modelo + migration aplicada, validação de PDF (mimetype/magic bytes/limite/`/Encrypt`), 422 sem criar linha, 502 sem criar linha, `GET`/`GET /pdf` com 404, `status` string+allowlist. Refinação registrada no SDD §7: `POST /analises` responde **201** (não 202 — nada assíncrono na requisição). Observações menores: `STATUS_ANALISE`/`isStatusAnalise` são seam para RF-005 (o `create` grava o literal `'PENDENTE'`); heurística `/Encrypt` e teto de upload (60 MB no multer, 25 MB efetivo na validação) documentados; PDF pode ficar órfão se o `create` falhar após `salvar` (aceito no MVP — `ArmazenamentoPdfPort` não tem `delete`).

**Documentador (31/08/2026):** ciclos de TSD-001 e RF-006/TSD-003 **fechados e mergeados** (`main` `13b111e`). Ciclo de TSD-004 **fechado, aguardando merge** (branch `backend/rf-001-criar-analise`). SDD §7/§8 atualizado (`analise` implementada, 201). Roadmap RF-001/004/018 → `implementada` (backend). `questoes-abertas.md`: nova P-11 (máscara/validação de formato do NUP). Detalhe em `.ai-dev/audit.md`.

## 4. Decisões relevantes

| Decisão | Onde está documentada |
|---|---|
| Histórico de perguntas ao responsável + respostas | `docs/perguntas-e-respostas.md` (anexar cada nova rodada) |
| Nome do projeto: LicIA Analisadora | `START_HERE.md` e método (`{{NOME_DO_PROJETO}}` substituído) |
| PRD aprovado como baseline do MVP; 12 questões movidas para índice próprio | `docs/product/prd.md`, `docs/product/questoes-abertas.md` |
| Relatório PDF final (RF-016) e persistência do PDF de entrada (RF-018) entram no MVP | `questoes-abertas.md` R-01, R-02 |
| MVP sem autenticação e sem identidade: analista único e fixo; RF-003 e "sem permissão" pós-MVP | `questoes-abertas.md` R-03, P-10; SDD §2, §9 |
| Stack: Node.js + TypeScript + NestJS + PostgreSQL + Prisma; 1 contêiner + Postgres gerenciado | SDD §2; `docs/engineering/decisions/001-framework-backend-nestjs.md` |
| Processamento assíncrono em processo, estado no banco (sem Redis no MVP) | SDD §4, §9 |
| IA e (futura) identidade como portas com adapter stub + real | SDD §3, §6, §8 |
| Relatório PDF gerado sob demanda, não persistido | SDD §9; `questoes-abertas.md` A-04 |
| Monorepo com duas frentes: `backend/` (Pablo) e `frontend/` (Vinicius), em branches paralelas, mergeadas depois | `docs/product/roadmap.md`; SDD §2; esta sessão |
| Fundação fatiada em TSD-001 (backend) e TSD-002 (frontend), independentes | `docs/engineering/specs/001-*`, `002-*` |
| Frontend: Next.js + Vitest + RTL; camada de dados atrás de seam, fixtures até haver contrato por RF | TSD-002 |
| RF-006: base de requisitos por importador de arquivo externo (CSV), não lista em código | `roadmap.md` RF-006; TSD-003 |
| RF-006: `area` é campo livre com allowlist (não enum); `norma_referencia` estruturada; sem coluna de versão (imutabilidade + `ativo=false`); `titulo`/`descricao`/`norma*`/`obrigatorio` imutáveis, `ordem`/`ativo` mutáveis | TSD-003; `questoes-abertas.md` A-03 |
| Testes de integração/e2e rodam com PostgreSQL embutido (`embedded-postgres`), sem Docker; `E2E_EXTERNAL_DB` para banco externo na CI | `backend/test/embedded-postgres.globalSetup.ts`; `quality-gates.md` |

## 5. Pendências

- [x] `test:e2e` verde — PostgreSQL embutido, sem Docker.
- [x] TSD-001 + RF-006/TSD-003 mergeadas na `main` (`13b111e`).
- [x] TSD-004 (RF-001/004/018) mergeada na `main` (`9dd6792`).
- [ ] **RF-002 / TSD-005 (listagem)** — em andamento; PM precisa de P-06 (filtros/ordenação/paginação) para o Engenheiro seguir.
- [ ] Implementar a TSD-002 (frontend) — aprovada; por Vinicius, em branch a partir da `main`.
- [ ] Integração com o serviço de IA real (`HttpAdapter` + A-02) — **adiada para o fim do MVP** por decisão do responsável.
- [ ] Follow-up: migrar `package.json#prisma` para `prisma.config.ts` antes do Prisma 7 (só um aviso hoje).
- [ ] Questões abertas: P-06 (listagem — RF-002), P-07 (lista real de requisitos), P-03 (quando exigir comentário — RF-017), A-05/P-09 (armazenamento do PDF), A-02 (contrato da IA — para o fim). Ver `docs/product/questoes-abertas.md`.
- [ ] Confirmar se `docs/licia-analisadora-product-discovery.md` está versionado neste repo (citado no PRD).
- [ ] Limpar branches já mergeadas (`backend/tsd-001-fundacao-tecnica`, `backend/rf-001-criar-analise`) — local + remota.

## 6. Riscos / pontos de atenção

- Contrato da capacidade de análise por IA ainda não existe; MVP avança com `StubAdapter`; a integração real foi adiada para o fim do MVP. Risco de divergência stub × real — mitigar com teste de contrato quando o `HttpAdapter` for feito.
- Protótipo (`Prototipo Licia Analisadora/`) diverge do PRD em pontos registrados (`context-map.md`, seção "Contexto visual"): 4 vs. 3 status, semântica da área Técnica, "responsável" por linha. PRD/SDD vencem.
- Ausência de identidade no MVP não pode virar dívida difícil: manter `AnalistaAtualProvider` isolado e `analista_id` em todas as queries desde a TSD-001.
- Frontend real é uma aplicação Next.js separada; este repo é o backend.

## 7. Próximo passo recomendado

1. **Backend (Pablo):** ciclo RF-002 aberto na branch `backend/rf-002-listagem`. Responder P-06 (filtros/ordenação/paginação da listagem) → Engenheiro escreve a TSD-005 → Dev → Testes → Crítico → Documentador → merge.
2. **Frontend (Vinicius):** branch `frontend/tsd-002-fundacao` a partir do `main`; implementar a TSD-002 (bootstrap Next.js, rotas-casca, tema do protótipo, camada de dados com fixtures). Inspecionar a referência visual e preencher a §10 da TSD antes de ativar.
3. Cada ciclo mergeia no `main` quando o Documentador fecha.
4. Faltam ~6 ciclos de backend depois de RF-002 (ver tabela do roadmap): RF-005+RF-007, RF-009, RF-008+RF-011+RF-017, RF-014, RF-012+RF-013+RF-015, RF-016 — mais a integração da IA real no fim.

## 8. Prompt de retomada

```text
Leia START_HERE.md, .ai-dev/context-map.md e este checkpoint.
Identifique a spec ativa; se não houver, identifique se há uma spec candidata aguardando ativação.
Resuma objetivo, escopo, critérios de aceite e validações obrigatórias da spec ativa.
Identifique o menor próximo passo seguro.
Identifique riscos ou questões abertas antes de implementar.
Não altere arquivos.
Não implemente nada ainda.
Não atualize este checkpoint ainda.
Espere instrução explícita de construção/implementação.
```

<!-- Ao evoluir o projeto, mantenha este checkpoint enxuto e o histórico detalhado em .ai-dev/audit.md, em vez de acumular tudo aqui. -->
