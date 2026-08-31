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

- **TSD-001** (`backend/`) — implementada na branch `backend/tsd-001-fundacao-tecnica`. **Toda a bateria passa, incluindo `test:e2e`** (PostgreSQL embutido, sem Docker). Crítico aprovou. Pronta para merge na `main` após sign-off humano.
- **RF-006 / TSD-003** (base fixa de requisitos, backend) — ciclo completo na mesma branch: PM → Engenheiro → Dev → Testes → Crítico aprovou. Testes de integração (importador) **passando** contra o Postgres embutido. Pronta para fechar como `implementada`.
- **TSD-002** (`frontend/`) — aprovada; **não implementada**. Por Vinicius, em branch a partir da `main`.
- Infra de teste: `test:e2e` sobe/derruba um PostgreSQL embutido (`embedded-postgres`) — sem dependência de Docker para a bateria de testes.

## 2. Spec ativa

- Branch `backend/tsd-001-fundacao-tecnica`: TSD-001 (fundação) e TSD-003 (RF-006) implementadas e com a bateria completa verde (`npm run ci` + `npm run test:e2e`, sem Docker). Aguardando sign-off humano + merge na `main`.
- Spec candidata aguardando implementação: `docs/engineering/specs/002-fundacao-frontend.tsd.md` (frontend, por Vinicius).
- Última spec concluída: nenhuma (fechamento formal de TSD-001/TSD-003 depende do merge).

## 3. Specs concluídas

| Spec | Resultado | Validação |
|---|---|---|
| — | — | — |

## 3.1 Specs em validação

| Spec | Branch | Resultado da validação mecânica (31/08/2026, Windows, sem Docker) |
|---|---|---|
| TSD-001 — Fundação técnica do backend | `backend/tsd-001-fundacao-tecnica` | `npm run ci` ✅ (lint · typecheck · prisma validate · **test 23/23** · build) · `npm run test:contract` ✅ (vazio) · **`npm run test:e2e` ✅ 5/5** (health e2e + integração), PostgreSQL embutido, sem processos/tmp órfãos. |
| TSD-003 — Base fixa de requisitos (RF-006, backend) | `backend/tsd-001-fundacao-tecnica` | Coberto pela mesma bateria acima. `requisitos-importador.integration-spec` ✅ (idempotência, rollback transacional em conflito de campo imutável, ordenação de `listarAtivos`). |

**Crítico — TSD-001 (31/08/2026):** **aprovado**. Escopo cumprido, sem vazamento de escopo de produto. Toda a bateria passa, incluindo `test:e2e` (a pendência de ambiente foi resolvida com PostgreSQL embutido). Observações menores não bloqueantes: leve duplicação de defaults entre `configuration.ts` e `env.validation.ts`; `STATUS_REQUISITO` ainda não usado (seam para RF-007); `package.json#prisma` gera aviso de deprecação (migrar para `prisma.config.ts` em algum momento antes do Prisma 7).

**Crítico — RF-006 / TSD-003 (31/08/2026):** **aprovado**. Todos os critérios de aceite da TSD-003 atendidos, com evidência: modelo + migration, `area` como string com allowlist (não enum), importador de CSV com imutabilidade de `titulo`/`descricao`/`norma*`/`obrigatorio` e abort transacional, `RequisitosService.listarAtivos()`, CSV placeholder (12 itens), sem endpoint HTTP, sem outra tabela. Testes de integração (idempotência, rollback transacional, ordenação) **executados e verdes** contra Postgres embutido. Observações menores: `package.json#prisma` gera aviso de deprecação (follow-up: `prisma.config.ts`); `ImportadorRequisitosService` ainda sem consumidor (seam intencional; o seed usa a função pura); `test/jest-e2e.json` passou a cobrir `test/integration/` (correção alinhada ao `quality-gates.md`); `migration.sql` teve uma linha de warning do Prisma removida (tinha vazado pelo redirect de stdout na autoria).

**Documentador (31/08/2026):** TSD-001 e RF-006/TSD-003 implementados e **totalmente validados** (bateria completa verde, sem Docker) na branch `backend/tsd-001-fundacao-tecnica`, aprovados pelo Crítico. Falta só o sign-off humano e o merge na `main`. SDD §8 atualizado (linha `requisito`); `quality-gates.md`/`context-map.md`/`backend/README.md` atualizados (Postgres embutido no `test:e2e`); `questoes-abertas.md` A-03 fechada.

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
| Testes de integração/e2e rodam com PostgreSQL embutido (`embedded-postgres`), sem Docker; `E2E_EXTERNAL_DB` para banco externo na CI | `backend/test/embedded-postgres.globalSetup.ts`; `quality-gates.md` |

## 5. Pendências

- [x] `test:e2e` verde (TSD-001 health + TSD-003 integração) — resolvido com PostgreSQL embutido, sem Docker.
- [ ] Sign-off humano de TSD-001 + RF-006 e **merge de `backend/tsd-001-fundacao-tecnica` na `main`**.
- [ ] Push da branch de backend para o GitHub (quando o usuário autorizar).
- [ ] Implementar a TSD-002 (frontend) — aprovada; por Vinicius, em branch a partir da `main`.
- [ ] Follow-up: migrar `package.json#prisma` para `prisma.config.ts` antes do Prisma 7 (só um aviso hoje).
- [ ] Questões abertas de arquitetura que afetam as próximas features: A-02 (contrato da IA), P-07 (lista real de requisitos), A-05/P-09 (armazenamento do PDF). Ver `docs/product/questoes-abertas.md`.
- [ ] Confirmar se `docs/licia-analisadora-product-discovery.md` está versionado neste repo (citado no PRD).

## 6. Riscos / pontos de atenção

- Contrato da capacidade de análise por IA ainda não existe; MVP avança com `StubAdapter`. Risco de divergência stub × real — mitigar com teste de contrato.
- Protótipo (`Prototipo Licia Analisadora/`) diverge do PRD em pontos registrados (`context-map.md`, seção "Contexto visual"): 4 vs. 3 status, semântica da área Técnica, "responsável" por linha. PRD/SDD vencem.
- Ausência de identidade no MVP não pode virar dívida difícil: manter `AnalistaAtualProvider` isolado e `analista_id` em todas as queries desde a TSD-001.
- Frontend real é uma aplicação Next.js separada; este repo é o backend.

## 7. Próximo passo recomendado

1. **Sign-off humano** de TSD-001 + RF-006 (bateria completa já verde: `npm run ci` + `npm run test:e2e`, sem Docker). Marcar RF-006 como `implementada` no roadmap.
2. Push da branch `backend/tsd-001-fundacao-tecnica` e merge na `main`.
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
