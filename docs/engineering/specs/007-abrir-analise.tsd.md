# TSD — Abrir análise: leitura das avaliações (RF-009, backend)

---
title: TSD - Abrir análise (RF-009, backend)
type: tsd
status: implementada em branch (backend/rf-009-abrir-analise) — Crítico aprovou, aguardando merge
created: 31/08/2026 // Pablo Grisi (Engenheiro)
updated: 31/08/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/006-processamento-analise.tsd.md
---

## 1. Resumo

Enriquecer `GET /analises/:id` para devolver, além dos campos atuais, as avaliações da análise (avaliação + dados do requisito) **agrupadas por área** e **ordenadas priorizando não conformes**, mais um **resumo de contagens**. Cobre o recorte backend de RF-009. Sem alteração de modelo, sem edição de parecer.

**User Story de origem:** `docs/product/roadmap.md`, feature RF-009 (recorte backend), User Story e decisões aprovadas em 31/08/2026.

## 2. Objetivo técnico

- `AnalisesService.abrir(id)` → `AnaliseDetalhe` (campos da análise + `resumo` + `avaliacoesPorArea`).
- Função pura `montarAnaliseDetalhe(analise, avaliacoes)` para a lógica de agrupamento/ordenação/resumo (testável sem banco).
- `GET /analises/:id` no controller passa a devolver o `AnaliseDetalhe`.
- Testes unit (montagem) + integração (criar → processar → abrir).

## 3. Escopo

### Incluído

- **`montarAnaliseDetalhe(analise, avaliacoes)`** em `src/analises/analise-detalhe.ts`:
  - `avaliacoes`: linhas de `avaliacao_requisito` com o `requisito` incluído.
  - **Agrupamento:** por `requisito.area`; áreas em ordem alfabética (`asc`).
  - **Ordenação dentro da área:** `statusFinal === 'NAO_CONFORME'` primeiro (`false` < `true` → usar `naoConforme ? 0 : 1`), depois `requisito.ordem` asc.
  - **Item** (`AvaliacaoItem`): `id`, `requisitoId`, `codigo`, `area`, `titulo`, `descricao`, `obrigatorio`, `ordem`, `norma` (`{ lei, artigo, inciso, paragrafo, alinea }` — dos campos `norma*` do requisito), `statusSugeridoIa`, `statusFinal`, `verificado`, `comentario`, `paginaReferencia`.
  - **`resumo`:** `total`; `conforme` / `naoConforme` / `naoSeAplica` (contagem por `statusFinal`); `verificados` (`verificado === true`); `obrigatoriosPendentes` (`requisito.obrigatorio && !verificado`).
- **`AnalisesService.abrir(id: string): Promise<AnaliseDetalhe>`:**
  - `buscarPorId(id)` (reusa 404 + escopo por analista).
  - `prisma.avaliacaoRequisito.findMany({ where: { analiseId: id }, include: { requisito: true } })`.
  - `return montarAnaliseDetalhe(analise, avaliacoes)`.
- **`AnalisesController` `GET /analises/:id`** passa a chamar `analises.abrir(id)` e devolver o resultado (inclui os campos que já devolvia: `id`, `nup`, `objeto`, `status`, `motivoErro`, `iniciadaEm`, `concluidaEm`).
- **Testes** (ver §7).

### Fora do escopo

- Edição de `statusFinal` / `verificado` / `comentario` (RF-008, RF-011, RF-017).
- Filtros por status na leitura (a tela filtra client-side no MVP; se virar requisito de backend, é outro slice).
- Entrega do PDF por página / link clicável (RF-014) — `paginaReferencia` só vai no payload.
- Conclusão (RF-012).
- Qualquer alteração de modelo, do worker, ou de outros endpoints.
- Frente frontend (abas, destaque visual, filtros).

## 4. Contexto consultado

- `docs/product/prd.md` — RF-009, RF-010, §8 (Checklist/Técnica), §9 (nenhum não conforme)
- `docs/architecture/sdd.md` — §7 ("Abrir análise / listar", item 2), §8 (`avaliacao_requisito`)
- `docs/engineering/specs/006-processamento-analise.tsd.md` — `AvaliacaoRequisito`, status
- `docs/product/glossario.md` — "Avaliação de requisito", "Verificado", "Checklist", "Técnica"

## 5. Impacto esperado

- **Produto:** o frontend passa a ter tudo que a tela de análise precisa numa chamada.
- **Arquitetura:** nenhuma mudança estrutural; consolida o contrato de leitura da análise.
- **Implementação:** `src/analises/analise-detalhe.ts` (novo), `AnalisesService.abrir`, ajuste no controller.
- **Testes:** unit da função pura; integração ponta a ponta (com o worker manual).
- **Documentação:** SDD §7 (detalhar o payload de `GET /analises/:id`); checkpoint, audit, roadmap.

## 6. Plano de implementação

1. `analise-detalhe.ts`: tipos (`AvaliacaoItem`, `AreaComItens`, `ResumoAnalise`, `AnaliseDetalhe`) + `montarAnaliseDetalhe`.
2. Testes unit da função.
3. `AnalisesService.abrir`.
4. Controller: `GET /analises/:id` → `abrir`.
5. Integração `test/integration/abrir-analise.integration-spec.ts`.
6. `npm run ci` + `npm run test:e2e`.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `montarAnaliseDetalhe`: agrupa por área (alfabética); dentro da área, `NAO_CONFORME` antes, depois `ordem`; `resumo` com contagens corretas num mix de status/verificado/obrigatório; `norma` montada dos campos do requisito; lista vazia → `avaliacoesPorArea: []` e resumo zerado. |
| Integração | Sim | App real + Postgres embutido + `StubAdapter` (`PROCESSAMENTO_AUTO=false`). Semear requisitos em 2 áreas → criar via `POST /analises` → `processamento.processarUma` → `GET /analises/:id`: confere `avaliacoesPorArea` (2 grupos, ordem alfabética), ordenação interna, `resumo`. Análise `PENDENTE` (sem processar) → `avaliacoesPorArea: []`. `404` para id inexistente. |
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

- [ ] `GET /analises/:id` de uma análise `PRONTA_PARA_REVISAO` devolve `avaliacoesPorArea` (grupos por área, ordem alfabética) e `resumo`, além dos campos que já devolvia.
- [ ] Dentro de cada área, avaliações com `statusFinal = NAO_CONFORME` vêm antes das demais; empate resolvido por `requisito.ordem` asc.
- [ ] Cada item tem os campos listados em §3 (incl. `id` da avaliação e `norma` estruturada).
- [ ] `resumo`: `total`, `conforme`, `naoConforme`, `naoSeAplica` (por `statusFinal`), `verificados`, `obrigatoriosPendentes` — todos coerentes com os dados.
- [ ] Análise sem avaliações (`PENDENTE`/`PROCESSANDO`) → `avaliacoesPorArea: []`, `resumo` zerado; `ERRO_PROCESSAMENTO` → idem + `motivoErro` presente.
- [ ] `404` quando a análise não existe para o analista atual.
- [ ] Contrato anterior preservado (os testes de `GET /analises/:id` de RF-004 continuam passando).
- [ ] `npm run ci` e `npm run test:e2e` verdes, com saída real registrada.

## 9. Riscos e decisões abertas

- **Payload cresce** com a base real de requisitos (~300 avaliações por análise). Aceitável para o volume/uso do MVP; se ficar pesado, adicionar paginação/filtro por área num slice futuro.
- **Ordenação por `statusFinal`** (não `statusSugeridoIa`): a ordem muda conforme o analista edita o parecer (RF-008). É o comportamento pedido; o frontend deve reordenar ao receber a resposta atualizada do PATCH (fora deste slice).
- **`area` é string livre** (RF-006): o agrupamento por ordem alfabética funciona para qualquer valor; a ordem "Checklist antes de Técnica" é alfabética por acaso — se o produto quiser uma ordem de áreas explícita, vira um campo/decisão futura.

## 10. Referências visuais

Não se aplica — slice de backend.

## 11. Rollback

Reverter o `GET /analises/:id` para o objeto hand-built anterior; remover `analise-detalhe.ts`, `AnalisesService.abrir` e `test/integration/abrir-analise.integration-spec.ts`. Nada além do controller depende disso.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (007), a TSD-006 e o checkpoint.
Implemente só o escopo: montarAnaliseDetalhe (pura) + AnalisesService.abrir + GET /analises/:id
passando a devolver { ...campos atuais, resumo, avaliacoesPorArea }. Agrupar por área
(alfabética); dentro da área, NAO_CONFORME primeiro depois requisito.ordem. resumo com as
contagens de §3. NÃO implemente edição de parecer nem filtros de backend.
Rode npm run ci e npm run test:e2e; registre a saída real. Atualize checkpoint e audit.
```
