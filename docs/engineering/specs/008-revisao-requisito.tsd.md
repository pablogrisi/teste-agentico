# TSD — Revisão de um requisito (RF-008 + RF-011 + RF-017, backend)

---
title: TSD - Revisão de requisito (RF-008/011/017, backend)
type: tsd
status: draft
created: 31/08/2026 // Pablo Grisi (Engenheiro)
updated: 31/08/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/007-abrir-analise.tsd.md
---

## 1. Resumo

`PATCH /analises/:id/requisitos/:requisitoId` para o analista definir o parecer final de um requisito (RF-008), marcá-lo como verificado (RF-011) e registrar o comentário exigido quando o parecer diverge da IA (RF-017 / P-03 = R-06). Sem alteração de modelo.

**User Story de origem:** `docs/product/roadmap.md`, feature RF-008 (recorte backend, ciclo agrupado RF-008 + RF-011 + RF-017), User Story e decisões aprovadas em 31/08/2026.

## 2. Objetivo técnico

- `PATCH /analises/:id/requisitos/:requisitoId` com `{ statusFinal?, verificado?, comentario? }`.
- Regras: `statusFinal` ∈ 3 valores; alterar `statusFinal` ⇒ `verificado = true`; `verificado` alterna livre; comentário obrigatório sse o estado resultante tiver `statusFinal ≠ statusSugeridoIa` e sem comentário.
- `409` se a análise não está `PRONTA_PARA_REVISAO`; `404` se análise/avaliação não existir para o analista.
- Resposta `{ item, resumo }`.
- Testes unit (regras puras) + integração.

## 3. Escopo

### Incluído

- **`src/analises/analise-detalhe.ts`** (refactor): exportar `toItem(avaliacaoComRequisito): AvaliacaoItem` e extrair `calcularResumo(avaliacoes): ResumoAnalise` (reusado por `montarAnaliseDetalhe` e pelo PATCH).
- **`src/analises/revisao-requisito.ts`** (novo):
  - `PatchRevisaoBody = { statusFinal?: string; verificado?: boolean; comentario?: string | null }`.
  - `validarERuolverPatch(avaliacaoAtual, body): { erros: string[]; dados: Prisma.AvaliacaoRequisitoUpdateInput }`:
    - Corpo vazio (nenhum dos 3 campos) → erro "informe ao menos um campo".
    - `statusFinal` presente e fora de `STATUS_REQUISITO` → erro.
    - `comentario`: `undefined` = não mexe; string → `trim()`; `''` ou só espaços → `null` (limpar).
    - **`verificado` resolvido:** se `statusFinal` presente e diferente do atual → `true` (RF-011); senão `body.verificado ?? atual.verificado`.
    - **`statusFinal` resolvido:** `body.statusFinal ?? atual.statusFinal`.
    - **`comentario` resolvido:** se `comentario` no body → o valor tratado; senão `atual.comentario`.
    - **Regra P-03 (R-06):** se `statusFinalResolvido !== atual.statusSugeridoIa` **e** `comentarioResolvido` é `null`/vazio → erro "comentário obrigatório quando o parecer difere da sugestão da IA".
    - Sem erros → `dados` só com os campos que realmente mudam.
- **`AnalisesService.revisarRequisito(analiseId, requisitoId, body): Promise<{ item; resumo }>`:**
  - `buscarPorId(analiseId)` (`404` + escopo).
  - `analise.status !== 'PRONTA_PARA_REVISAO'` → `ConflictException` (`409`).
  - `avaliacaoRequisito.findUnique({ where: { analiseId_requisitoId: { analiseId, requisitoId } }, include: { requisito: true } })`; `null` → `NotFoundException` (`404`).
  - `validarERuolverPatch` → erros → `UnprocessableEntityException` (`422`) sem gravar.
  - `avaliacaoRequisito.update({ where: { id }, data, include: { requisito: true } })`.
  - `avaliacaoRequisito.findMany({ where: { analiseId }, include: { requisito: true } })` → `calcularResumo`.
  - `return { item: toItem(atualizada), resumo }`.
- **`AnalisesController`** `@Patch(':id/requisitos/:requisitoId')` → `@Param` + `@Body()` → `revisarRequisito`.
- **Testes** (ver §7).

### Fora do escopo

- Conclusão da análise / trava por obrigatórios (RF-012).
- Edição em lote de vários requisitos numa chamada.
- Histórico de alterações do parecer (auditoria expandida — P-02).
- Reabrir uma análise `CONCLUIDA` para editar (fora do MVP).
- Frente frontend (modal de parecer, campo de comentário, controle de verificado).

## 4. Contexto consultado

- `docs/product/prd.md` — RF-008, RF-011, RF-012 (`obrigatorio`), RF-017, §8 (regras), §9 (erro de persistência)
- `docs/architecture/sdd.md` — §7 ("Revisar requisito"), §8 (`avaliacao_requisito`)
- `docs/product/questoes-abertas.md` — R-06 (P-03)
- `docs/product/glossario.md` — "Status do requisito", "Verificado", "Parecer"
- `docs/engineering/specs/006-*` (AvaliacaoRequisito), `007-*` (`AvaliacaoItem`, `montarAnaliseDetalhe`, resumo)

## 5. Impacto esperado

- **Produto:** o analista consegue consolidar sua revisão requisito a requisito.
- **Arquitetura:** primeiro `PATCH` do projeto; reuso de `toItem`/`calcularResumo` (contrato de leitura e escrita usam a mesma forma).
- **Implementação:** refactor leve de `analise-detalhe.ts`; `revisao-requisito.ts` novo; método no serviço + rota.
- **Testes:** unit das regras (P-03, RF-011, coerção); integração ponta a ponta.
- **Documentação:** SDD §7 ("Revisar requisito" — contrato); `questoes-abertas.md` P-03 → R-06; checkpoint, audit, roadmap.

## 6. Plano de implementação

1. Refactor `analise-detalhe.ts`: exportar `toItem`, extrair `calcularResumo`.
2. `revisao-requisito.ts` + testes unit.
3. `AnalisesService.revisarRequisito`.
4. Controller: `PATCH :id/requisitos/:requisitoId`.
5. Integração `test/integration/revisao-requisito.integration-spec.ts`.
6. `npm run ci` + `npm run test:e2e`.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `validarERuolverPatch`: corpo vazio → erro; `statusFinal` inválido → erro; alterar `statusFinal` marca `verificado = true`; `verificado` alterna quando não há mudança de status; **P-03**: `statusFinal` diferente do sugerido sem comentário → erro; com comentário (novo ou já existente) → ok; limpar comentário de avaliação divergente → erro; `dados` só com campos que mudam. `calcularResumo` continua correto após o refactor (reusa os testes de `montarAnaliseDetalhe`). |
| Integração | Sim | App real + Postgres embutido + `StubAdapter` (`PROCESSAMENTO_AUTO=false`). Criar → processar (stub sugere `NAO_SE_APLICA`) → `PATCH` mudando `statusFinal` para `NAO_CONFORME` sem comentário → `422`; com comentário → `200`, avaliação com `statusFinal=NAO_CONFORME`, `verificado=true`, e `resumo` recalculado; `PATCH` só com `verificado=true` (sem mudar status, que segue = sugerido) → `200` sem exigir comentário; `PATCH` num requisito inexistente → `404`; `PATCH` numa análise `PENDENTE` → `409`; `statusFinal` inválido → `422`. |
| Contrato | Não | Sem serviço externo. |
| Smoke/validação manual contra dependência externa real | Não | — |

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## 8. Critérios de aceite

- [ ] `PATCH /analises/:id/requisitos/:requisitoId` com `statusFinal` válido diferente da sugestão + `comentario` → `200`; a avaliação fica com o novo `statusFinal`, `verificado = true` e o comentário; a resposta traz `{ item, resumo }` com o `resumo` recalculado.
- [ ] Mesmo PATCH **sem** `comentario` (e sem comentário já armazenado) → `422`, nada gravado.
- [ ] `PATCH` só com `verificado` (status resultante = sugestão) → `200`, sem exigir comentário.
- [ ] `PATCH` com `verificado = false` numa avaliação verificada (sem mudar status) → `200`, `verificado` volta a `false`.
- [ ] `statusFinal` fora dos 3 valores → `422`.
- [ ] Corpo sem nenhum dos 3 campos → `422`.
- [ ] Análise não `PRONTA_PARA_REVISAO` → `409`; análise/requisito inexistente para o analista → `404`.
- [ ] `item` na resposta tem o mesmo formato do item de `GET /analises/:id`.
- [ ] `npm run ci` e `npm run test:e2e` verdes.

## 9. Riscos e decisões abertas

- **Invariante P-03**: uma avaliação divergente da IA não pode ter o comentário apagado — é intencional (R-06). Se no futuro o analista precisar "desfazer" voltando ao status sugerido, ele muda o `statusFinal` de volta e aí pode limpar o comentário.
- **Concorrência**: dois PATCH simultâneos no mesmo requisito — o último grava por cima (sem `updatedAt` check). Aceitável no MVP (um analista, uso baixo).
- **`resumo` recalculado a cada PATCH** faz um `findMany` da análise inteira. Com ~300 avaliações é barato; se pesar, calcular incrementalmente.
- Não altera decisão do SDD além de detalhar o contrato de "Revisar requisito" (§7).

## 10. Referências visuais

Não se aplica — slice de backend.

## 11. Rollback

Remover a rota `@Patch`, `AnalisesService.revisarRequisito`, `revisao-requisito.ts` e o spec de integração; reverter o `analise-detalhe.ts` para as funções privadas anteriores. Nada além do controller depende disso.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (008), a TSD-007 e o checkpoint.
Implemente só o escopo: PATCH /analises/:id/requisitos/:requisitoId com statusFinal/verificado/
comentario. Alterar statusFinal ⇒ verificado=true. Comentário obrigatório sse o estado
resultante tiver statusFinal != statusSugeridoIa sem comentário (422). 409 se a análise não
está PRONTA_PARA_REVISAO; 404 se análise/requisito não existe pro analista. Resposta { item, resumo }.
NÃO implemente conclusão nem histórico. Rode npm run ci e npm run test:e2e; registre a saída.
Atualize checkpoint e audit.
```
