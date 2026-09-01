# TSD — Relatório PDF final da análise (RF-016, backend)

---
title: TSD - Relatório PDF final (RF-016, backend)
type: tsd
status: em aprovação
created: 01/09/2026 // Pablo Grisi (Engenheiro)
updated: 01/09/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/007-abrir-analise.tsd.md
- docs/engineering/specs/010-conclusao-analise.tsd.md
---

## 1. Resumo

`GET /analises/:id/relatorio` gera **sob demanda** o relatório PDF de uma análise
`CONCLUIDA` (RF-016), com `pdfkit`, sem persistir o arquivo (A-04). Reaproveita
`montarAnaliseDetalhe` (mesmos dados de `GET /analises/:id`). **Sem alteração de
modelo.** Novo `RelatorioModule` (hoje vazio) com service + controller.

**User Story de origem:** `docs/product/roadmap.md`, feature RF-016 (recorte
backend), User Story e decisões aprovadas em 01/09/2026.

## 2. Objetivo técnico

- `GET /analises/:id/relatorio` → `200`, `Content-Type: application/pdf`,
  `Content-Disposition: inline; filename="relatorio-analise-<id>.pdf"`, corpo = PDF.
- `404` se a análise não existe para o analista atual (via `AnalisesService`).
- `409` se `status !== CONCLUIDA`.
- Conteúdo do PDF: título; NUP; objeto; responsável (`analistaNome` + `analistaId`);
  data/hora de início e de conclusão; resumo de contagens; e, agrupados por área
  (ordem alfabética) e dentro de cada área por `requisito.ordem`, os requisitos com
  `codigo`, `titulo`, norma estruturada formatada, referência de página (quando
  houver) e `statusFinal` (rótulo pt-BR).
- Nada é gravado (efêmero — A-04).
- Testes unit (modelo do relatório, puro) + smoke de renderização + integração
  (fluxo ponta a ponta, `409`, `404`).

## 3. Escopo

### Incluído

- **`package.json`** — novas dependências: `pdfkit` (runtime) e `@types/pdfkit`
  (dev). JS puro, sem headless browser, compatível com ts-jest CJS.
- **`src/relatorio/relatorio-modelo.ts`** (novo) — **puro, testável**:
  - `LinhaRelatorio = { codigo: string; titulo: string; norma: string; paginaReferencia: number | null; statusFinal: string }`.
  - `AreaRelatorio = { area: string; itens: LinhaRelatorio[] }`.
  - `RelatorioModelo = { nup: string; objeto: string; analistaId: string; analistaNome: string; iniciadaEm: Date; concluidaEm: Date | null; resumo: ResumoAnalise; areas: AreaRelatorio[] }`.
  - `formatarNorma(norma: NormaReferencia): string` — junta as partes não nulas:
    `"Lei 14.133/2021, art. 72, inc. I, § 1º, alínea a"` (só os campos presentes;
    `''` se todos nulos).
  - `montarModeloRelatorio(detalhe: AnaliseDetalhe): RelatorioModelo` — copia os
    campos; para cada área de `detalhe.avaliacoesPorArea` **reordena os itens por
    `ordem`** (o `montarAnaliseDetalhe` os traz com `NAO_CONFORME` primeiro — o
    relatório quer a ordem natural), mapeia para `LinhaRelatorio`.
- **`src/relatorio/relatorio.builder.ts`** (novo):
  - `ROTULO_STATUS: Record<string, string>` — `CONFORME → "Conforme"`,
    `NAO_CONFORME → "Não conforme"`, `NAO_SE_APLICA → "Não se aplica"`.
  - `renderRelatorioPdf(modelo: RelatorioModelo): Promise<Buffer>` — compõe o
    documento com `pdfkit`, coleta os chunks do stream (`doc.on('data')` /
    `doc.on('end')`) e resolve um `Buffer`. Datas formatadas com
    `Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })`.
    Layout simples (sem tabela custom): títulos de seção + parágrafos; uma quebra
    de página não é forçada (o `pdfkit` pagina sozinho).
- **`src/relatorio/relatorio.service.ts`** (novo):
  - `@Injectable() RelatorioService`, injeta `AnalisesService`.
  - `async gerar(id: string): Promise<{ bytes: Buffer; nomeArquivo: string }>`:
    - `const detalhe = await this.analises.abrir(id);` (`404` + escopo por analista
      já vêm de `buscarPorId` dentro de `abrir`).
    - `if (detalhe.status !== 'CONCLUIDA') throw new ConflictException(...)` (`409`).
    - `const bytes = await renderRelatorioPdf(montarModeloRelatorio(detalhe));`
    - `return { bytes, nomeArquivo: 'relatorio-analise-' + detalhe.id + '.pdf' };`
- **`src/relatorio/relatorio.controller.ts`** (novo):
  - `@Controller('analises')`, `@Get(':id/relatorio')`:
    - `const { bytes, nomeArquivo } = await this.relatorio.gerar(id);`
    - `return new StreamableFile(bytes, { type: 'application/pdf', disposition: 'inline; filename="' + nomeArquivo + '"' });`
- **`src/relatorio/relatorio.module.ts`** — `imports: [AnalisesModule]`,
  `controllers: [RelatorioController]`, `providers: [RelatorioService]`.
- **Testes** (ver §7).

### Fora do escopo

- Persistir / versionar / arquivar o relatório (A-04 — sob demanda sempre).
- Comentário do analista no PDF (decisão do ciclo: fora deste slice).
- Assinatura digital, marca d'água, cabeçalho/rodapé institucional, logo.
- Layout rico (tabelas com bordas, cores por status, gráfico do resumo) — texto
  estruturado basta para o MVP.
- Internacionalização (só pt-BR).
- Relatório de análise **não** concluída (é `409`).
- Frente frontend (botão "baixar relatório").

## 4. Contexto consultado

- `docs/product/prd.md` — RF-016 (conteúdo mínimo), R-01 (relatório no MVP), §9
  ("Erro de persistência" — não se aplica, nada persiste)
- `docs/product/roadmap.md` — feature RF-016 (User Story + "Decisões do ciclo")
- `docs/architecture/sdd.md` — §2 (geração leve, sem headless browser), §6 (Módulo
  Relatório, `pdfkit`), §7 ("Relatório PDF"), §9 (A-04)
- `docs/product/questoes-abertas.md` — A-04 (sob demanda vs. persistido)
- `docs/engineering/specs/007-*` (`AnaliseDetalhe`, `AvaliacaoItem`, `NormaReferencia`,
  `ResumoAnalise`), `010-*` (`analistaId`/`analistaNome`, `abrir`, `CONCLUIDA`)

## 5. Impacto esperado

- **Produto:** o analista extrai o resultado da verificação como um PDF para
  arquivar/compartilhar fora do sistema — fecha o fluxo do MVP (criar → processar
  → revisar → concluir → **relatório**).
- **Arquitetura:** primeiro uso do `RelatorioModule`; primeira dependência de
  geração de documento (`pdfkit`). `RelatorioService` consome `AnalisesService`
  (já exportado por `AnalisesModule`) — sem acesso direto ao Prisma.
- **Implementação:** 4 arquivos novos no módulo + 2 deps; sem migration; sem
  mudança nos contratos existentes.
- **Testes:** unit do modelo puro (campos obrigatórios, ordenação por `ordem`,
  `formatarNorma`, inclusão condicional da página); smoke de `renderRelatorioPdf`
  (`%PDF-` + páginas ≥ 1 via `pdf-lib`); integração do endpoint.
- **Documentação:** SDD §7 ("Relatório PDF" — contrato final: `inline`, conteúdo);
  `questoes-abertas.md` A-04 (confirmar "sob demanda" como decisão do MVP);
  checkpoint, audit, roadmap.

## 6. Plano de implementação

1. `npm i pdfkit` + `npm i -D @types/pdfkit` no `backend/`.
2. `relatorio-modelo.ts` + unit.
3. `relatorio.builder.ts` + smoke unit.
4. `relatorio.service.ts` (`abrir` → `409` → render).
5. `relatorio.controller.ts` + `relatorio.module.ts` (`imports: [AnalisesModule]`).
6. Integração `test/integration/relatorio-pdf.integration-spec.ts`.
7. `npm run ci` + `npm run test:e2e`.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | **`montarModeloRelatorio`:** dado um `AnaliseDetalhe` com 2 áreas e itens de status/ordem/norma/página variados → o modelo tem `nup`, `objeto`, `analistaNome`, `iniciadaEm`, `concluidaEm`, `resumo` e `areas`; dentro de cada área os itens vêm por `ordem` (não "NAO_CONFORME primeiro"); `formatarNorma` junta só os campos presentes e devolve `''` quando todos nulos; `paginaReferencia` preservada (número ou `null`). **`renderRelatorioPdf`:** o `Buffer` começa com `%PDF-` e tem ≥ 1 página (carregado com `pdf-lib`); não lança para um modelo com áreas vazias. |
| Integração | Sim | App real + Postgres embutido + `StubAdapter` (`PROCESSAMENTO_AUTO=false`). Criar → processar → `PATCH verificado=true` em todos os obrigatórios → `POST /concluir` → `GET /analises/:id/relatorio` → `200`, `content-type: application/pdf`, `content-disposition` contém `inline`, corpo começa com `%PDF-`. `GET .../relatorio` numa análise ainda `PRONTA_PARA_REVISAO` → `409`. Id inexistente → `404`. |
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

- [ ] `GET /analises/:id/relatorio` numa análise `CONCLUIDA` → `200`,
      `Content-Type: application/pdf`, `Content-Disposition: inline; filename="relatorio-analise-<id>.pdf"`,
      corpo com assinatura `%PDF-`.
- [ ] O modelo do relatório (base do PDF) contém NUP, objeto, nome do responsável,
      `iniciadaEm`, `concluidaEm`, o `resumo` de contagens e, por área, os
      requisitos com `codigo`, `titulo`, norma formatada, página (quando houver) e
      `statusFinal`.
- [ ] Dentro de cada área os requisitos saem por `requisito.ordem` (não a ordem
      "não conformes primeiro" da tela).
- [ ] `formatarNorma` inclui só os campos não nulos; `''` quando não há norma.
- [ ] Análise fora de `CONCLUIDA` → `409`; análise inexistente para o analista →
      `404`.
- [ ] Nenhuma escrita em disco/banco no caminho do relatório.
- [ ] `npm run ci` e `npm run test:e2e` verdes.

## 9. Riscos e decisões abertas

- **`pdfkit` como dependência nova:** JS puro (usa `fontkit`/`zlib`), sem binário
  nativo nem browser; compatível com o ts-jest CJS. Traz fontes AFM padrão
  (Helvetica) embutidas — sem asset externo. Se `npm audit` acusar algo
  transitivo, avaliar no ciclo (como foi com `pdf-lib`).
- **Conteúdo textual não é assertável via extração:** o `pdfkit` não devolve texto.
  Mitigação: a lógica de conteúdo mora em `montarModeloRelatorio` (puro, 100%
  testável); o render tem só um smoke (`%PDF-` + páginas). Aceitável — o risco de
  regressão de conteúdo está coberto pelo teste do modelo.
- **Fuso das datas fixado em `America/Sao_Paulo`** para o texto ser determinístico.
  Se o produto quiser o fuso do usuário, revisar quando entrar identidade real.
- **Relatório sempre reflete o estado atual da análise concluída** (sob demanda).
  Como uma análise `CONCLUIDA` não é reaberta no MVP, o conteúdo é estável. Se
  algum dia houver reabertura/edição pós-conclusão, o relatório deixa de ser
  "imutável" — aí revisar A-04.
- **Sem migration, sem mudança de contrato existente.**

## 10. Referências visuais

Não se aplica — o layout é texto estruturado simples, sem paridade com protótipo.

## 11. Rollback

- Remover `src/relatorio/*` (voltar `relatorio.module.ts` ao módulo vazio).
- Remover `pdfkit` e `@types/pdfkit` do `package.json`.
- Nada de banco a reverter.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (011), a TSD-007 e a TSD-010 e
o checkpoint.
Implemente só o escopo:
- npm i pdfkit ; npm i -D @types/pdfkit.
- relatorio-modelo.ts: montarModeloRelatorio(detalhe) puro; formatarNorma(norma);
  itens de cada área reordenados por requisito.ordem.
- relatorio.builder.ts: renderRelatorioPdf(modelo) => Promise<Buffer> com pdfkit
  (coleta chunks do stream); ROTULO_STATUS pt-BR; datas em America/Sao_Paulo.
- relatorio.service.ts: gerar(id) => abrir(id) (404) -> 409 se != CONCLUIDA ->
  { bytes, nomeArquivo: 'relatorio-analise-<id>.pdf' }.
- relatorio.controller.ts: GET /analises/:id/relatorio -> StreamableFile
  application/pdf, disposition inline.
- relatorio.module.ts: imports [AnalisesModule], controller + service.
NÃO persista o PDF, não inclua comentário do analista, não faça migration.
Rode npm run ci e npm run test:e2e; registre a saída. Atualize checkpoint e audit.
```
