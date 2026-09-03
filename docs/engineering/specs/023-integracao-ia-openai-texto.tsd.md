# TSD — Integração da IA real: entrada por texto extraído do PDF (follow-up da TSD-022, A-02, backend)

---
title: TSD - Integração da IA real por texto extraído (follow-up TSD-022, A-02, backend)
type: tsd
status: implementada
created: 02/09/2026 // Pablo Grisi (Engenheiro)
updated: 02/09/2026 // Pablo Grisi (Documentador — implementada na branch backend/ia-openai; aguardando merge + smoke real; CVE-2024-4367 aceita como dívida rastreada)
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/022-integracao-ia-openai.tsd.md
- docs/engineering/specs/006-processamento-analise.tsd.md
- docs/engineering/specs/009-pdf-por-pagina.tsd.md
- docs/product/questoes-abertas.md
---

## 1. Resumo

O `AnaliseIaOpenAiAdapter` da TSD-022 sobe o **PDF inteiro** via Files API em toda
chamada ao modelo. O smoke real de 02/09/2026 mostrou que isso não serve para
editais reais: um edital digital de **142 páginas / 13,8 MB** (texto nativo, não
escaneado) foi recusado pela OpenAI com `400 Your input exceeds the context window
of this model` e a análise terminou em `ERRO_PROCESSAMENTO`. Editais grandes são a
norma; além disso, mandar o binário a cada lote multiplica o custo em tokens.

Esta slice muda **apenas o interior do `AnaliseIaOpenAiAdapter`**: ele passa a
**extrair o texto do PDF por página** no servidor, montar um bloco com marcação
`=== Página N ===` e mandar esse **texto** ao modelo como `input_text` — sem subir
o binário nesse caminho. Quando o PDF não tiver texto aproveitável (ex.: puramente
escaneado), o adapter **cai automaticamente** no caminho atual (Files API +
`input_file` + `files.delete`) e ainda assim produz a análise.

**Nada muda no contrato da `AnaliseIaPort`, no worker `ProcessamentoService`, na
API HTTP, no schema Prisma ou na factory do `CoreModule`.** A saída continua
`SugestaoRequisito[]` (um por requisito, `statusSugerido` nos 3 valores,
`paginaReferencia` inteiro `≥ 1` ou ausente). O modelo padrão segue `gpt-4o` (já é
o default hoje — sem alteração de config).

**User Story de origem:** `docs/product/roadmap.md`, seção "Fora da tabela —
Integração da IA real (A-02)" → subseção **"Follow-up: entrada por texto extraído
(backend)"**, `Status: user story aprovada (usuário — 02/09/2026)`. Rodada de
perguntas registrada em `docs/perguntas-e-respostas.md`, "02/09/2026 — Follow-up
A-02 (entrada por texto extraído), Agente PM" (decisões P1–P4).

## 2. Objetivo técnico

- O `AnaliseIaOpenAiAdapter.analisar({ pdf, requisitos })` decide **uma vez por
  análise** entre dois caminhos:
  1. **Texto (primário):** extrai o texto do PDF **por página**, monta um bloco
     com marcadores `=== Página N ===` e chama `client.responses.create` com esse
     bloco + a lista de requisitos como `input_text`. **Não** há `files.create`
     nem `files.delete` neste caminho.
  2. **Arquivo (fallback):** quando o texto extraído for insuficiente (critério
     fixo — §2 abaixo e §9), executa exatamente o caminho da TSD-022
     (`files.create` `purpose: 'user_data'` → lotes com `input_file` →
     `files.delete` no `finally`), logando em nível `warn` o motivo do fallback.
- O `paginaReferencia` continua saindo: o modelo é instruído a devolver o número
  `N` do marcador `=== Página N ===` que precede a evidência; o mapeamento no
  adapter é o mesmo da TSD-022 (só aceita inteiro `≥ 1`).
- **Sem nova variável de ambiente.** O limiar do fallback é constante no arquivo
  do adapter (valores e justificativa em §9).
- **Sem mudança de modelo padrão:** `ia.modelo` já default `gpt-4o` em
  `configuration.ts` e `env.validation.ts` — confirmado, nada a alterar.
- Nova dependência de runtime: uma lib de extração de texto de PDF **por página**
  (recomendação e contingência em §9 — `unpdf`, com `pdfjs-dist@3` legacy/UMD como
  plano B se a toolchain ts-jest CJS recusar).

### Desenho do adapter (`src/core/adapters/analise-ia.openai-adapter.ts`)

Métodos privados novos / reorganização (nomes indicativos, o Dev ajusta):

- `private async extrairTextoPorPagina(pdf: Buffer): Promise<string[]>`
  - Usa a lib escolhida para devolver **um item por página**, na ordem do PDF.
  - **Best-effort**, no espírito do `contarPaginasPdf` (TSD-009): qualquer
    exceção (parse, lib, PDF protegido que passou pelo `/Encrypt` do upload) →
    retorna `[]`. Nunca lança.
- `private textoAproveitavel(paginas: string[]): boolean` — critério do fallback
  (§9): exige `≥ 1` página com texto **e** média de caracteres não-espaço por
  página `≥ 100`. `[]` → `false`.
- `private montarBlocoTexto(paginas: string[]): string` — concatena:
  ```
  === Página 1 ===
  <texto da página 1>

  === Página 2 ===
  <texto da página 2>
  ...
  ```
- `private async analisarPorTexto(blocoTexto, requisitos): Promise<SugestaoRequisito[]>`
  - Divide `requisitos` em lotes de `ia.maxRequisitosPorChamada` (igual à TSD-022).
  - Por lote: `responses.create` com
    `input: [{ role:'system', content: PROMPT_SISTEMA_TEXTO }, { role:'user', content: [{ type:'input_text', text: blocoTexto }, { type:'input_text', text: montarListaRequisitos(lote) }] }]`,
    `max_output_tokens` e `text.format` json_schema `strict` **idênticos** à
    TSD-022. Sem `files.*`.
- `private async analisarPorArquivo(pdf, requisitos): Promise<SugestaoRequisito[]>`
  - Exatamente o corpo atual do `analisar` da TSD-022 (`files.create` →
    `try { for … analisarLote } finally { files.delete().catch(warn) }`), com
    `PROMPT_SISTEMA_ARQUIVO` (= o `PROMPT_SISTEMA` atual, sem mudança de texto).
- `analisar({ pdf, requisitos })` novo corpo:
  ```
  const paginas = await this.extrairTextoPorPagina(pdf);
  if (this.textoAproveitavel(paginas)) {
    return this.analisarPorTexto(this.montarBlocoTexto(paginas), requisitos);
  }
  this.logger.warn(
    `Texto extraído insuficiente (${nPaginasComTexto} pág. com texto; ` +
    `média ${mediaCharsPorPagina} chars/pág.) — enviando o PDF via Files API (fallback)`,
  );
  return this.analisarPorArquivo(pdf, requisitos);
  ```
- O parse do `output_text`, o `extrairSugestoes`, o `Map` `codigo → requisitoId`,
  o descarte de `codigo`/`status` inválidos, o filtro de `paginaReferencia`
  (`Number.isInteger` e `≥ 1`) e o tratamento de `resposta.status === 'incomplete'`
  são **compartilhados** entre os dois caminhos (extrair para um helper
  `mapearResposta(resposta, requisitosDoLote)` para não duplicar).

### Prompts (constantes no arquivo do adapter)

`PROMPT_SISTEMA_ARQUIVO` — **inalterado** em relação à TSD-022 (é o caminho de
fallback, que recebe o PDF de fato):

```text
Você é um analista de conformidade de licitações públicas brasileiras (Lei nº 14.133/2021).
Recebe o PDF de um processo licitatório e uma lista de requisitos a verificar.
Para CADA requisito da lista, decida, com base APENAS no conteúdo do PDF:
- "CONFORME": o PDF atende ao requisito;
- "NAO_CONFORME": o PDF contraria ou não atende ao requisito;
- "NAO_SE_APLICA": o requisito não é pertinente a este processo.
Quando houver evidência clara numa página específica, informe "paginaReferencia" (número da página, começando em 1); senão, use null.
Responda SOMENTE no formato JSON pedido, com um item por requisito recebido.
```

`PROMPT_SISTEMA_TEXTO` — **novo**, pronto para colar (caminho primário):

```text
Você é um analista de conformidade de licitações públicas brasileiras (Lei nº 14.133/2021).
Recebe o TEXTO extraído de um processo licitatório e uma lista de requisitos a verificar.
O texto está dividido por marcadores de página no formato "=== Página N ===", onde N é o número da página no PDF original (começando em 1). Todo o conteúdo entre um marcador e o próximo pertence àquela página.
Para CADA requisito da lista, decida, com base APENAS no conteúdo do texto:
- "CONFORME": o texto atende ao requisito;
- "NAO_CONFORME": o texto contraria ou não atende ao requisito;
- "NAO_SE_APLICA": o requisito não é pertinente a este processo.
Quando a evidência estiver numa página específica, informe em "paginaReferencia" o número N do marcador "=== Página N ===" imediatamente anterior ao trecho que sustenta a conclusão; se não houver evidência localizável numa página, use null.
O texto pode conter ruído de extração (hifenização de fim de linha, ligaduras, ordem de colunas/tabelas imperfeita) — interprete com tolerância.
Responda SOMENTE no formato JSON pedido, com um item por requisito recebido.
```

`SCHEMA_SAIDA` — **inalterado** (`{ sugestoes: [{ codigo, statusSugerido, paginaReferencia }] }`, tudo `required`, `additionalProperties: false`).

## 3. Escopo

### Incluído

- Nova dep de runtime no `backend/package.json`: lib de extração de texto por
  página (`unpdf` recomendada — §9).
- Reescrita interna do `AnaliseIaOpenAiAdapter`: `extrairTextoPorPagina`,
  `textoAproveitavel`, `montarBlocoTexto`, `analisarPorTexto`, `analisarPorArquivo`
  (= comportamento TSD-022), `analisar` como despachante, helper `mapearResposta`
  compartilhado, `PROMPT_SISTEMA_TEXTO` novo, `PROMPT_SISTEMA_ARQUIVO` (= prompt
  atual).
- `backend/test/unit/analise-ia.openai-adapter.spec.ts` — estendido: lib de PDF
  **mockada**, casos de §7.1.
- Nota em `docs/engineering/specs/022-integracao-ia-openai.tsd.md` §9 apontando
  para esta TSD (a TSD-022 continua descrevendo o caminho de fallback).
- `docs/architecture/sdd.md` §4/§6/§8/§9 — de "manda o PDF" para "manda texto por
  página, com fallback para Files API".

### Fora do escopo

- **OCR** de PDF escaneado — o fallback manda o arquivo à OpenAI; não há OCR no
  servidor.
- Qualquer mudança em `analise-ia.port.ts`, `processamento.service.ts`,
  `core.module.ts`, `configuration.ts`, `env.validation.ts`, schema Prisma ou
  endpoints REST.
- **Nova variável de ambiente** — o limiar do fallback é constante (§9). Promover
  a env var é follow-up se ajuste em produção pedir.
- **Paralelizar** as chamadas ao modelo — os lotes de requisitos seguem
  sequenciais (igual TSD-022).
- **Otimizar o custo do texto repetido por lote** (§9, decisão 5) — cache de
  prompt, 1 chamada com todos os requisitos, batch API: fora do MVP.
- **Normalizar o texto extraído** (de-hifenização, remoção de cabeçalho/rodapé,
  reordenação de colunas) — enviado como a lib devolve.
- **Editais que excedem 128k tokens mesmo como texto** (200+ páginas muito
  densas) — o alvo desta slice é o caso de 142 páginas; truncar/particionar o
  documento fica como questão aberta (§9).
- **Smoke real com a `OPENAI_API_KEY`** — pendência pós-fechamento (§7.1, §9),
  por decisão do usuário (P4, 02/09/2026), igual à TSD-022.
- Frente frontend — nada muda (a tela já mostra `statusSugeridoIa` e
  `paginaReferencia`).

## 4. Contexto consultado

- `START_HERE.md`, `.ai-dev/context-map.md`, `docs/engineering/checkpoint.md`
- `.ai-dev/quality-gates.md` — tipos de teste e comandos reais do backend; regra
  "nenhuma TSD declara a integração real da IA coberta com base em stub"
- `docs/product/roadmap.md` — User Story do follow-up (Status `user story
  aprovada`), critérios de aceite, decisões 1–4 e "fora de escopo"
- `docs/perguntas-e-respostas.md` — rodada "02/09/2026 — Follow-up A-02 (entrada
  por texto extraído)", P1–P4
- `docs/engineering/specs/022-integracao-ia-openai.tsd.md` — adapter atual (§2,
  §7.1, §9 e §13/desvios); `IA_MAX_REQUISITOS_POR_CHAMADA` default 50; `openai@^5.23.2`
- `docs/engineering/specs/006-processamento-analise.tsd.md` — `ProcessamentoService`,
  `comTimeout(IA_TIMEOUT_MS)`, `ERRO_PROCESSAMENTO`, reprocessamento
- `docs/engineering/specs/009-pdf-por-pagina.tsd.md` — `contarPaginasPdf` com
  `pdf-lib` (best-effort, `null` sem lançar); `pdf-lib` **não** extrai texto
- `docs/architecture/sdd.md` — §3/§4 (IA como porta), §6, §8 (`AnaliseIaPort`
  forma estável), §9 (decisões + riscos "PDF grande estoura tempo/memória")
- `backend/src/core/adapters/analise-ia.openai-adapter.ts`,
  `backend/src/core/ports/analise-ia.port.ts`,
  `backend/src/config/configuration.ts`, `backend/src/config/env.validation.ts`,
  `backend/src/analises/contar-paginas-pdf.ts`,
  `backend/test/unit/analise-ia.openai-adapter.spec.ts`, `backend/package.json`
- Notas de fechamento do Crítico/Documentador do ciclo A-02 (`checkpoint.md`
  §3.1): atrito histórico ESM sob ts-jest CJS (`@nestjs/schedule`, `openai@7`)

## 5. Impacto esperado

- **Produto:** editais reais grandes (100+ páginas) passam a ser analisados até
  `PRONTA_PARA_REVISAO` em vez de `ERRO_PROCESSAMENTO`; custo por análise cai
  (texto no lugar do binário). PDFs escaneados continuam analisáveis pelo
  fallback. Fecha a lacuna que o smoke da TSD-022 expôs.
- **Arquitetura:** a `AnaliseIaPort` continua provando a decisão de portas — a
  mudança é 100% interna ao adapter. Primeiro uso de extração de texto de PDF
  fora do `contarPaginasPdf`.
- **Implementação:** 1 arquivo de adapter reescrito por dentro + 1 dep nova + 1
  spec estendido. Sem migration, sem mudança de contrato/config/wiring.
- **Testes:** unit do adapter com a lib de PDF mockada (caminho texto, caminho
  fallback, critério, mapeamento de página, chunking com texto repetido, erros já
  cobertos). Contrato e e2e rodam para não-regressão (stub). Smoke real =
  pendência pós-fechamento.
- **Operação:** a extração roda dentro de `analisar()`, portanto dentro do
  `comTimeout(IA_TIMEOUT_MS)` do worker (120s default). Extração de ~142 páginas
  costuma levar poucos segundos; para PDFs muito grandes pode ser preciso subir
  `IA_TIMEOUT_MS` — é config, não código (mesma nota da TSD-022 §9).
- **Documentação:** SDD §4/§6/§8/§9; TSD-022 §9 (ponteiro); `questoes-abertas.md`
  P-05 (a `paginaReferencia` agora vem do marcador de texto — o Documentador
  ajusta a nota no fechamento); checkpoint/roadmap/audit no fechamento.

## 6. Plano de implementação

1. `cd backend && npm i unpdf` (o Dev fixa a versão exata que passa no loop
   `typecheck` + `test`; se `require('unpdf')` não resolver sob o ts-jest/tsconfig
   atuais, usar a contingência da §9 — `pdfjs-dist@^3.11.174` build `legacy/build/pdf.js`
   — e registrar o desvio, como a TSD-022 §13 fez com `openai`).
2. `analise-ia.openai-adapter.ts`:
   - extrair o corpo atual do `analisar` para `analisarPorArquivo` (sem alterar
     comportamento) e renomear `PROMPT_SISTEMA` → `PROMPT_SISTEMA_ARQUIVO`;
   - extrair o parse+mapeamento+`incomplete` de `analisarLote` para
     `mapearResposta(resposta, requisitosDoLote)`;
   - adicionar `extrairTextoPorPagina`, `textoAproveitavel`, `montarBlocoTexto`,
     `analisarPorTexto` (usa `PROMPT_SISTEMA_TEXTO`);
   - novo corpo de `analisar` como despachante, com o `logger.warn` no fallback;
   - `PROMPT_SISTEMA_TEXTO` conforme §2.
3. `test/unit/analise-ia.openai-adapter.spec.ts` — `jest.mock` da lib de PDF;
   casos da §7.1. Manter os testes atuais passando (agora exercitando o caminho
   texto por padrão; os testes de erro/`incomplete`/JSON inválido migram para o
   caminho texto e ganham uma variante no caminho arquivo).
4. `npm run ci` + `npm run test:contract` + `npm run test:e2e` — registrar a saída
   real; devem seguir verdes, sem mudança de número no e2e (39/39).
5. Atualizar SDD §4/§6/§8/§9 e a nota da TSD-022 §9.
6. Deixar o roteiro de smoke real (§7.1) pronto para quando a chave estiver
   disponível; registrar como pendência em checkpoint/audit no fechamento.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário (lógica isolada, dependências mockadas) | **Sim** | Núcleo da slice. `test/unit/analise-ia.openai-adapter.spec.ts` com `jest.mock('openai')` (já existe) **+ `jest.mock` da lib de PDF**: (a) **caminho texto** — extração devolve 3 páginas com texto real → `responses.create` recebe `input_text` contendo `=== Página 1 ===` / `=== Página 2 ===` e a lista de requisitos, `system` = `PROMPT_SISTEMA_TEXTO`, e **`files.create` NÃO é chamado** (`files.delete` também não); (b) **caminho fallback** — extração devolve `['', '', '']` / `[]` / rejeita → `files.create` é chamado, `input_file` presente, `system` = `PROMPT_SISTEMA_ARQUIVO`, `logger.warn` emitido com o motivo; (c) **critério de fallback** — páginas com poucos caracteres (média < 100 não-espaço/página) → fallback; páginas densas → caminho texto; (d) **mapeamento de página** — modelo devolve `paginaReferencia: 2` (número do marcador) → sai `paginaReferencia: 2`; não-inteiro/≤0/`null` → omitido (regressão da TSD-022); (e) **chunking com texto repetido** — `requisitos.length > IA_MAX_REQUISITOS_POR_CHAMADA` no caminho texto → N chamadas a `responses.create`, o bloco `=== Página N ===` presente **em todas**, resultados concatenados na ordem, **zero `files.create`**; (f) erros já cobertos, agora no caminho texto — `output_text` não-JSON → erro claro; JSON sem `sugestoes` → erro claro; `status: 'incomplete'` → erro citando `IA_MAX_REQUISITOS_POR_CHAMADA`; SDK rejeita → propaga; (g) construtor ainda lança sem `OPENAI_API_KEY` (inalterado). |
| Integração (módulos/camadas reais, contra banco de teste) | **Não muda (rodar p/ não-regressão)** | `npm run test:e2e` roda com `IA_ADAPTER` ausente → `AnaliseIaStubAdapter`. Esta slice não toca no stub, no worker, na porta, no schema nem no HTTP. Rodar para garantir 39/39 inalterado. Não há como exercitar o adapter OpenAI em integração sem chave + rede — é smoke, não CI (regra do `quality-gates.md`). |
| Contrato (formato entre serviços que não sobem juntos) | **Não muda (rodar p/ não-regressão)** | `test/contract/analise-ia.contract.spec.ts` afere a **forma** da saída da `AnaliseIaPort` (todo `statusSugerido` nos 3 valores; todo `paginaReferencia` `undefined` ou inteiro `≥ 1`; `requisitoId` pertence à entrada) — hoje só contra o stub. A forma da saída do adapter OpenAI **não muda** nesta slice, então o teste não muda; rodar `npm run test:contract` (2/2) para não-regressão. A compatibilidade da forma do request de **texto** com a OpenAI real só se prova no smoke. |
| Smoke/validação manual contra dependência externa real | **Sim — pendência pós-fechamento** (decisão do usuário P4, 02/09/2026) | Com `IA_ADAPTER=openai` + `OPENAI_API_KEY` real + `IA_MODELO=gpt-4o` + `PROCESSAMENTO_AUTO=true` no `backend/.env`: (1) subir o backend, criar uma análise com **o mesmo edital de 142 páginas / 13,8 MB** do smoke de 02/09 → deve chegar a `PRONTA_PARA_REVISAO` sem `input exceeds the context window`, com sugestões que **não** são todas `NAO_SE_APLICA` e ao menos algumas com `paginaReferencia`; conferir no log que o caminho **texto** foi usado (sem `warn` de fallback). (2) Criar uma análise com um **PDF puramente escaneado** → conferir o `warn` de fallback e que a análise ainda produz resultado (do modelo, ou `ERRO_PROCESSAMENTO` legítimo — nunca falha só pela troca de caminho). Registrar ambos em `docs/engineering/checkpoint.md` e `.ai-dev/audit.md`. **Enquanto não roda, a feature fica "implementada, aguardando smoke real"** (§9). |

Pendência de teste em aberto (não é "não se aplica"): o smoke real acima depende
da `OPENAI_API_KEY` do responsável — registrada em §9 e no checkpoint no
fechamento, exatamente como a TSD-022 fez.

### 7.2 Comandos previstos

```text
cd backend
npm run lint
npm run typecheck
npm run prisma:validate
npm run test            # unit — inclui o spec estendido do adapter
npm run test:contract   # não-regressão da forma da AnaliseIaPort (stub) — 2/2
npm run test:e2e        # não-regressão com o stub — 39/39
npm run build
# npm run ci = lint + typecheck + prisma:validate + test + build
```

## 8. Critérios de aceite

- [x] `backend/package.json` ganha a lib de extração de texto por página (versão
      exata fixada pelo Dev); `require(...)`/`import` dela resolve sob o
      ts-jest/tsconfig atuais (senão: contingência §9, com desvio registrado).
      **Evidência:** `pdfjs-dist: "3.11.174"` (versão exata, sem `^`, runtime dep)
      importando `pdfjs-dist/legacy/build/pdf.js` (CJS) — **contingência da §9, plano B**;
      `unpdf`/pdfjs v4 são ESM-only e o `ts-jest` CJS aborta o `import()` dinâmico
      (mesmo atrito que barrou `openai@7` e `@nestjs/schedule`). Desvio 1 na §13.
      `npm run ci` (tsc + jest) verde com a lib mockada.
- [x] `analisar()` decide **uma vez por análise**: extrai texto por página; se
      aproveitável (critério §9) → manda **texto** com marcadores `=== Página N ===`
      como `input_text`, **sem** `files.create`/`files.delete`; senão → caminho
      Files API da TSD-022 **inalterado**, com `logger.warn` explicando o motivo.
      **Evidência:** `analise-ia.openai-adapter.ts` — `analisar()` despachante
      (`extrairTextoPorPagina` → `textoAproveitavel` → `analisarPorTexto` |
      `logger.warn` + `analisarPorArquivo`); `analise-ia.openai-adapter.spec.ts`
      casos (a) caminho texto sem `files.create` e (b) fallback com `warn` +
      `input_file` (21 casos, 10 → 21).
- [x] Caminho texto: `responses.create` recebe `PROMPT_SISTEMA_TEXTO` + bloco de
      texto + `montarListaRequisitos(lote)`; `text.format` json_schema `strict` e
      `max_output_tokens` idênticos à TSD-022; parse/`extrairSugestoes`/mapeamento
      `codigo → requisitoId`/filtro de `paginaReferencia` idênticos.
      **Evidência:** helper `mapearResposta()` compartilhado entre os dois
      caminhos; `SCHEMA_SAIDA` e `max_output_tokens` inalterados; spec caso (c).
- [x] `paginaReferencia` devolvido pelo modelo (número do marcador) chega na saída
      como inteiro `≥ 1` ou ausente — sem regressão vs. TSD-022.
      **Evidência:** spec caso (d) — `paginaReferencia: 2` → `2`; não-inteiro/≤0/`null` → omitido.
- [x] Lotes no caminho texto: `requisitos.length > IA_MAX_REQUISITOS_POR_CHAMADA`
      → várias chamadas a `responses.create`, bloco de texto repetido em cada,
      resultados concatenados na ordem, **nenhum** `files.create`.
      **Evidência:** spec caso (e) — chunking com o bloco `=== Página N ===` em
      todas as chamadas e zero `files.create`. Custo do texto repetido por lote
      registrado como não-bloqueador (desvio 5, §13).
- [x] Extração que lança ou devolve vazio/insuficiente → fallback Files API;
      `analisar()` nunca quebra por causa da extração.
      **Evidência:** `extrairTextoPorPagina` best-effort (erro/vazio → `[]`, nunca
      lança); spec caso (b) com extração que rejeita / devolve `['', '', '']` / `[]`.
- [x] `ia.modelo` segue `gpt-4o` por default — `configuration.ts` e
      `env.validation.ts` **sem alteração** (confirmado no código).
      **Evidência:** diff do ciclo não toca `configuration.ts` nem `env.validation.ts`.
- [x] Sem mudança em `analise-ia.port.ts`, `processamento.service.ts`,
      `core.module.ts`, schema Prisma, controllers, `.env.example`.
      **Evidência:** diff do commit `c781067` — só `analise-ia.openai-adapter.ts`,
      o spec, `package.json` e o lock.
- [x] **Sem** nova variável de ambiente. **Evidência:** limiar em constantes fixas
      no arquivo do adapter (`MIN_CHARS_PAGINA_COM_TEXTO=20`,
      `MIN_PAGINAS_COM_TEXTO=1`, `MIN_MEDIA_CHARS_POR_PAGINA=100`); `.env.example` intocado.
- [x] `npm run ci` verde; `npm run test:contract` 2/2; `npm run test:e2e` 39/39
      (com `IA_ADAPTER=stub` nada muda).
      **Evidência (gates reais — Executor de Testes):** `npm run ci` → exit 0
      (lint limpo, `tsc` limpo, `prisma validate` ok, **jest unit 138 passed /
      21 suites / 0 skipped**, `nest build` ok); `npm run test:contract` → 2/2
      (stub, inalterado); `npm run test:e2e` → 39/39 (não-regressão, `IA_ADAPTER`
      ausente → stub). `npm audit` (não é gate): `pdfjs-dist <=4.1.392` high
      (CVE-2024-4367) — ver desvio 2, §13.
- [x] SDD §4/§6/§8/§9 atualizados (texto por página + fallback); TSD-022 §9 com
      ponteiro para esta TSD. **Evidência:** feito no fechamento (Documentador,
      02/09/2026) — SDD §2/§4/§6/§8/§9 e `022-integracao-ia-openai.tsd.md` §9.

**Pendente — não bloqueia o fechamento do ciclo (decisão do usuário P4), bloqueia
o "pronto para produção":**

- [ ] **Smoke ponta-a-ponta com a `OPENAI_API_KEY` real** no edital de 142
      páginas + num PDF escaneado (§7.1, última linha). Registrar em
      checkpoint/audit. **Situação: implementada, aguardando smoke real** — a
      chave será fornecida pelo responsável; até lá o caminho texto vs. OpenAI
      real não está exercitado.

## 9. Riscos e decisões abertas

### Decisão 1 — lib de extração de texto por página

**Recomendada: `unpdf`** (mantida pelo grupo unjs; empacota um build serverless do
`pdfjs-dist`, sem worker/DOM para configurar; expõe `extractText(doc, { mergePages:
false }) → { totalPages, text: string[] }` — **texto por página**, que é o que os
marcadores `=== Página N ===` exigem; alvo declarado Node 18+, compatível com o
`engines.node >= 20` do backend; publica entrada CJS além de ESM). O Dev **fixa a
versão exata** que passa no loop `typecheck` + `test` e confirma que
`require('unpdf')` (ou `import` compilado para `require` pelo ts-jest) resolve.

**Contingência (plano B), se `unpdf` for ESM-only sob a toolchain atual:**
`pdfjs-dist@^3.11.174`, importando o build **`pdfjs-dist/legacy/build/pdf.js`**
(UMD/CommonJS, `require`-ável, **não** usa `Promise.withResolvers` — foi exatamente
o atrito ESM-sob-ts-jest-CJS que barrou `@nestjs/schedule` na TSD-006 e `openai@7`
na TSD-022). API: `getDocument({ data }).promise` → `pdf.numPages` →
`pdf.getPage(n)` → `page.getTextContent()` → juntar `items[].str`. Custo: pacote
maior; v3 sem features novas (ainda recebe correções). Registrar como desvio (como
a TSD-022 §13 fez).

**Descartada: `pdf-parse`** — entrega o texto do documento **inteiro** sem
fronteira de página confiável; sem os marcadores de página não há como preservar o
`paginaReferencia`. Não serve para esta slice.

### Decisão 2 — critério do fallback (valor fixo, sem env var)

O caminho de **texto** é usado quando **ambas** as condições valem sobre o
`string[]` extraído:

- **`≥ 1` página com texto** — uma página "tem texto" se, removidos os
  espaços (`\s`), sobram `≥ 20` caracteres; e
- **média de caracteres não-espaço por página `≥ 100`** (total de não-espaço ÷
  número de páginas do PDF).

Caso contrário (inclui extração que lançou ou devolveu `[]`) → **Files API**.

Racional dos números: uma página de edital digital real tem tipicamente
1.500–3.500 caracteres não-espaço; um PDF puramente escaneado rende 0 (ou um
punhado, de camada de texto acidental). O piso de 100/página é conservador —
nenhum edital digital real cai abaixo, e nenhum documento só-imagem chega perto.
Valores como constantes nomeadas no arquivo do adapter
(`MIN_CHARS_PAGINA_COM_TEXTO = 20`, `MIN_PAGINAS_COM_TEXTO = 1`,
`MIN_MEDIA_CHARS_POR_PAGINA = 100`). **Sem `IA_TEXTO_MIN_CHARS`** — um valor fixo
bem escolhido resolve o MVP; promover a env var é follow-up se o ajuste em
produção pedir (o smoke real com PDFs variados é quem valida o limiar — questão
aberta abaixo).

### Decisão 3 — fallback global à análise (não por lote)

O adapter decide o caminho **uma vez**, no início de `analisar()`, para a análise
inteira. Justificativa: (a) uma extração por análise, não por lote; (b) todos os
requisitos avaliados com a mesma forma de evidência e a mesma semântica de
`paginaReferencia`; (c) espelha o caminho de arquivo, que já sobe **um** `file_id`
e o reusa entre lotes (TSD-022); (d) mais simples de testar e de raciocinar. Um
fallback por lote não traria benefício (o texto ou é aproveitável para o documento
todo, ou não é) e abriria a porta para uma análise meio-texto-meio-arquivo.

### Decisão 5 — texto do PDF repetido em cada lote de requisitos

O bloco `=== Página N ===` entra como `input_text` em **cada** `responses.create`
(uma por lote de requisitos). Com a base placeholder de 12 requisitos e
`IA_MAX_REQUISITOS_POR_CHAMADA = 50`, é **uma** chamada — sem repetição. Quando a
base real de requisitos entrar (P-07, estimados ~300), serão ~6 lotes → o texto do
edital vai ~6 vezes. Para um edital de 142 páginas (~50k–100k tokens de texto) é
um multiplicador de custo real. **Aceitável no MVP** porque: (a) ainda muito mais
barato e, sobretudo, **dentro do limite de contexto** de cada chamada — que é a
falha que este ciclo corrige; o binário via Files API também repetia por lote na
TSD-022 e estourava o contexto; (b) otimização de custo (1 chamada com todos os
requisitos, prompt caching, batch API) está **explicitamente fora do escopo** da
User Story. Registrado como não-bloqueador e follow-up: **revisar a estratégia de
lote quando a base real de requisitos entrar** (já sinalizado nas notas da
TSD-022 sobre o teto de lote e o `IA_TIMEOUT_MS`).

### Outros riscos

- **Qualidade da extração** em PDFs com colunas, tabelas, cabeçalho/rodapé: a
  ordem do texto pode divergir da leitura humana e o modelo pode citar a página
  errada. Mitigação: `paginaReferencia` é aproximada e corrigível pelo analista
  (RF-014 entregou o editor inline). Sem meta de acurácia no MVP.
- **Lixo de extração** (ligaduras `ﬁ`, hifenização de fim de linha, espaçamento
  por posicionamento): enviado como está; o `PROMPT_SISTEMA_TEXTO` pede tolerância
  ao ruído. Normalização é follow-up se a qualidade pedir.
- **Texto parcial** (capa digital + miolo escaneado): pode passar no critério e
  mandar texto incompleto ao modelo. O critério por média de chars/página reduz o
  risco; caso real → ajustar o limiar (aí sim, considerar env var).
- **PDF protegido / sem permissão de extração**: `/Encrypt` já é recusado no
  upload (TSD-004); se ainda assim a extração falhar, o best-effort devolve `[]` e
  cai no fallback.
- **Ordem das páginas**: assume-se que a lib devolve as páginas na ordem do PDF
  (1..N) — verdadeiro para `unpdf`/`pdfjs`; o marcador `N` é `índice + 1`.
- **Latência da extração dentro do `comTimeout(IA_TIMEOUT_MS)`**: poucos segundos
  para ~142 páginas; PDFs muito grandes podem exigir subir `IA_TIMEOUT_MS` — é
  config, não código.
- **Sem mudança de porta/worker/schema/REST/config** → rollback isolado no
  adapter (§11).

### Questões em aberto

- **Editais que excedem 128k tokens mesmo como texto** (200+ páginas muito
  densas): fora do alvo desta slice (o caso concreto é o de 142 páginas). Se
  aparecer, as opções são truncar o texto, particionar o documento entre chamadas,
  ou usar um `IA_MODELO` de contexto maior. Não decidido aqui — registrar como
  follow-up de A-02 se ocorrer no smoke.
- **Valor definitivo do limiar de fallback**: só se valida com o smoke real e uma
  amostra de PDFs (digitais densos, digitais "magros", escaneados, híbridos). Até
  lá, o valor fixo conservador (§ Decisão 2) vale; a promoção a
  `IA_TEXTO_MIN_CHARS_POR_PAGINA` fica pré-aprovada como ajuste pequeno se o smoke
  mostrar necessidade.
- **`questoes-abertas.md` P-05** ("quando a ausência de `paginaReferencia` é
  válida"): esta slice muda a origem da página (marcador de texto em vez de
  leitura do PDF pelo modelo), mas não fecha a P-05 — segue parcial, confirma-se
  no smoke. O Documentador ajusta a nota no fechamento.

## 10. Referências visuais

Não se aplica — slice de backend, sem interface visível.

## 11. Rollback

A mudança é isolada no `AnaliseIaOpenAiAdapter` e numa dependência.

- **Reverter** o commit da slice → o adapter volta ao estado da TSD-022 (PDF
  inteiro via Files API); remover a lib de extração do `package.json`/lock;
  reverter o spec estendido e as notas de SDD/TSD-022. Nada de banco, config,
  contrato ou wiring.
- **Contorno rápido sem reverter tudo** (se só o caminho de texto der problema
  depois do merge): fazer `textoAproveitavel()` retornar sempre `false` — restaura
  exatamente o comportamento da TSD-022. É medida temporária: o edital grande
  volta a falhar por contexto até o revert/fix real.
- `IA_ADAPTER=stub` (default) continua desligando o adapter por completo — nenhum
  ambiente que não optou pelo `openai` é afetado.
- `IA_MODELO` segue configurável — trocar o modelo é operação, não deploy.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (023), a TSD-022, a TSD-006 e
o checkpoint de engenharia. Implemente apenas o escopo desta TSD, em backend/, na
branch backend/ia-openai (empilhado sobre a TSD-022 — não faça merge sem
instrução). Não expanda escopo silenciosamente.

1. cd backend && npm i unpdf (fixe a versão exata que passa em `npm run typecheck`
   e `npm run test`). Se `require('unpdf')` não resolver sob o ts-jest/tsconfig
   atuais, use pdfjs-dist@^3.11.174 pelo build legacy/build/pdf.js (CommonJS) e
   registre o desvio nesta TSD (§13, no padrão da TSD-022).

2. Reescreva analise-ia.openai-adapter.ts por dentro, sem tocar na assinatura do
   construtor nem no que analisar() devolve:
   - extraia o corpo atual de analisar() para analisarPorArquivo() (comportamento
     idêntico) e renomeie PROMPT_SISTEMA -> PROMPT_SISTEMA_ARQUIVO;
   - extraia o parse + mapeamento + tratamento de status 'incomplete' de
     analisarLote() para um helper mapearResposta(resposta, requisitosDoLote);
   - adicione extrairTextoPorPagina(pdf) -> Promise<string[]> (best-effort: erro
     ou vazio -> [], nunca lança), textoAproveitavel(paginas) (>=1 página com >=20
     chars não-espaço E média >=100 chars não-espaço/página), montarBlocoTexto()
     ("=== Página N ===\n<texto>\n\n" por página), analisarPorTexto() (lotes por
     IA_MAX_REQUISITOS_POR_CHAMADA; por lote responses.create com
     PROMPT_SISTEMA_TEXTO + input_text do bloco + input_text da lista; sem
     files.*);
   - analisar() vira despachante: extrai; se aproveitável -> analisarPorTexto;
     senão logger.warn(motivo com nº de páginas com texto e média) e
     analisarPorArquivo;
   - PROMPT_SISTEMA_TEXTO conforme a §2 desta TSD (colar literal). SCHEMA_SAIDA e
     max_output_tokens inalterados.

3. Estenda test/unit/analise-ia.openai-adapter.spec.ts: jest.mock da lib de PDF;
   casos (a)-(g) da §7.1 (caminho texto sem files.create; fallback com warn e
   input_file; critério de fallback no limiar; paginaReferencia do marcador;
   chunking com texto repetido e zero files.create; erros JSON/incomplete/SDK no
   caminho texto; construtor sem OPENAI_API_KEY). Mantenha os testes atuais
   passando.

4. NÃO altere analise-ia.port.ts, processamento.service.ts, core.module.ts,
   configuration.ts, env.validation.ts, schema Prisma, controllers, .env.example.
   NÃO adicione env var.

5. Rode e cole a saída real: npm run ci, npm run test:contract, npm run test:e2e
   (esperado: ci verde; contract 2/2; e2e 39/39 — sem mudança). NÃO rode chamada
   real à OpenAI (sem chave).

6. Atualize SDD §4/§6/§8/§9 ("manda o PDF" -> "manda texto por página, com
   fallback para Files API") e a nota da TSD-022 §9 (ponteiro para a TSD-023).
   Atualize checkpoint e .ai-dev/audit.md, deixando o smoke real registrado como
   pendência pós-fechamento. Marque um critério de aceite como concluído só com
   evidência real.
```

## 13. Nota de fechamento (Documentador — 02/09/2026)

Ciclo TSD-023 (follow-up da TSD-022, A-02, frente backend) percorreu os 6 papéis
na branch `backend/ia-openai`, commit `c781067` — **empilhado sobre a TSD-022, que
ainda não foi mergeada: as duas entram juntas na `main`**. Crítico **aprovou
(condicional)**, sem bloqueadores de Dev; o usuário aprovou aceitar a
CVE-2024-4367 como dívida de segurança rastreada (02/09/2026).

Gates reais (Executor de Testes): `npm run ci` → **exit 0** (lint limpo, `tsc`
limpo, `prisma validate` ok, **jest unit 138 passed / 21 suites / 0 skipped**,
`nest build` ok); `npm run test:contract` → **2/2** (stub, inalterado);
`npm run test:e2e` → **39/39** (não-regressão, `IA_ADAPTER` ausente → stub). O
worker `ProcessamentoService`, a porta `AnaliseIaPort`, `configuration.ts`,
`env.validation.ts`, o schema Prisma, os controllers e o `.env.example` **não
foram tocados** — a mudança é 100% interna ao `AnaliseIaOpenAiAdapter`.

Arquivos entregues: `backend/src/core/adapters/analise-ia.openai-adapter.ts`
(`analisar()` vira despachante: caminho texto primário via
`extrairTextoPorPagina` + `analisarPorTexto`; caminho arquivo — corpo da TSD-022
extraído para `analisarPorArquivo`/`analisarLotePorArquivo`, inalterado — como
fallback global 1×/análise; helper `mapearResposta()` compartilhado; dois prompts
`PROMPT_SISTEMA_ARQUIVO` (= TSD-022 verbatim) e `PROMPT_SISTEMA_TEXTO` novo);
`backend/test/unit/analise-ia.openai-adapter.spec.ts` (10 → 21 casos,
`pdfjs-dist/legacy/build/pdf.js` mockado); `backend/package.json` + lock
(`pdfjs-dist: "3.11.174"`).

### Desvio 1 — lib = plano B `pdfjs-dist` `3.11.174` (build `legacy/build/pdf.js`, CJS)

A §9 recomendava `unpdf`. Instalado o **plano B da própria §9**: `pdfjs-dist`
versão exata `3.11.174` (runtime dep, sem `^`), importando
`pdfjs-dist/legacy/build/pdf.js` (UMD/CommonJS, `require`-ável, não usa
`Promise.withResolvers`). Motivo: `unpdf` e `pdfjs-dist` v4+ são **ESM-only** e o
`ts-jest` CJS do backend aborta o `import()` dinâmico dessas libs — o mesmo atrito
que barrou `openai@7` (TSD-022 §13) e `@nestjs/schedule` (TSD-006). **Desvio
pré-autorizado pela §9** ("`pdfjs-dist@^3.11.174` legacy/build/pdf.js ... se a
toolchain atual recusar; registrar como desvio"). API usada:
`getDocument({ data, ... }).promise` → `pdf.numPages` → `pdf.getPage(n)` →
`page.getTextContent()` → juntar `items[].str`, best-effort (erro/vazio → `[]`,
nunca lança).

### Desvio 2 — CVE-2024-4367 (`pdfjs-dist` v3, high) — dívida de segurança rastreada

`npm audit` (não é gate) passou a acusar 6 vulnerabilidades; a **introduzida e
instalada por esta TSD** é `pdfjs-dist <=4.1.392` **high — CVE-2024-4367**
(execução de código arbitrário via campo de fonte malicioso quando o PDF é
renderizado com `isEvalSupported` habilitado). As transitivas `tar` (critical) e
`@mapbox/node-pre-gyp` (high) são deps **opcionais de `canvas`, NÃO instaladas**
(só constam no lockfile); `deepmerge-ts`/`prisma` high já existiam antes.

**Mitigação aplicada** no `getDocument`: `isEvalSupported: false`,
`disableFontFace: true`, `useSystemFonts: false`, `verbosity: 0`. Somado a: o
adapter **só extrai texto, nunca rasteriza/renderiza** (`canvas` não é usado); o
PDF vem do **upload do próprio analista** (MVP single-analyst); `/Encrypt` já é
recusado no upload (TSD-004); uso 100% server-side.

**Threat model aceito** (usuário, 02/09/2026): uso server-side, PDF de origem
confiável (o próprio analista), sem rendering, `/Encrypt` recusado no upload — a
superfície real da CVE (renderização de fonte com `eval`) não é exercida.

**Decisão do usuário (02/09/2026): aceitar como dívida de segurança rastreada.**
**Follow-up obrigatório:** migrar para `pdfjs-dist` v4+ / `unpdf` quando a config
de testes do backend for para ESM (hoje `ts-jest` CJS aborta o `import()`
dinâmico dessas libs); ao fechar essa migração, **re-rodar `npm audit`** e
confirmar que a CVE saiu. Registrado em `docs/product/questoes-abertas.md`
(dívida de segurança) e no checkpoint/roadmap/audit.

### Desvios 3–6 — não-bloqueadores

3. **Transitivas opcionais de `canvas` não instaladas.** `tar` (critical) /
   `@mapbox/node-pre-gyp` (high) aparecem no `npm audit` como dependentes de
   `pdfjs-dist`, mas são deps **opcionais de `canvas`** e **não estão em
   `node_modules`** — só no lockfile. Sem impacto de runtime. Somem quando a
   migração do desvio 2 acontecer.
4. **Ruído `Cannot polyfill DOMMatrix/Path2D ... Cannot find module 'canvas'`.**
   Warning novo, só no `test:e2e`, emitido via `console.log` no load do
   `pdfjs-dist` legacy. Inócuo: `canvas` serve para rasterizar; o adapter só
   extrai texto. Não altera nenhum resultado de teste (e2e segue 39/39).
5. **Texto do PDF repetido por lote de requisitos.** O bloco `=== Página N ===`
   entra como `input_text` em **cada** `responses.create` (uma por lote de
   `IA_MAX_REQUISITOS_POR_CHAMADA`). Com os 12 requisitos placeholder é 1 chamada;
   com a base real (P-07, ~300) serão ~6 lotes → o texto do edital vai ~6×. É
   custo, não estouro de contexto (a falha que este ciclo corrige). Otimização
   (1 chamada, prompt caching, batch API) está fora do escopo da User Story.
   Follow-up: revisar a estratégia de lote quando a base real entrar.
6. **Duplicação deliberada `estatisticasTexto()` (média arredondada, para o log
   do `warn`) vs. `textoAproveitavel()` (média crua, para o limiar).** Efeito
   colateral aceito: ao cair no fallback num caso de fronteira, o `warn` pode
   dizer "média 100 chars/pág." e ainda assim ter caído para Files API (a média
   crua ficou logo abaixo de 100). Só afeta a mensagem de log, não a decisão.
