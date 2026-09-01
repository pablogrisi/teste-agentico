# TSD — Referência de página do PDF (RF-014, backend)

---
title: TSD - Referência de página do PDF (RF-014, backend)
type: tsd
status: concluída — mergeada no main (19f308b)
created: 31/08/2026 // Pablo Grisi (Engenheiro)
updated: 01/09/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/004-criar-analise.tsd.md
- docs/engineering/specs/007-abrir-analise.tsd.md
- docs/engineering/specs/008-revisao-requisito.tsd.md
---

## 1. Resumo

Rastreabilidade documental por página (RF-014), recorte backend **reduzido** após as
decisões do ciclo (roadmap RF-014, respostas de 31/08/2026): o visor do frontend
navega para a página via `#page=N` contra o PDF inteiro que **já** é servido por
`GET /analises/:id/pdf` — **não há extração de página no servidor**. O backend só
precisa (a) saber e expor o **total de páginas** do PDF para o frontend validar o
alvo da navegação, e (b) deixar o analista **corrigir/limpar** a página de
referência de cada requisito.

**User Story de origem:** `docs/product/roadmap.md`, feature RF-014 (recorte
backend), User Story e decisões aprovadas em 31/08/2026.

## 2. Objetivo técnico

- Nova coluna `Analise.totalPaginasPdf Int?` — total de páginas do PDF de entrada,
  calculado no `criar` com `pdf-lib` (best-effort: PDF não parseável → `null`, sem
  falhar a criação).
- `GET /analises/:id` passa a incluir `totalPaginasPdf` no payload.
- `PATCH /analises/:id/requisitos/:requisitoId` passa a aceitar `paginaReferencia`:
  inteiro `1..totalPaginasPdf` (quando conhecido), inteiro `≥ 1` (quando
  `totalPaginasPdf` é `null`), **ou** `null` para limpar; fora disso → `422`.
  Definir `paginaReferencia` **não** dispara a regra de comentário obrigatório
  (R-06).
- A ausência de página já é explícita no payload de leitura (`paginaReferencia:
  null` em cada item — campo existente desde a TSD-007).
- Testes unit (contagem de páginas; validação de `paginaReferencia`) + integração.

## 3. Escopo

### Incluído

- **`prisma/schema.prisma`** — `model Analise`: adicionar
  `totalPaginasPdf Int? @map("total_paginas_pdf")`. Sem outras mudanças de modelo.
- **`prisma/migrations/20260901020000_analise_total_paginas/migration.sql`** (novo):
  `ALTER TABLE "analise" ADD COLUMN "total_paginas_pdf" INTEGER;`. Autorada por
  `prisma migrate diff --from-schema-datamodel <schema anterior via git show> --to-schema-datamodel prisma/schema.prisma --script`
  (sem banco), revisada à mão para conter só o `ALTER TABLE` (sem linha de `warn`
  de depreciação).
- **`src/analises/contar-paginas-pdf.ts`** (novo):
  - `export async function contarPaginasPdf(bytes: Buffer): Promise<number | null>`.
  - Implementação: `PDFDocument.load(bytes, { updateMetadata: false })` →
    `doc.getPageCount()`. Qualquer exceção (PDF corrompido, encriptado, vazio) →
    captura, loga em nível `debug` e devolve `null`. **Nunca lança.**
  - Sem estado, sem injeção — função pura testável.
- **`src/analises/analises.service.ts`** — `criar`:
  - Após a validação passar e **antes** do `analise.create`, calcular
    `const totalPaginasPdf = await contarPaginasPdf(entrada.arquivo!.buffer);`.
  - Incluir `totalPaginasPdf` no `data` do `analise.create`.
  - A falha de contagem (retorno `null`) **não** interrompe a criação nem muda o
    status: a análise é criada com `totalPaginasPdf: null`.
- **`src/analises/analise-detalhe.ts`**:
  - `AnaliseDetalhe`: adicionar `totalPaginasPdf: number | null`.
  - `montarAnaliseDetalhe`: preencher `totalPaginasPdf: analise.totalPaginasPdf`.
- **`src/analises/revisao-requisito.ts`**:
  - `PatchRevisaoBody`: adicionar `paginaReferencia?: number | null`.
  - `DadosRevisao`: adicionar `paginaReferencia?: number | null`.
  - `validarEResolverPatch(atual, body, totalPaginasPdf: number | null)` — novo 3º
    parâmetro posicional:
    - `paginaReferencia` entra na checagem de "corpo vazio": um corpo só com
      `paginaReferencia` (inclusive `null`) é um corpo válido/não-vazio.
    - `body.paginaReferencia === undefined` → não mexe.
    - `body.paginaReferencia === null` → sempre válido; resolve para `null`
      (limpar).
    - `body.paginaReferencia` número → válido sse `Number.isInteger(n)` **e**
      `n >= 1` **e** (`totalPaginasPdf === null` **ou** `n <= totalPaginasPdf`).
      Fora disso → erro `"paginaReferencia deve ser um inteiro entre 1 e N"`
      (ou `"... um inteiro >= 1"` quando `totalPaginasPdf` é `null`).
    - Qualquer outro tipo (string, boolean, número não-inteiro) → erro.
    - **Independência da R-06:** a regra de comentário obrigatório continua
      olhando só `statusFinalResolvido !== atual.statusSugeridoIa`. `paginaReferencia`
      não entra nessa conta. Um PATCH só com `paginaReferencia` num requisito cujo
      `statusFinal` já é divergente e **sem** comentário armazenado **não** é
      bloqueado por causa da página (mas segue bloqueado pela R-06 preexistente, que
      não é regressão desta TSD — ver §9).
    - `dados.paginaReferencia` só é setado quando o valor resolvido difere de
      `atual.paginaReferencia`.
- **`src/analises/analises.service.ts`** — `revisarRequisito`: passar
  `analise.totalPaginasPdf` como 3º argumento de `validarEResolverPatch`. O `item`
  da resposta já reflete `paginaReferencia` (via `toItem`, desde a TSD-007).
- **`src/core/ports/armazenamento-pdf.port.ts`** e
  **`src/core/adapters/armazenamento-pdf.filesystem-adapter.ts`** — `lerPagina`
  **permanece** como seam não implementado; só atualizar o comentário para refletir
  a decisão do ciclo: o visor do frontend navega client-side (`#page=N`), então a
  extração server-side não é necessária no MVP; o seam fica para uma eventual
  necessidade futura, sem ciclo agendado.
- **`package.json`** — nova dependência `pdf-lib` (só para contagem de páginas;
  JS puro, sem binário nativo, compatível com ts-jest CJS).
- **Testes** (ver §7).

### Fora do escopo

- Endpoint de página (`GET /analises/:id/pdf?pagina=N`) ou qualquer extração /
  recorte de página no servidor.
- Visor de PDF, destaque de trecho, coordenadas, âncoras dentro da página.
- A IA **sugerir** `paginaReferencia` no processamento — hoje o stub não sugere
  página; quando a integração real entrar (A-02), o mapeamento
  sugestão→`paginaReferencia` será tratado lá. Esta TSD só cobre a **correção
  manual** pelo analista.
- Recalcular `totalPaginasPdf` de análises já existentes (a coluna nasce `null`
  para o histórico; só novas análises populam).
- Reprocessar não mexe em `totalPaginasPdf` (a coluna é do PDF de entrada, que não
  muda no reprocessamento).
- Frente frontend (visor, referência clicável, estado "sem página").

## 4. Contexto consultado

- `docs/product/prd.md` — RF-014, §8 (rastreabilidade), §9
- `docs/product/roadmap.md` — feature RF-014 (User Story + "Decisões do ciclo")
- `docs/product/questoes-abertas.md` — P-05 (ausência de página válida + correção
  das páginas sugeridas pela IA), A-02
- `docs/architecture/sdd.md` — §7 ("Revisar requisito", "Abrir análise"), §8
  (`analise`), §9 (portas e adapters)
- `docs/engineering/specs/004-*` (`criar`), `007-*` (`AnaliseDetalhe`,
  `montarAnaliseDetalhe`), `008-*` (`validarEResolverPatch`, PATCH)
- `docs/perguntas-e-respostas.md` — "Ciclo RF-014 (PDF por página), Agente PM"

## 5. Impacto esperado

- **Produto:** o analista consegue apontar, por requisito, a página do PDF que
  sustenta o parecer, e corrigir o que estiver errado; o frontend sabe o total de
  páginas para validar a navegação e mostrar "sem página" quando `null`. Endereça
  parcialmente P-05 (a correção manual; a *sugestão* automática fica com A-02).
- **Arquitetura:** primeira leitura de conteúdo do PDF no fluxo de criação
  (`pdf-lib`, best-effort, fora do caminho crítico de erro). Nenhuma porta nova.
- **Implementação:** 1 coluna + migration; 1 função pura nova; extensão de
  `validarEResolverPatch` com 1 parâmetro; 2 campos novos em interfaces de leitura.
- **Testes:** unit de `contarPaginasPdf` (PDF real de N páginas, PDF lixo → `null`)
  e da validação de `paginaReferencia`; integração criar→payload e PATCH.
- **Documentação:** SDD §7/§8 (coluna + contrato do PATCH e do GET); P-05 →
  parcialmente endereçada em `questoes-abertas.md`; checkpoint, audit, roadmap.

## 6. Plano de implementação

1. `npm i pdf-lib` no `backend/`.
2. `schema.prisma`: `totalPaginasPdf Int?` em `Analise`. `npm run prisma:validate`.
3. Gerar `migration.sql` por `prisma migrate diff` (schema anterior via
   `git show HEAD:backend/prisma/schema.prisma`), limpar à mão, criar a pasta
   `20260901020000_analise_total_paginas/`. `npm run prisma:generate`.
4. `contar-paginas-pdf.ts` + unit.
5. `analises.service.ts` `criar`: calcular e persistir `totalPaginasPdf`.
6. `analise-detalhe.ts`: campo em `AnaliseDetalhe` + `montarAnaliseDetalhe`.
7. `revisao-requisito.ts`: `paginaReferencia` em `PatchRevisaoBody`/`DadosRevisao`
   e na validação (3º parâmetro `totalPaginasPdf`) + unit.
8. `analises.service.ts` `revisarRequisito`: passar `analise.totalPaginasPdf`.
9. Comentário do seam `lerPagina` (porta + adapter).
10. Integração: estender `test/integration/revisao-requisito.integration-spec.ts`
    e `test/integration/abrir-analise.integration-spec.ts` (ou
    `analises.integration-spec.ts` para o `criar`).
11. `npm run ci` + `npm run test:e2e`.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | **`contarPaginasPdf`:** buffer de um PDF válido de N páginas (fixture gerada com `pdf-lib` no próprio teste) → `N`; buffer não-PDF / vazio / truncado → `null` (não lança). **`validarEResolverPatch` com `paginaReferencia`:** corpo só com `paginaReferencia` não é "vazio"; `null` → limpa; inteiro no intervalo com `totalPaginasPdf` conhecido → ok; `0`, negativo, não-inteiro, `> totalPaginasPdf`, string → erro; com `totalPaginasPdf = null`, qualquer inteiro `≥ 1` → ok, `0`/negativo → erro; `dados.paginaReferencia` só aparece quando muda; definir só `paginaReferencia` num requisito com `statusFinal` já divergente **e** comentário já armazenado → ok (R-06 satisfeita), sem exigir novo comentário por causa da página. |
| Integração | Sim | App real + Postgres embutido + `StubAdapter` (`PROCESSAMENTO_AUTO=false`). (1) Criar análise com um PDF de 3 páginas → `GET /analises/:id` traz `totalPaginasPdf: 3`; criar com um "PDF" de bytes inválidos que ainda passa na validação de assinatura (`%PDF-` + lixo) → `totalPaginasPdf: null`, criação `201`. (2) Processar → `PATCH .../requisitos/:reqId` com `paginaReferencia: 2` → `200`, `item.paginaReferencia === 2`; `PATCH` com `paginaReferencia: 99` (> total) → `422`; `PATCH` com `paginaReferencia: null` → `200`, `item.paginaReferencia === null`; `PATCH` só com `paginaReferencia` **não** exige comentário e **não** marca `verificado`. |
| Contrato | Não | Sem serviço externo (a lib roda em processo). |
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

- [x] `model Analise` tem `totalPaginasPdf Int?`; migration
      `20260901020000_analise_total_paginas` só com o `ALTER TABLE ... ADD COLUMN`.
- [x] Ao criar uma análise com um PDF válido, `totalPaginasPdf` é o número de
      páginas do arquivo; com um PDF não parseável, é `null` e a criação retorna
      `201` normalmente.
- [x] `GET /analises/:id` inclui `totalPaginasPdf` (número ou `null`).
- [x] `PATCH /analises/:id/requisitos/:requisitoId` com `paginaReferencia` inteiro
      em `1..totalPaginasPdf` → `200`, persistido, refletido em `item.paginaReferencia`.
- [x] Mesmo PATCH com `paginaReferencia` `0`, negativo, não-inteiro, string ou
      `> totalPaginasPdf` (quando conhecido) → `422`, nada gravado.
- [x] Com `totalPaginasPdf = null`, `paginaReferencia` de qualquer inteiro `≥ 1` →
      `200`; `≤ 0` ou não-inteiro → `422`.
- [x] `PATCH` com `paginaReferencia: null` → `200`, limpa a página.
- [x] `PATCH` **só** com `paginaReferencia` não exige comentário (R-06 não é
      disparada pela página) e não altera `statusFinal` nem `verificado`.
- [x] `GET /analises/:id/pdf` (PDF inteiro) inalterado.
- [x] `lerPagina` segue como seam; comentário atualizado, sem implementação.
- [x] `npm run ci` e `npm run test:e2e` verdes.

## 9. Riscos e decisões abertas

- **`pdf-lib` como dependência nova:** JS puro, sem binário nativo, compatível com
  o ts-jest CJS (diferente do `@nestjs/schedule` que foi descartado). Uso restrito
  a `getPageCount()`; se no futuro precisar de render/extração, reavaliar a lib.
- **Contagem best-effort:** um PDF com estrutura incomum pode contar errado ou
  cair no `null`. Aceitável: `totalPaginasPdf` serve para o frontend validar a
  navegação e exibir contexto, não é regra de negócio. Quando `null`, o PATCH
  aceita qualquer página `≥ 1` (o frontend valida contra o que o próprio visor
  reportar).
- **`paginaReferencia` fora do intervalo por PDF trocado depois:** o PDF de
  entrada não muda após a criação (nem no reprocessamento), então `totalPaginasPdf`
  é estável; não há janela de inconsistência.
- **Regra R-06 preexistente:** um `PATCH` só com `paginaReferencia`, num requisito
  cujo `statusFinal` já diverge da IA e **sem** comentário armazenado, ainda
  retorna `422` — mas por causa da R-06 (TSD-008), não desta TSD. Não é regressão:
  esse estado só existe se um PATCH anterior tivesse gravado a divergência, o que
  a R-06 já impede. Registrado para não confundir na revisão.
- **Concorrência:** mesmo cenário da TSD-008 (último PATCH grava por cima).
  Aceitável no MVP.
- **P-05 fica parcialmente aberta:** a *correção manual* das páginas é entregue
  aqui; a *sugestão automática* de página pela IA e a definição de "quando a
  ausência de página é válida" dependem do contrato de IA (A-02) e ficam para o
  ciclo de integração.

## 10. Referências visuais

Não se aplica — slice de backend.

## 11. Rollback

- Reverter `revisao-requisito.ts` (remover `paginaReferencia` da validação e das
  interfaces) e o 3º argumento em `revisarRequisito`.
- Remover o campo `totalPaginasPdf` de `AnaliseDetalhe`/`montarAnaliseDetalhe` e o
  cálculo em `criar`; apagar `contar-paginas-pdf.ts`.
- Remover a dependência `pdf-lib`.
- A coluna `total_paginas_pdf` pode ficar (nullable, sem uso) ou sair por migration
  de reversão — sem impacto em dados existentes (sempre `null` no histórico).
- Comentário do seam `lerPagina` volta ao texto anterior.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (009), as TSD-004, TSD-007,
TSD-008 e o checkpoint.
Implemente só o escopo:
- Analise.totalPaginasPdf Int? + migration 20260901020000_analise_total_paginas
  (só ALTER TABLE ADD COLUMN, gerada por prisma migrate diff e limpa à mão).
- contar-paginas-pdf.ts: contarPaginasPdf(bytes) => número | null, best-effort,
  nunca lança (pdf-lib, getPageCount).
- criar(): calcular e persistir totalPaginasPdf; null não bloqueia a criação.
- AnaliseDetalhe + montarAnaliseDetalhe: expor totalPaginasPdf.
- PATCH .../requisitos/:requisitoId aceita paginaReferencia: inteiro 1..total
  (ou >=1 se total null) ou null p/ limpar; fora disso 422. NÃO dispara a regra
  de comentário (R-06). validarEResolverPatch ganha 3º parâmetro totalPaginasPdf.
- lerPagina continua como seam não implementado; só atualizar o comentário.
NÃO crie endpoint de página, visor, nem extração de página no servidor.
Rode npm run ci e npm run test:e2e; registre a saída. Atualize checkpoint e audit.
```
