# TSD — Conclusão da análise (RF-012 + RF-013 + RF-015, backend)

---
title: TSD - Conclusão da análise (RF-012/013/015, backend)
type: tsd
status: em aprovação
created: 01/09/2026 // Pablo Grisi (Engenheiro)
updated: 01/09/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/007-abrir-analise.tsd.md
- docs/engineering/specs/008-revisao-requisito.tsd.md
---

## 1. Resumo

`POST /analises/:id/concluir` para o analista fechar a análise numa única
confirmação (RF-012), sem etapa de aprovação/assinatura/dupla revisão (RF-015). A
conclusão só passa quando **todo requisito obrigatório está `verificado`**; senão
`422` com a lista de pendentes. O payload de leitura passa a expor o responsável
(`analistaId` + `analistaNome`) ao lado das datas e do `statusFinal` por requisito,
fechando o registro do RF-013. **Sem alteração de modelo** — `analise.concluida_em`
e o status `CONCLUIDA` já existem.

**User Story de origem:** `docs/product/roadmap.md`, feature RF-012 (recorte
backend, ciclo agrupado RF-012 + RF-013 + RF-015), User Story e decisões aprovadas
em 01/09/2026.

## 2. Objetivo técnico

- `POST /analises/:id/concluir` (`HttpCode 200` — nada é criado).
- `404` se a análise não existe para o analista atual.
- Análise já `CONCLUIDA` → **`200` idempotente** com o payload completo, sem mexer
  em `concluida_em`.
- Análise fora de `PRONTA_PARA_REVISAO` (`PENDENTE`, `PROCESSANDO`,
  `ERRO_PROCESSAMENTO`) → `409`.
- `PRONTA_PARA_REVISAO` com ≥ 1 requisito **obrigatório** com `verificado = false`
  → `422` com `{ message, requisitosPendentes: [{ requisitoId, codigo, titulo, area }] }`;
  nada gravado, análise segue `PRONTA_PARA_REVISAO`.
- Caso contrário → `status = CONCLUIDA`, `concluida_em = now()`; responde o payload
  completo (mesmo formato de `GET /analises/:id`).
- `GET /analises/:id` e o payload da conclusão passam a incluir `analistaId` e
  `analistaNome` (RF-013).
- Testes unit (regra de pendências, pura) + integração (fluxo ponta a ponta).

## 3. Escopo

### Incluído

- **`src/analises/conclusao-analise.ts`** (novo):
  - `RequisitoPendente = { requisitoId: string; codigo: string; titulo: string; area: string }`.
  - `export function requisitosObrigatoriosPendentes(avaliacoes: AvaliacaoComRequisito[]): RequisitoPendente[]`
    — filtra `a.requisito.obrigatorio && !a.verificado`, mapeia para `RequisitoPendente`,
    ordena por `area` (localeCompare) e depois `requisito.ordem`. Requisito
    obrigatório com `statusFinal = NAO_SE_APLICA` **conta** (a regra olha só
    `verificado`).
- **`src/analises/analise-detalhe.ts`**:
  - `AnaliseDetalhe`: adicionar `analistaId: string` e `analistaNome: string`.
  - `montarAnaliseDetalhe(analise, avaliacoes, analistaNome = '')` — novo 3º
    parâmetro; preencher `analistaId: analise.analistaId` e `analistaNome`.
- **`src/analises/analises.service.ts`**:
  - `abrir(id)` passa a resolver o nome:
    `montarAnaliseDetalhe(analise, avaliacoes, this.analistaAtual.getAnalistaAtual().nome)`.
  - **`concluir(id): Promise<AnaliseDetalhe>`:**
    1. `analise = await this.buscarPorId(id)` (`404` + escopo).
    2. `analise.status === 'CONCLUIDA'` → devolve `this.abrir(id)` (idempotente `200`).
    3. `analise.status !== 'PRONTA_PARA_REVISAO'` → `ConflictException` (`409`).
    4. `avaliacoes = avaliacaoRequisito.findMany({ where: { analiseId: id }, include: { requisito: true } })`.
    5. `pendentes = requisitosObrigatoriosPendentes(avaliacoes)`; se `length > 0` →
       `UnprocessableEntityException({ message, requisitosPendentes: pendentes })`.
    6. Claim atômico de transição:
       `updateMany({ where: { id, status: 'PRONTA_PARA_REVISAO' }, data: { status: 'CONCLUIDA', concluidaEm: new Date() } })`.
       Se `count === 0` (outra chamada concorrente concluiu primeiro) → seguir para
       o passo 7 sem erro.
    7. `return this.abrir(id)` (relê e monta o payload completo, já com
       `concluidaEm` e o responsável).
  - Erro de persistência no `updateMany` propaga (500), consistente com os demais
    endpoints (PRD §9).
- **`src/analises/analises.controller.ts`**:
  - `@Post(':id/concluir') @HttpCode(200) concluir(@Param('id') id) { return this.analises.concluir(id); }`.
- **Testes** (ver §7).

### Fora do escopo

- Reabrir uma análise `CONCLUIDA` (não há no MVP; o `PATCH` de requisito já
  responde `409` fora de `PRONTA_PARA_REVISAO`).
- Histórico/auditoria expandida de quem concluiu e quando, além do par
  `analista_id` + `concluida_em` (P-02).
- Relatório PDF da análise concluída (RF-016 — próximo ciclo).
- Qualquer fluxo de aprovação, assinatura ou dupla revisão (RF-015 = **ausência**
  desse fluxo; nada a implementar além da checagem de obrigatórios).
- Identidade real / múltiplos analistas (P-10) — `analistaNome` vem do
  `AnalistaAtualProvider` fixo.
- Frente frontend (modal de conclusão, botão global bloqueado).

## 4. Contexto consultado

- `docs/product/prd.md` — RF-012, RF-013, RF-015; §8 (regras); §9 ("Tentativa de
  conclusão com requisitos pendentes", "Erro de persistência"); §12 P-01/P-02
- `docs/architecture/sdd.md` — §7 ("Concluir análise" — rascunho), §8 (`analise`)
- `docs/product/questoes-abertas.md` — P-01 (valor formal da conclusão), P-02
  (auditoria mínima)
- `docs/product/glossario.md` — "Concluída", "Verificado", "Obrigatório"
- `docs/engineering/specs/006-*` (`AvaliacaoRequisito`, `PROCESSAMENTO_AUTO`),
  `007-*` (`montarAnaliseDetalhe`, `calcularResumo`, `AnaliseDetalhe`), `008-*`
  (`revisarRequisito` só em `PRONTA_PARA_REVISAO`)

## 5. Impacto esperado

- **Produto:** o analista fecha a análise sozinho quando terminou; o sistema
  garante que nenhum obrigatório passou sem verificação e registra responsável +
  datas + parecer por requisito (RF-013). Base pronta para o relatório (RF-016).
- **Arquitetura:** primeiro endpoint que fecha a máquina de status
  (`PRONTA_PARA_REVISAO → CONCLUIDA`); transição por `updateMany` condicional
  (mesmo padrão do claim atômico do worker). Sem migration.
- **Implementação:** `conclusao-analise.ts` novo (regra pura); `concluir` no
  serviço + rota; 2 campos novos em `AnaliseDetalhe`/`montarAnaliseDetalhe`.
- **Testes:** unit da regra de pendências; integração criar→processar→verificar→
  concluir, mais os caminhos `422`/`409`/`404`/idempotente.
- **Documentação:** SDD §7 ("Concluir análise" — contrato final) e §8 (`analise`:
  `analista_id`/`concluida_em` expostos); `questoes-abertas.md` P-01/P-02 —
  registrar que a conclusão do MVP é interna, sem valor formal externo definido;
  checkpoint, audit, roadmap.

## 6. Plano de implementação

1. `conclusao-analise.ts` + unit.
2. `analise-detalhe.ts`: `analistaId`/`analistaNome` em `AnaliseDetalhe` e
   `montarAnaliseDetalhe` (3º parâmetro).
3. `analises.service.ts`: `abrir` resolve o nome; `concluir` (passos 1–7).
4. Controller: `POST :id/concluir` (`HttpCode 200`).
5. Integração `test/integration/conclusao-analise.integration-spec.ts`.
6. Ajustar `abrir-analise.integration-spec.ts` / unit de `analise-detalhe` para os
   campos novos.
7. `npm run ci` + `npm run test:e2e`.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | **`requisitosObrigatoriosPendentes`:** obrigatório não verificado → entra na lista; **não** obrigatório não verificado → não entra; obrigatório verificado → não entra; obrigatório `NAO_SE_APLICA` não verificado → entra; lista ordenada por área e `ordem`; sem avaliações → lista vazia. **`montarAnaliseDetalhe`:** expõe `analistaId`/`analistaNome`; contrato anterior preservado (reusa os testes de agrupamento/resumo). |
| Integração | Sim | App real + Postgres embutido + `StubAdapter` (`PROCESSAMENTO_AUTO=false`), requisitos **obrigatórios**. (1) criar → processar (stub → `NAO_SE_APLICA`, `verificado=false`) → `POST /concluir` → `422` com `requisitosPendentes` (todos os obrigatórios); análise segue `PRONTA_PARA_REVISAO`. (2) `PATCH` marcando `verificado=true` em todos → `POST /concluir` → `200`, `status=CONCLUIDA`, `concluidaEm` preenchido, payload traz `analistaId`+`analistaNome`. (3) `POST /concluir` de novo → `200`, mesmo `concluidaEm` (idempotente). (4) `POST /concluir` numa análise `PENDENTE` → `409`. (5) id inexistente → `404`. (6) requisito **não** obrigatório não verificado não impede o `200`. |
| Contrato | Não | Sem serviço externo. |
| Smoke/validação manual contra dependência externa real | Não | — |

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run prisma:validate
npm run test
npm run test:e2e
npm run build
```

## 8. Critérios de aceite

- [ ] `POST /analises/:id/concluir` numa análise `PRONTA_PARA_REVISAO` sem
      obrigatórios pendentes → `200`, `status = CONCLUIDA`, `concluidaEm` gravado,
      payload no formato de `GET /analises/:id`.
- [ ] Mesma chamada com ≥ 1 obrigatório não verificado → `422` com
      `requisitosPendentes: [{ requisitoId, codigo, titulo, area }]`; nada gravado;
      status segue `PRONTA_PARA_REVISAO`.
- [ ] Requisito **não** obrigatório não verificado não bloqueia a conclusão.
- [ ] Requisito obrigatório com `statusFinal = NAO_SE_APLICA` e `verificado = false`
      **bloqueia** (entra na lista).
- [ ] Análise já `CONCLUIDA` → `200` idempotente, `concluidaEm` inalterado.
- [ ] Análise fora de `PRONTA_PARA_REVISAO` (não `CONCLUIDA`) → `409`.
- [ ] Análise inexistente para o analista → `404`.
- [ ] `GET /analises/:id` inclui `analistaId` e `analistaNome`.
- [ ] `npm run ci` e `npm run test:e2e` verdes.

## 9. Riscos e decisões abertas

- **Transição concorrente:** dois `POST /concluir` quase simultâneos — o
  `updateMany` condicional garante que só um grava `concluida_em`; o segundo vê
  `count === 0` e devolve o estado já concluído. Sem clobber de `concluida_em`.
- **`verificado` sem edição de parecer:** por decisão do ciclo (fiel ao PRD), o
  analista pode verificar um obrigatório aceitando a sugestão da IA sem alterar
  `statusFinal`. Se no futuro o negócio exigir decisão ativa, é uma regra a mais
  em `requisitosObrigatoriosPendentes`.
- **Valor formal da conclusão (P-01):** a conclusão do MVP é **interna** — não
  emite parecer com valor externo, não notifica, não trava mais nada além do
  próprio status. P-01/P-02 seguem abertas.
- **`analistaNome` do provider fixo:** enquanto não há identidade real (P-10),
  `analistaNome` é o valor de `ANALISTA_ATUAL_NOME`. Para análises antigas o nome
  exibido é sempre o do analista corrente — aceitável no MVP de analista único.
- **Sem migration:** `concluida_em` e `CONCLUIDA` já existem desde a TSD-004/006.

## 10. Referências visuais

Não se aplica — slice de backend.

## 11. Rollback

- Remover a rota `@Post(':id/concluir')` e `AnalisesService.concluir`.
- Apagar `conclusao-analise.ts` e seu spec.
- Reverter `analise-detalhe.ts` (tirar `analistaId`/`analistaNome` e o 3º
  parâmetro) e o ajuste em `abrir`.
- Nada de banco a reverter (sem migration).

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (010), as TSD-007 e TSD-008 e
o checkpoint.
Implemente só o escopo:
- conclusao-analise.ts: requisitosObrigatoriosPendentes(avaliacoes) => lista de
  { requisitoId, codigo, titulo, area } dos obrigatórios com verificado=false,
  ordenada por área e ordem.
- AnaliseDetalhe + montarAnaliseDetalhe: expor analistaId e analistaNome (3º
  parâmetro analistaNome, default '').
- AnalisesService.abrir: passar o nome do AnalistaAtualProvider.
- AnalisesService.concluir(id): 404; CONCLUIDA => 200 idempotente (abrir); fora de
  PRONTA_PARA_REVISAO => 409; obrigatórios pendentes => 422 { requisitosPendentes };
  senão updateMany where status=PRONTA_PARA_REVISAO set CONCLUIDA + concluidaEm, e
  devolve abrir(id).
- Controller: POST :id/concluir com HttpCode(200).
NÃO faça migration, reabertura, relatório PDF, nem fluxo de aprovação.
Rode npm run ci e npm run test:e2e; registre a saída. Atualize checkpoint e audit.
```
