# Engineering Checkpoint - LicIA Analisadora

---
title: Engineering Checkpoint - LicIA Analisadora
type: checkpoint
status: ativo
created: 31/08/2026 // Pablo Grisi
updated: 31/08/2026 // Pablo Grisi
---

## 1. Estado atual

Fundação em andamento. O roteiro de `.ai-dev/bootstrap.md` foi percorrido: PRD revisado e aprovado, SDD aprovado, `questoes-abertas.md`, glossário, `quality-gates.md` e `context-map.md` preenchidos, decision record 001 (NestJS) registrado. **Nenhuma feature de produto implementada e nenhum código escrito ainda.**

O projeto foi organizado em **duas frentes paralelas dentro de um monorepo**: `backend/` (NestJS, Pablo) e `frontend/` (Next.js, Vinicius), com método e docs compartilhados na raiz. Cada frente roda seu próprio ciclo de seis papéis. Duas TSDs de fundação, independentes:

- **TSD-001** (`backend/`) — aprovada; **não implementada** (decisão do usuário nesta sessão).
- **TSD-002** (`frontend/`) — aprovada; **não implementada**. Implementação por Vinicius numa branch a partir da `main`.

## 2. Spec ativa

- Specs candidatas (fundação, independentes, ambas aprovadas e não iniciadas): `docs/engineering/specs/001-fundacao-tecnica.tsd.md` (backend) e `docs/engineering/specs/002-fundacao-frontend.tsd.md` (frontend).
- Última spec concluída: nenhuma

## 3. Specs concluídas

| Spec | Resultado | Validação |
|---|---|---|
| — | — | — |

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

## 5. Pendências

- [ ] Implementar a TSD-001 (backend) — aprovada; o usuário pediu para não implementar nesta sessão de fundação.
- [ ] Implementar a TSD-002 (frontend) — aprovada; por Vinicius, em branch a partir da `main`.
- [x] Subir a fundação no GitHub para o handoff com o Vinicius — feito ao final desta sessão.
- [ ] Questões abertas de arquitetura que afetam as primeiras features: A-02 (contrato da IA), A-03/P-07 (base de requisitos), A-05/P-09 (armazenamento do PDF). Ver `docs/product/questoes-abertas.md`.
- [ ] Confirmar se `docs/licia-analisadora-product-discovery.md` está versionado neste repo (citado no PRD).

## 6. Riscos / pontos de atenção

- Contrato da capacidade de análise por IA ainda não existe; MVP avança com `StubAdapter`. Risco de divergência stub × real — mitigar com teste de contrato.
- Protótipo (`Prototipo Licia Analisadora/`) diverge do PRD em pontos registrados (`context-map.md`, seção "Contexto visual"): 4 vs. 3 status, semântica da área Técnica, "responsável" por linha. PRD/SDD vencem.
- Ausência de identidade no MVP não pode virar dívida difícil: manter `AnalistaAtualProvider` isolado e `analista_id` em todas as queries desde a TSD-001.
- Frontend real é uma aplicação Next.js separada; este repo é o backend.

## 7. Próximo passo recomendado

1. Aprovar a TSD-002.
2. Commit da fundação e push para o GitHub (branch `main`), para o Vinicius partir dela.
3. Pablo: implementar a TSD-001 em `backend/`. Vinicius: branch a partir de `main`, implementar a TSD-002 em `frontend/`.
4. Após as duas fundações mergeadas e fechadas, a primeira feature real do roadmap entra no ciclo pelo Agente PM de cada frente (backend começa por RF-006; frontend por RF-002).

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
