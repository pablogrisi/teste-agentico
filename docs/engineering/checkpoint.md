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

- **TSD-001** (`backend/`) — implementada na branch `backend/tsd-001-fundacao-tecnica`. Crítico aprovou. Pendente: `test:e2e` com Postgres.
- **RF-006 / TSD-003** (base fixa de requisitos, backend) — ciclo completo na mesma branch: PM → Engenheiro → Dev → Testes → Crítico aprovou. Pendente: testes de integração com Postgres. Roadmap: `em validação`.
- **TSD-002** (`frontend/`) — aprovada; **não implementada**. Por Vinicius, em branch a partir da `main`.
- **Nenhum merge na `main`** até a bateria com Postgres rodar verde.

## 2. Spec ativa

- Spec ativa: `docs/engineering/specs/001-fundacao-tecnica.tsd.md` (backend) — implementada na branch `backend/tsd-001-fundacao-tecnica`, em validação.
- Spec candidata aguardando implementação: `docs/engineering/specs/002-fundacao-frontend.tsd.md` (frontend).
- Última spec concluída: nenhuma

## 3. Specs concluídas

| Spec | Resultado | Validação |
|---|---|---|
| — | — | — |

## 3.1 Specs em validação

| Spec | Branch | Resultado da validação mecânica |
|---|---|---|
| TSD-001 — Fundação técnica do backend | `backend/tsd-001-fundacao-tecnica` | `npm run lint` ✅ · `npm run typecheck` ✅ · `npx prisma validate` ✅ · `npm run test` ✅ (8 testes, 4 suites) · `npm run build` ✅ · `npm run test:contract` ✅ (vazio) · `npm run test:e2e` ⛔ não executável nesta máquina (sem Docker/Postgres) — `PrismaClientInitializationError: Can't reach database server at localhost:5432`. Pendência registrada, não é defeito de código (TSD-001 §9). |
| TSD-003 — Base fixa de requisitos (RF-006, backend) | `backend/tsd-001-fundacao-tecnica` | `npm run lint` ✅ · `npm run typecheck` ✅ · `npx prisma validate` ✅ · `npm run test` ✅ (**23** testes, 8 suites) · `npm run build` ✅ · `npm run test:e2e` ⛔ (health e2e + `requisitos-importador.integration-spec`) — mesmo bloqueio de Postgres. Testes de integração escritos, não executados. |

**Crítico — TSD-001 (31/08/2026):** aprovado, com **uma pendência carregada**. Escopo cumprido, sem vazamento de escopo de produto. Único critério sem evidência: `test:e2e` verde contra Postgres real, antes do merge na `main`. Observações menores: leve duplicação de defaults entre `configuration.ts` e `env.validation.ts`; `STATUS_REQUISITO` ainda não usado (seam para RF-007).

**Crítico — RF-006 / TSD-003 (31/08/2026):** aprovado, mesma pendência de ambiente. Todos os critérios de aceite da TSD-003 atendidos no código e nos testes unitários (23/23): modelo + migration, `area` como string com allowlist (não enum), importador de CSV com imutabilidade de `titulo`/`descricao`/`norma*`/`obrigatorio` e abort transacional, `RequisitosService.listarAtivos()`, CSV placeholder (12 itens), sem endpoint HTTP, sem outra tabela. Os testes de integração (idempotência, rollback, ordenação) exigem Postgres e ficam pendentes de execução. Observações menores: `package.json#prisma` gera aviso de deprecação (Prisma 7 pedirá `prisma.config.ts` — follow-up); `ImportadorRequisitosService` ainda sem consumidor (seam intencional; o seed usa a função pura); `test/jest-e2e.json` passou a cobrir `test/integration/` (correção alinhada ao `quality-gates.md`).

**Documentador (31/08/2026):** TSD-001 e RF-006/TSD-003 implementados na branch `backend/tsd-001-fundacao-tecnica`, aprovados pelo Crítico, **pendentes da bateria `test:e2e` contra Postgres**. Nenhum merge na `main` até isso rodar verde. SDD §8 atualizado (linha `requisito`). `questoes-abertas.md`: A-03 fechada, P-04/P-07 anotadas com a direção do ciclo.

## 4. Decisões relevantes

| Decisão | Onde está documentada |
|---|---|
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

## 5. Pendências

- [ ] TSD-001: rodar `npm run test:e2e` numa máquina com Docker/Postgres e registrar o resultado (gap conhecido — TSD-001 §9).
- [ ] TSD-001: revisão do Crítico contra a TSD; se aprovada, Documentador fecha o ciclo e o merge de `backend/tsd-001-fundacao-tecnica` na `main`.
- [ ] Implementar a TSD-002 (frontend) — aprovada; por Vinicius, em branch a partir da `main`.
- [x] Subir a fundação (bootstrap) no GitHub para o handoff com o Vinicius — feito (commit na `main`).
- [ ] Questões abertas de arquitetura que afetam as primeiras features: A-02 (contrato da IA), A-03/P-07 (base de requisitos), A-05/P-09 (armazenamento do PDF). Ver `docs/product/questoes-abertas.md`.
- [ ] Confirmar se `docs/licia-analisadora-product-discovery.md` está versionado neste repo (citado no PRD).

## 6. Riscos / pontos de atenção

- Contrato da capacidade de análise por IA ainda não existe; MVP avança com `StubAdapter`. Risco de divergência stub × real — mitigar com teste de contrato.
- Protótipo (`Prototipo Licia Analisadora/`) diverge do PRD em pontos registrados (`context-map.md`, seção "Contexto visual"): 4 vs. 3 status, semântica da área Técnica, "responsável" por linha. PRD/SDD vencem.
- Ausência de identidade no MVP não pode virar dívida difícil: manter `AnalistaAtualProvider` isolado e `analista_id` em todas as queries desde a TSD-001.
- Frontend real é uma aplicação Next.js separada; este repo é o backend.

## 7. Próximo passo recomendado

1. **Rodar a bateria com Postgres** numa máquina com Docker: `cd backend && docker compose up -d db && npm ci && npm run prisma:migrate && npm run seed && npm run test:e2e`. Cobre a pendência da TSD-001 (health e2e) **e** da TSD-003 (integração do importador). Registrar o resultado no checkpoint/audit.
2. Com a bateria verde: fechar formalmente TSD-001 e RF-006 (Documentador marca RF-006 como `implementada` no roadmap) e mergear `backend/tsd-001-fundacao-tecnica` na `main`.
3. **Próximo ciclo backend:** RF-001 + RF-004 + RF-018 (criar análise com PDF persistido) — Agente PM abre.
4. Vinicius: branch a partir de `main`, implementar a TSD-002 em `frontend/`.

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
