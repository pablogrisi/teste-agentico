# TSD — Processamento da análise e sugestão por requisito (RF-005 + RF-007, backend)

---
title: TSD - Processamento da análise (RF-005/RF-007, backend)
type: tsd
status: concluída — mergeada no main (67ff89f)
created: 31/08/2026 // Pablo Grisi (Engenheiro)
updated: 31/08/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/004-criar-analise.tsd.md
- docs/engineering/specs/003-base-fixa-requisitos.tsd.md
---

## 1. Resumo

Implementa o worker em processo que transforma uma análise `PENDENTE` em `PRONTA_PARA_REVISAO`: chama a `AnaliseIaPort` (hoje o `StubAdapter`) e grava uma `avaliacao_requisito` por requisito ativo, com o status sugerido pela IA. Cobre o recorte backend de RF-005 + RF-007. Cria a terceira e última tabela de domínio do MVP.

**User Story de origem:** `docs/product/roadmap.md`, feature RF-005 (recorte backend, ciclo agrupado RF-005 + RF-007), User Story e decisões de ciclo aprovadas em 31/08/2026.

## 2. Objetivo técnico

- Modelo Prisma `AvaliacaoRequisito` + migration; back-relations em `Analise` e `Requisito`.
- `ProcessamentoService`: claim atômico de `PENDENTE`, chamada à `AnaliseIaPort` com timeout, gravação transacional das avaliações, avanço de status; caminho de erro para `ERRO_PROCESSAMENTO`.
- Agendamento: disparo imediato após `POST /analises`, varredura periódica, recuperação no boot — tudo sob a flag `PROCESSAMENTO_AUTO`.
- `POST /analises/:id/reprocessar`.
- Testes unit (claim, sucesso, erro→rollback, base vazia, timeout) + integração (criar → processar → avaliações + status) contra PostgreSQL embutido + `StubAdapter`.

## 3. Escopo

### Incluído

- **Modelo Prisma `AvaliacaoRequisito`** (`@@map("avaliacao_requisito")`):
  - `id` (uuid, PK)
  - `analiseId` (`@map("analise_id")`, FK → `analise`, `onDelete: Cascade`)
  - `requisitoId` (`@map("requisito_id")`, FK → `requisito`, `onDelete: Restrict`)
  - `statusSugeridoIa` (`@map("status_sugerido_ia")`) — `StatusRequisito` (`CONFORME` | `NAO_CONFORME` | `NAO_SE_APLICA`), string validada em código (`src/core/domain/status-requisito.ts`), **não** enum de banco
  - `statusFinal` (`@map("status_final")`) — `StatusRequisito`; inicial = `statusSugeridoIa`
  - `verificado` (boolean, default `false`)
  - `comentario` (string, nullable) — reservado para RF-017
  - `paginaReferencia` (int, `@map("pagina_referencia")`, nullable)
  - `criadoEm`, `atualizadoEm`
  - `@@unique([analiseId, requisitoId])`, `@@index([analiseId])`
  - Back-relations: `Analise.avaliacoes AvaliacaoRequisito[]`, `Requisito.avaliacoes AvaliacaoRequisito[]`.
- **Migration** `*_avaliacao_requisito` (gerada por `prisma migrate diff` schema→schema; verificada pelo `migrate deploy` do `test:e2e`).
- **`ProcessamentoModule`** (hoje vazio) → `providers`/`exports` `ProcessamentoService`. Importa `RequisitosModule` (usa `RequisitosService.listarAtivos()`). Consome, do `CoreModule` global: `ANALISE_IA_PORT`, `ARMAZENAMENTO_PDF_PORT`.
- **`ProcessamentoService`**:
  - `processarUma(analiseId: string): Promise<void>`:
    1. **Claim atômico:** `analise.updateMany({ where: { id, status: 'PENDENTE' }, data: { status: 'PROCESSANDO' } })` → se `count !== 1`, retorna (já foi pega, ou não está `PENDENTE`).
    2. Carrega a `analise` (para `arquivoPdfRef`).
    3. `armazenamentoPdf.ler(arquivoPdfRef)` → bytes. Falha → `marcarErro('não foi possível ler o PDF de entrada')`.
    4. `requisitosService.listarAtivos()`. Vazio → `marcarErro('base de requisitos vazia')`.
    5. `Promise.race([ analiseIa.analisar({ pdf, requisitos }), timeout(IA_TIMEOUT_MS) ])`. Rejeição/timeout → `marcarErro(mensagem)`.
    6. **Transação:** para **cada requisito ativo**, cria `avaliacao_requisito` com `statusSugeridoIa = sugestao?.statusSugerido ?? 'NAO_SE_APLICA'` (default para requisito que a IA não retornou), `statusFinal = statusSugeridoIa`, `verificado = false`, `paginaReferencia = sugestao?.paginaReferencia ?? null`. Depois `analise.update({ status: 'PRONTA_PARA_REVISAO', motivoErro: null })`. Tudo num `$transaction` — falha reverte as avaliações e o status fica `PROCESSANDO` (a varredura/boot recupera).
  - `marcarErro(analiseId, motivo)`: `analise.update({ status: 'ERRO_PROCESSAMENTO', motivoErro: motivo.slice(0, 500) })`. Nenhuma avaliação é gravada (o erro acontece antes da transação da etapa 6).
  - `processarPendentes(): Promise<void>`: guardado por um flag em memória (`emExecucao`) para varreduras sobrepostas não rodarem juntas; busca `analise` `PENDENTE` (ordenado por `iniciadaEm`, `take` limitado) e chama `processarUma` **uma de cada vez**.
  - `recuperarPresas(): Promise<void>`: `updateMany({ where: { status: 'PROCESSANDO' }, data: { status: 'PENDENTE' } })` — para o boot.
  - Agendamento (só quando `PROCESSAMENTO_AUTO === true`):
    - `onApplicationBootstrap()` → `recuperarPresas()`, `processarPendentes()`, e um `setInterval(PROCESSAMENTO_INTERVALO_MS)` guardado no serviço; `onModuleDestroy()` faz `clearInterval`.
    - **Implementação:** `setInterval` próprio, **não** `@nestjs/schedule` — o pacote é ESM-only e quebra o `ts-jest` (CJS) do projeto, e o uso seria só bookkeeping de intervalo.
- **Disparo imediato:** `AnalisesModule` importa `ProcessamentoModule`; `AnalisesService.criar`, após o `create`, faz `void this.processamento.processarUma(analise.id)` (fire-and-forget) **somente se `PROCESSAMENTO_AUTO === true`**. Não altera o `201`/`status: PENDENTE` da resposta.
- **`POST /analises/:id/reprocessar`** no `AnalisesController` → `AnalisesService.reprocessar(id)`:
  - `buscarPorId(id)` (`404` se não existir para o analista atual).
  - `status !== 'ERRO_PROCESSAMENTO'` → `ConflictException` (`409`).
  - `analise.update({ status: 'PENDENTE', motivoErro: null })`; se `PROCESSAMENTO_AUTO`, dispara `void processarUma(id)`.
  - devolve a análise (status `PENDENTE`).
- **Config nova**: `IA_TIMEOUT_MS` (default `120000`), `PROCESSAMENTO_INTERVALO_MS` (default `5000`), `PROCESSAMENTO_AUTO` (`true`|`false`, default `true`) — em `env.validation.ts` + `configuration.ts`. `setup-e2e-env.ts` fixa `PROCESSAMENTO_AUTO=false`.
- **Dep nova**: nenhuma (a intenção era `@nestjs/schedule`, descartado — ver acima).
- **Testes** (ver §7).

### Fora do escopo

- Leitura/agrupamento/ordenação das avaliações para a tela (RF-009) — nenhum endpoint novo de leitura das avaliações neste ciclo.
- Edição de `status_final` / `verificado` / `comentario` (RF-008, RF-011, RF-017).
- `HttpAdapter` real da `AnaliseIaPort` e teste de contrato (adiado para o fim do MVP; só o `StubAdapter`).
- Fila/broker dedicado, múltiplos workers, retry automático com backoff (A-06).
- Entrega de PDF por página (RF-014) — `paginaReferencia` é só persistida.
- Frente frontend.

## 4. Contexto consultado

- `docs/product/prd.md` — RF-005, RF-007, §8 (3 status), §9 (LLM indisponível, base indisponível, erro no processamento)
- `docs/architecture/sdd.md` — §4 e §7 ("Criar análise e processar"), §8 (`avaliacao_requisito`), §9 (processamento em processo), §10 (riscos: PDF grande, restart)
- `docs/product/glossario.md` — "Avaliação de requisito", "Status do requisito", "Capacidade de análise assistida por IA"
- `docs/engineering/specs/003-*` (RequisitosService), `004-*` (Analise, STATUS_ANALISE, AnalisesService/Controller)
- `src/core/ports/analise-ia.port.ts`, `src/core/adapters/analise-ia.stub-adapter.ts`

## 5. Impacto esperado

- **Produto:** o fluxo passa a produzir pareceres sugeridos — a análise fica revisável (com a saída do stub por enquanto).
- **Arquitetura:** 3ª tabela de domínio; primeiro processamento assíncrono real (SDD §4). Confirma a máquina de status de `analise`.
- **Implementação:** `src/processamento/**`, `src/analises/` (trigger + reprocessar), config nova.
- **Testes:** integração exercita o worker ponta a ponta com o `StubAdapter`.
- **Documentação:** SDD §7/§8 (`avaliacao_requisito` implementada; fluxo de processamento); checkpoint, audit, roadmap (RF-005/RF-007).
- **Operação:** varредura de 5 s rodando em produção; variáveis novas.

## 6. Plano de implementação

1. `prisma/schema.prisma`: `AvaliacaoRequisito` + back-relations. `prisma generate`.
2. Migration `*_avaliacao_requisito` (schema→schema diff); conferir SQL.
3. `@nestjs/schedule`; `ScheduleModule.forRoot()` no `AppModule`.
4. Config: `IA_TIMEOUT_MS`, `PROCESSAMENTO_INTERVALO_MS`, `PROCESSAMENTO_AUTO`.
5. `ProcessamentoService` (claim, `processarUma`, `marcarErro`, `processarPendentes`, `recuperarPresas`, agendamento) + `ProcessamentoModule`.
6. `AnalisesModule` importa `ProcessamentoModule`; trigger em `criar`; `reprocessar` no serviço + rota no controller.
7. Testes unit (`ProcessamentoService` com mocks) + integração (`processamento.integration-spec`).
8. `npm run ci` + `npm run test:e2e`; registrar saída real.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `ProcessamentoService` com `prisma`/`RequisitosService`/`AnaliseIaPort`/`ArmazenamentoPdfPort` mockados: claim falha quando `count=0` (não processa); sucesso cria 1 avaliação por requisito (com default `NAO_SE_APLICA` para requisito sem sugestão) e vai para `PRONTA_PARA_REVISAO`; erro da IA / timeout → `marcarErro` sem avaliações; base vazia → `ERRO_PROCESSAMENTO` "base de requisitos vazia"; `reprocessar` fora de `ERRO_PROCESSAMENTO` → 409. |
| Integração | Sim | App real + PostgreSQL embutido + `StubAdapter` (`PROCESSAMENTO_AUTO=false`, o teste chama `processarPendentes()`/`processarUma()`). Criar via `POST /analises` (com a base semeada) → processar → `avaliacao_requisito` tem 1 linha por requisito ativo, `status_final = status_sugerido_ia`, `verificado=false`, e `analise.status = PRONTA_PARA_REVISAO`. Base vazia → `ERRO_PROCESSAMENTO`. `POST /analises/:id/reprocessar` numa análise em erro → volta a `PENDENTE` e reprocessa; `409` se não estiver em erro; `404` se não existir. |
| Contrato | Não neste ciclo | O `HttpAdapter` real da IA está adiado; quando existir, entra o teste de contrato da `AnaliseIaPort`. |
| Smoke/validação manual contra dependência externa real | Não | Sem IA real ainda. |

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## 8. Critérios de aceite

- [ ] `prisma validate` passa; a migration cria `avaliacao_requisito` com FKs, `@@unique(analise_id, requisito_id)` e índice; aplica num banco limpo (via `test:e2e`).
- [ ] Uma análise `PENDENTE` (com base de requisitos semeada) processada resulta em `status = PRONTA_PARA_REVISAO` e **uma** `avaliacao_requisito` por requisito ativo.
- [ ] Cada avaliação tem `status_sugerido_ia` ∈ {`CONFORME`,`NAO_CONFORME`,`NAO_SE_APLICA`}, `status_final` igual a ele, `verificado = false`.
- [ ] Claim atômico: chamar `processarUma` duas vezes na mesma análise só grava um conjunto de avaliações.
- [ ] Erro/timeout da `AnaliseIaPort` → `status = ERRO_PROCESSAMENTO` com `motivo_erro`, **zero** avaliações gravadas.
- [ ] Base de requisitos ativos vazia → `ERRO_PROCESSAMENTO` com motivo "base de requisitos vazia".
- [ ] `recuperarPresas` volta `PROCESSANDO` → `PENDENTE`.
- [ ] `POST /analises/:id/reprocessar`: `404` inexistente; `409` se `status != ERRO_PROCESSAMENTO`; caso ok → `PENDENTE` + `motivo_erro` limpo.
- [ ] Com `PROCESSAMENTO_AUTO=false` nenhum agendamento roda (testes determinísticos).
- [ ] `npm run ci` e `npm run test:e2e` verdes, com saída real registrada.

## 9. Riscos e decisões abertas

- **Claim via `updateMany` (`PENDENTE`→`PROCESSANDO`)** é suficiente para 1 processo. Com múltiplos processos, migrar para `SELECT ... FOR UPDATE SKIP LOCKED` (A-06) — fora de escopo.
- **`@Interval` durante testes**: neutralizado por `PROCESSAMENTO_AUTO=false`. Se algum teste futuro precisar do agendamento real, isolar num spec próprio.
- **Falha da transação da etapa 6** deixa a análise em `PROCESSANDO`; a varredura/boot recupera para `PENDENTE`. Não há limite de tentativas neste ciclo — se a falha for permanente, fica em loop de `PROCESSANDO`→`PENDENTE`. Aceito no MVP; contador de tentativas + `ERRO_PROCESSAMENTO` após N fica para um ciclo futuro (registrar em `questoes-abertas.md` se preocupar).
- **`StubAdapter`** retorna `NAO_SE_APLICA` para tudo — as avaliações do MVP não refletem o PDF até a IA real.
- **PDF grande** que estoure memória na leitura: fora do escopo tratar streaming; o timeout cobre a chamada à IA, não a leitura do arquivo.

## 10. Referências visuais

Não se aplica — slice de backend.

## 11. Rollback

- Reverter a migration (nova migration `DROP TABLE "avaliacao_requisito"`).
- Remover `src/processamento/**` (voltar `ProcessamentoModule` para `@Module({})`), o trigger em `AnalisesService.criar`, `reprocessar` + rota, a config nova, `@nestjs/schedule` + `ScheduleModule.forRoot()`, e `test/integration/processamento.integration-spec.ts`.
- `avaliacao_requisito` ainda não é consumida por nenhum outro módulo.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (006), a TSD-003/004 e o checkpoint.
Implemente só o escopo: model AvaliacaoRequisito + migration, ProcessamentoService (claim
atômico PENDENTE→PROCESSANDO, chamada à AnaliseIaPort com timeout, gravação transacional
de 1 avaliacao_requisito por requisito ativo, avanço para PRONTA_PARA_REVISAO ou
ERRO_PROCESSAMENTO), agendamento sob PROCESSAMENTO_AUTO, disparo imediato no criar,
POST /analises/:id/reprocessar. NÃO exponha endpoint de leitura das avaliações (é RF-009),
NÃO implemente edição de parecer, NÃO faça o HttpAdapter real da IA.
Rode npm run ci e npm run test:e2e; registre a saída real. Atualize checkpoint e audit.
```
