# TSD — Integração da IA real: adaptador OpenAI para a `AnaliseIaPort` (A-02, backend)

---
title: TSD - Integração da IA real (adaptador OpenAI, A-02, backend)
type: tsd
status: em aprovação
created: 02/09/2026 // Pablo Grisi (Engenheiro)
updated: 02/09/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/001-fundacao-tecnica.tsd.md
- docs/engineering/specs/006-processamento-analise.tsd.md
- docs/product/questoes-abertas.md
---

## 1. Resumo

Substitui o `AnaliseIaStubAdapter` (que sugere `NAO_SE_APLICA` para todo requisito)
por um **adaptador que chama a API da OpenAI (GPT)** — mandando o PDF do processo e
a lista de requisitos, e recebendo, por requisito, a sugestão de conformidade
(`CONFORME` | `NAO_CONFORME` | `NAO_SE_APLICA`) e, quando o modelo indicar, a
página do PDF que a sustenta.

**Nada muda no worker, na `AnaliseIaPort`, no schema Prisma ou nos endpoints.** O
`ProcessamentoService` (TSD-006) já chama `analisar({ pdf, requisitos[] })` com
timeout, grava uma `AvaliacaoRequisito` por requisito (sugestão ausente →
`NAO_SE_APLICA`) e transiciona para `ERRO_PROCESSAMENTO` em qualquer falha. Esta
TSD só entrega **um novo adapter concreto** e a sua seleção por configuração.

Fecha **A-02**: o projeto **aciona** um serviço externo (não consome um resultado
pronto); contrato de entrada = PDF + requisitos; saída = `SugestaoRequisito[]`;
auth por `OPENAI_API_KEY`; timeout pelo `comTimeout` já existente.

**User Story de origem:** `docs/product/roadmap.md`, seção "Fora da tabela —
Integração da IA real (A-02)", User Story e decisões aprovadas em 02/09/2026.

## 2. Objetivo técnico

- Nova dependência: `openai` (SDK oficial Node).
- **`src/core/adapters/analise-ia.openai-adapter.ts`** (novo) — `AnaliseIaOpenAiAdapter implements AnaliseIaPort`:
  - Construtor recebe `ConfigService`. Lê `ia.openaiApiKey` — se vazia, **lança**
    `Error('IA_ADAPTER=openai exige OPENAI_API_KEY')` (o boot falha com mensagem
    clara). Lê `ia.modelo`, `ia.baseUrl` (opcional), `ia.maxRequisitosPorChamada`.
    Instancia `new OpenAI({ apiKey, baseURL: ia.baseUrl || undefined })`.
  - `async analisar({ pdf, requisitos }): Promise<SugestaoRequisito[]>`:
    1. **Upload do PDF** — `const arquivo = await client.files.create({ file: await toFile(pdf, 'analise.pdf', { type: 'application/pdf' }), purpose: 'user_data' })`.
    2. `try { … } finally { await client.files.del(arquivo.id).catch(() => {}) }`
       — o PDF **não fica retido** na OpenAI depois da análise.
    3. Divide `requisitos` em lotes de até `ia.maxRequisitosPorChamada` (default
       200). Para cada lote: `analisarLote(arquivo.id, lote)`. Concatena os
       resultados. (Um lote só na base placeholder de 12; a divisão cobre a base
       real — P-07 — sem retrabalho.)
  - `private async analisarLote(fileId, requisitos): Promise<SugestaoRequisito[]>`:
    - `resp = await client.responses.create({ model: ia.modelo, input: [{ role: 'system', content: PROMPT_SISTEMA }, { role: 'user', content: [{ type: 'input_file', file_id: fileId }, { type: 'input_text', text: montarListaRequisitos(requisitos) }] }], text: { format: { type: 'json_schema', name: 'sugestoes_requisitos', strict: true, schema: SCHEMA_SAIDA } } })`.
    - `const bruto = JSON.parse(resp.output_text)` — espera `{ sugestoes: [{ codigo, statusSugerido, paginaReferencia }] }`. JSON inválido / fora do schema → `Error('resposta da IA fora do formato esperado')`.
    - Mapeia `codigo → requisitoId` (Map do lote). Descarta entradas com `codigo`
      desconhecido ou `statusSugerido` fora dos 3 valores. `paginaReferencia`:
      inteiro `≥ 1` → inclui; senão omite.
  - `PROMPT_SISTEMA` (constante): papel = "analista de conformidade de licitação
    pública brasileira (Lei 14.133/2021)"; para **cada** requisito da lista,
    decidir `CONFORME` / `NAO_CONFORME` / `NAO_SE_APLICA` com base **apenas** no
    conteúdo do PDF; devolver `paginaReferencia` (1-based) só quando houver
    evidência clara numa página; responder **somente** no schema pedido.
  - `SCHEMA_SAIDA` (JSON Schema, `strict`): `{ type: 'object', properties: { sugestoes: { type: 'array', items: { type: 'object', properties: { codigo: {type:'string'}, statusSugerido: {enum: [...3]}, paginaReferencia: {type:['integer','null']} }, required: ['codigo','statusSugerido','paginaReferencia'], additionalProperties: false } } }, required: ['sugestoes'], additionalProperties: false }`.
- **`src/config/configuration.ts`** — bloco `ia` passa a:
  `{ adapter: 'stub' | 'openai'; modelo: string; openaiApiKey: string; baseUrl: string; maxRequisitosPorChamada: number }`.
- **`src/config/env.validation.ts`**:
  - `IA_ADAPTER` → allowlist `'stub' | 'openai'` (default `'stub'`). `'http'` →
    erro `IA_ADAPTER "http" foi substituído por "openai"`.
  - `OPENAI_API_KEY` — **obrigatória sse `IA_ADAPTER=openai`**.
  - `IA_MODELO` — default `'gpt-4o'`.
  - `IA_BASE_URL` — opcional (string; sem validação de URL no MVP).
  - `IA_MAX_REQUISITOS_POR_CHAMADA` — inteiro positivo, default `200`.
- **`src/core/core.module.ts`** — o `analiseIaProvider.useFactory`:
  `if (adapter === 'openai') return new AnaliseIaOpenAiAdapter(config);` senão o
  stub. O `AnaliseIaOpenAiAdapter` **não** entra em `providers[]` (evita
  construção ansiosa sem a chave quando `IA_ADAPTER=stub`).
- **`backend/.env.example`** — documenta `IA_ADAPTER`, `OPENAI_API_KEY`,
  `IA_MODELO`, `IA_BASE_URL`, `IA_MAX_REQUISITOS_POR_CHAMADA`.
- **Testes** (ver §7).

## 3. Escopo

### Incluído

- `openai` no `package.json` (runtime).
- `AnaliseIaOpenAiAdapter` + a constante do prompt e do schema.
- Ajustes de `configuration.ts` / `env.validation.ts` / `core.module.ts` /
  `.env.example`.
- `test/unit/analise-ia.openai-adapter.spec.ts` — SDK `openai` **mockado**.
- `test/contract/analise-ia.contract-spec.ts` — contrato da `AnaliseIaPort`
  exercitado contra o `AnaliseIaStubAdapter` (forma de saída que o worker exige).
- `test/unit/env.validation.spec.ts` — casos novos de `IA_ADAPTER=openai`.

### Fora do escopo

- **Chave real / chamada real ao serviço.** Depende da `OPENAI_API_KEY` do
  responsável — validação ponta a ponta fica como **smoke manual** (§7.1).
- **Azure OpenAI completo** (URL com deployment/`api-version`, auth Entra). Só
  `IA_BASE_URL` para proxy. Follow-up se o órgão exigir.
- **`RequisitoParaIa` ganhar `norma`/`obrigatorio`.** Mudaria a porta e o worker;
  o adapter usa `codigo`/`titulo`/`descricao` que já vêm. Follow-up se a qualidade
  pedir.
- **Retry/backoff próprio.** O SDK `openai` já retenta (429/5xx/rede) 2×; o worker
  já tem timeout e caminho de `ERRO_PROCESSAMENTO` + reprocessamento manual.
- **Custo/estimativa de tokens, cache, batch API.** Fora do MVP.
- **Persistir a justificativa em texto que o modelo produziu.** Só o
  `statusSugerido` + `paginaReferencia` entram (é o que a `SugestaoRequisito` e o
  schema suportam).
- Frente frontend (nada muda — a tela já mostra `statusSugeridoIa`).

## 4. Contexto consultado

- `docs/product/prd.md` — RF-005/RF-007 (worker + sugestão por requisito), §11
  ("consome ou aciona" a capacidade de IA), §9 (erro de processamento)
- `docs/architecture/sdd.md` — §8 (`AnaliseIaPort` — forma estável, adapter real
  mapeia p/ o contrato externo, alvo de teste de contrato), §9 (adiar IA real)
- `docs/product/questoes-abertas.md` — **A-02** (contrato da IA), A-06/A-07
- `docs/engineering/specs/006-processamento-analise.tsd.md` — `ProcessamentoService`,
  `comTimeout`, claim atômico, gravação transacional, `ERRO_PROCESSAMENTO`
- `docs/engineering/specs/001-fundacao-tecnica.tsd.md` — `CoreModule`, seleção do
  adapter por `IA_ADAPTER`, `test:contract` previsto para a `AnaliseIaPort`
- `backend/src/core/ports/analise-ia.port.ts` — `AnalisarInput`, `RequisitoParaIa`
  (`requisitoId`/`codigo`/`titulo`/`descricao`), `SugestaoRequisito`
  (`requisitoId`/`statusSugerido`/`paginaReferencia?`)
- SDK: `openai` (Node) — `client.files.create({ purpose: 'user_data' })`,
  `client.files.del`, `toFile`, `client.responses.create` com `text.format`
  `json_schema` (`strict`), `resp.output_text`

## 5. Impacto esperado

- **Produto:** a tela de revisão passa a abrir com um parecer inicial de verdade
  (com taxa de erro real — o analista revisa como já faz). Fecha o fluxo do MVP.
- **Arquitetura:** primeiro adapter concreto de serviço externo do projeto; A-02
  respondida no código. A `AnaliseIaPort` e o worker validam a decisão de portas
  (troca de adapter sem tocar no núcleo).
- **Implementação:** 1 arquivo de adapter + 4 ajustes de config/wiring + 1 dep.
  Sem migration, sem mudança de contrato REST.
- **Testes:** unit do adapter (SDK mockado — request, parse, mapeamento, lotes,
  erros, delete do arquivo); contrato da porta; env novos. Ponta a ponta real =
  smoke manual com a chave.
- **Documentação:** SDD §8/§9 (adapter real da `AnaliseIaPort`);
  `questoes-abertas.md` **A-02 → fechada**; checkpoint, audit, roadmap.

## 6. Plano de implementação

1. `npm i openai` no `backend/`.
2. `configuration.ts` + `env.validation.ts` (novos env) + `env.validation.spec.ts`.
3. `analise-ia.openai-adapter.ts` (prompt, schema, upload+delete, lotes, mapeamento).
4. `core.module.ts` — factory seleciona o openai.
5. `test/unit/analise-ia.openai-adapter.spec.ts` (SDK mockado).
6. `test/contract/analise-ia.contract-spec.ts`.
7. `.env.example`.
8. `npm run ci` + `npm run test:contract` + `npm run test:e2e` (com `IA_ADAPTER`
   ausente → stub; a bateria não deve mudar de resultado).

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | **`AnaliseIaOpenAiAdapter`** com `jest.mock('openai')`: (a) monta o `responses.create` com `input_file` do `file_id` retornado pelo `files.create` + o texto da lista de requisitos, e `text.format` json_schema `strict`; (b) parseia `{ sugestoes: [...] }` do `output_text` e devolve `SugestaoRequisito[]` mapeado por `codigo → requisitoId`; (c) `codigo` desconhecido → descartado; `statusSugerido` fora dos 3 → descartado; `paginaReferencia` não-inteiro/≤0/`null` → omitido; (d) `requisitos.length > maxRequisitosPorChamada` → 2 chamadas a `responses.create`, resultados concatenados, **um único** `files.create`/`files.del`; (e) `files.del` é chamado no `finally` mesmo quando `responses.create` rejeita; (f) erro do SDK (rede/4xx) → propaga; (g) `output_text` não-JSON → `Error` claro. **`env.validation`**: `IA_ADAPTER=openai` sem `OPENAI_API_KEY` → lança; com a chave → ok; `IA_ADAPTER=http` → erro citando `openai`; `IA_MAX_REQUISITOS_POR_CHAMADA` não-inteiro → lança; defaults (`gpt-4o`, 200). |
| Contrato (forma entre serviços) | Sim | `test/contract/analise-ia.contract-spec.ts`: para uma `AnaliseIaPort`, `analisar({ pdf, requisitos })` devolve um array onde todo `statusSugerido ∈ {CONFORME, NAO_CONFORME, NAO_SE_APLICA}` e todo `paginaReferencia` é `undefined` ou inteiro `≥ 1`; `requisitoId` de cada item pertence à entrada. Exercitado contra o `AnaliseIaStubAdapter`. (O adapter OpenAI real precisa de chave + rede → smoke, não CI.) |
| Integração (app real + Postgres) | Não muda | O `test:e2e` roda com `IA_ADAPTER` ausente (→ stub, `PROCESSAMENTO_AUTO=false`); esta TSD não altera o comportamento com stub. Rodar para garantir **não-regressão**. |
| Smoke/validação manual contra dependência externa real | **Sim (pendente da chave)** | Com `OPENAI_API_KEY` + `IA_ADAPTER=openai` + `PROCESSAMENTO_AUTO=true` no `backend/.env`, subir o backend local, criar uma análise com um PDF de licitação de exemplo, e conferir na tela que as sugestões vieram do GPT (não todas `NAO_SE_APLICA`) e que ao menos algumas trazem `paginaReferencia`. Registrar o resultado no checkpoint/audit. |

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run prisma:validate
npm run test
npm run test:contract
npm run test:e2e
npm run build
```

## 8. Critérios de aceite

- [ ] `npm i openai`; `AnaliseIaOpenAiAdapter implements AnaliseIaPort` existe.
- [ ] `IA_ADAPTER` ausente ou `stub` → `CoreModule` injeta o stub; toda a bateria
      atual (`npm run ci`, `test:e2e`, `test:contract`) segue verde, sem mudança de
      resultado.
- [ ] `IA_ADAPTER=openai` **sem** `OPENAI_API_KEY` → boot falha com mensagem clara.
- [ ] `IA_ADAPTER=openai` **com** `OPENAI_API_KEY` → `CoreModule` injeta o
      `AnaliseIaOpenAiAdapter`.
- [ ] O adapter faz upload do PDF (`purpose: "user_data"`), referencia por
      `file_id` no `responses.create` com saída `json_schema` `strict`, e **deleta
      o arquivo** ao fim (inclusive em erro).
- [ ] `analisar` devolve `SugestaoRequisito[]` com `statusSugerido` sempre nos 3
      valores e `paginaReferencia` inteiro `≥ 1` ou ausente; entradas com `codigo`
      desconhecido ou status inválido são descartadas.
- [ ] `requisitos.length > IA_MAX_REQUISITOS_POR_CHAMADA` → o adapter divide em
      lotes contra o mesmo arquivo e junta os resultados.
- [ ] Erro/timeout do serviço → exceção propagada (o worker marca
      `ERRO_PROCESSAMENTO`).
- [ ] `questoes-abertas.md` A-02 marcada como resolvida; SDD §8/§9 atualizados.
- [ ] `npm run ci` + `npm run test:contract` + `npm run test:e2e` verdes.

## 9. Riscos e decisões abertas

- **Qualidade da sugestão** é do modelo, não do código. `gpt-4o` erra; a base de
  requisitos ainda é o placeholder de 12 (P-07). O produto trata a saída como
  sugestão (o humano revisa, R-06). Sem meta de acurácia no MVP.
- **`paginaReferencia` do GPT é aproximada** — o schema permite `null`; o adapter
  só aceita inteiro `≥ 1`. Página errada é corrigível pelo analista (RF-014 fez o
  editor).
- **Custo real por análise:** 1 chamada com o PDF inteiro (dezenas a centenas de
  milhares de tokens) + a lista. Não medido no ciclo; o responsável liga o
  `openai` sabendo que gasta. `IA_MAX_REQUISITOS_POR_CHAMADA` alto evita
  multiplicar o custo do PDF por lote na base pequena.
- **Retenção na OpenAI:** o `finally` deleta o arquivo; se o `del` falhar (rede),
  o arquivo expira sozinho pela política da conta. Aceitável.
- **`purpose: "user_data"` e a Responses API** podem mudar de forma no SDK — o Dev
  confere contra a versão instalada de `openai` (loop de compilação). Se a
  Responses API não estiver disponível na versão, cair para `chat.completions`
  com `response_format` `json_schema` + `content` de tipo `file`.
- **Timeout:** o SDK tem timeout próprio (10 min default) e o worker envolve em
  `comTimeout(IA_TIMEOUT_MS)` (120s default) — o menor vence. Pode ser preciso
  subir o `IA_TIMEOUT_MS` para PDFs grandes; é config, não código.
- **Sem mudança de porta/worker/schema/REST.** Rollback = tirar `openai`, o
  adapter e os ajustes de config; `IA_ADAPTER` volta a `'stub'|'http'`.

## 10. Referências visuais

Não se aplica — slice de backend.

## 11. Rollback

Remover `src/core/adapters/analise-ia.openai-adapter.ts`, o branch `openai` da
factory do `CoreModule`, os env novos de `configuration.ts`/`env.validation.ts`, a
dependência `openai`, e os testes desta TSD. Nada de banco. `IA_ADAPTER` volta ao
par `'stub' | 'http'` (com o `http` lançando "não implementado").

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (022), a TSD-006 e o
checkpoint. Implemente só o escopo, em backend/, na branch backend/ia-openai. Não
faça merge sem instrução.

npm i openai.
configuration.ts: bloco ia = { adapter: 'stub'|'openai', modelo, openaiApiKey,
baseUrl, maxRequisitosPorChamada }.
env.validation.ts: IA_ADAPTER allowlist 'stub'|'openai' (http -> erro citando
openai); OPENAI_API_KEY obrigatória sse IA_ADAPTER=openai; IA_MODELO default
'gpt-4o'; IA_BASE_URL opcional; IA_MAX_REQUISITOS_POR_CHAMADA inteiro>0 default 200.
analise-ia.openai-adapter.ts: AnaliseIaOpenAiAdapter implements AnaliseIaPort;
construtor valida a chave (lança se faltar) e cria new OpenAI({ apiKey, baseURL });
analisar() faz files.create(purpose 'user_data') -> try/finally files.del ->
divide requisitos em lotes de maxRequisitosPorChamada -> por lote responses.create
com input_file + lista de requisitos + text.format json_schema strict -> parseia
{ sugestoes: [...] } do output_text -> mapeia codigo->requisitoId, descarta
desconhecido/inválido, paginaReferencia só inteiro>=1. Se a Responses API não
existir na versão instalada, usar chat.completions + response_format json_schema.
core.module.ts: factory -> if adapter==='openai' return new
AnaliseIaOpenAiAdapter(config); NÃO põe o adapter em providers[].
.env.example: documenta os env novos.

Testes: unit do adapter com jest.mock('openai') (request, parse, mapeamento,
lotes, files.del no finally mesmo em erro, erro do SDK propaga, JSON inválido);
test/contract/analise-ia.contract-spec.ts (forma da saída contra o stub);
env.validation.spec.ts (casos openai). Rode npm run ci, npm run test:contract e
npm run test:e2e; registre a saída real. NÃO rode chamada real à OpenAI (sem
chave). Atualize SDD §8/§9, questoes-abertas.md (A-02 resolvida), checkpoint,
audit. Deixe pronto para o smoke manual quando a chave chegar.
```
