# Roadmap - LicIA Analisadora

---

title: Roadmap - LicIA Analisadora
type: roadmap
status: living
created: 31/08/2026 // Pablo Grisi
updated: 31/08/2026 // Pablo Grisi
related (internal files):

- docs/product/prd.md
- docs/engineering/checkpoint.md

---

Este arquivo combina duas coisas de propósito:

- **As tabelas de sequenciamento abaixo** são o roadmap leve — sequência e status de todas as features do PRD. Geradas de uma vez, ao final da Etapa 6 do bootstrap, e reordenadas sempre que o Agente PM reabrir um ciclo e confirmar (ou corrigir) a sequência.
- **As seções de Feature**, abaixo das tabelas, começam vazias (só título, ID e frentes). Cada uma só é preenchida com a User Story completa quando chega a vez daquela feature naquela frente — nunca antes.

## Duas frentes em paralelo

O projeto é desenvolvido em **duas frentes independentes dentro do mesmo repositório (monorepo):**

- **Backend** (`backend/`, NestJS) — responsável: Pablo Grisi.
- **Frontend** (`frontend/`, Next.js) — responsável: Vinicius.

Método, PRD, SDD, roadmap, glossário e questões abertas vivem na raiz e são compartilhados. Cada frente roda seu **próprio ciclo de seis papéis** (PM → Engenheiro → Dev → Testes → Crítico → Documentador) contra o mesmo PRD/SDD, com suas próprias TSDs. Quando um RF exige as duas frentes, cada frente abre o ciclo do seu lado; o contrato de API entre elas é definido na TSD de backend do RF e consumido pela TSD de frontend correspondente.

Fundação técnica: **TSD-001** (backend) e **TSD-002** (frontend) são independentes e podem ser implementadas em paralelo — Pablo na TSD-001, Vinicius numa branch na TSD-002. Não estão nas tabelas abaixo (são fundação, não feature de produto).

> Nota de sequenciamento: há uma linha por RF em cada frente que precisa entregá-lo. Vários RFs adjacentes tendem a ser entregues no mesmo ciclo (ex.: no backend, RF-001 + RF-004 + RF-018 = "criar análise com PDF persistido"). O Agente PM de cada frente confirma o agrupamento ao abrir cada ciclo.

## Tabela de sequenciamento — Frente Backend (`backend/`)

| Sequência | ID     | Feature (recorte backend)                                | Prioridade                 | Status                        |
| --------- | ------ | -------------------------------------------------------- | -------------------------- | ----------------------------- |
| 1         | RF-006 | Base fixa de requisitos: modelo + seed persistido        | Must                       | implementada                  |
| 2         | RF-001 | Endpoint de criação de análise (NUP, objeto, PDF)        | Must                       | implementada                  |
| 3         | RF-004 | Recebimento de upload manual de PDF (multipart)          | Must                       | implementada com RF-001       |
| 4         | RF-018 | Persistência do PDF de entrada associada à análise       | Must                       | implementada com RF-001       |
| 5         | RF-002 | Endpoint de listagem das análises do analista            | Must                       | implementada                  |
| 6         | RF-005 | Worker de processamento do PDF pela `AnaliseIaPort`      | Must                       | implementada                  |
| 7         | RF-007 | Gravação da sugestão de status por requisito (3 valores) | Must                       | implementada com RF-005       |
| 8         | RF-009 | Ordenação da resposta priorizando não conformes          | Must                       | implementada                  |
| 9         | RF-008 | Endpoint de definição do status final do requisito       | Must                       | implementada                  |
| 10        | RF-011 | Endpoint de marcação de "verificado"                     | Must                       | implementada com RF-008       |
| 11        | RF-017 | Validação de comentário obrigatório nas ações de revisão | Must                       | implementada com RF-008       |
| 12        | RF-014 | Referência de página + entrega do PDF por página         | Must                       | implementada                  |
| 13        | RF-012 | Endpoint de conclusão global com trava por obrigatórios  | Must                       | implementada                  |
| 14        | RF-013 | Registro de responsável, datas e status final            | Must                       | implementada (com RF-012)     |
| 15        | RF-015 | Conclusão interna sem aprovação/assinatura/dupla revisão | Must                       | implementada (com RF-012)     |
| 16        | RF-016 | Geração sob demanda do relatório PDF final               | Must                       | implementada                  |
| 17        | RF-003 | Escopo de acesso por analista                            | Must (fase com identidade) | não iniciada — pós-MVP (P-10) |

### Fora da tabela — Integração da IA real (A-02)

Não é um RF: é a fundação adiada desde 31/08 (o `AnaliseIaStubAdapter` sustentou os ciclos). É o **último ciclo de backend do MVP**.

**Status (backend):** implementada na branch `backend/ia-openai` — aguardando aprovação de merge e smoke ponta-a-ponta com `OPENAI_API_KEY` real

**User Story**

Como analista técnico, quero que o processamento de uma análise use um **serviço de IA de verdade** para gerar a sugestão de conformidade (Conforme / Não conforme / Não se aplica) e, quando possível, a página do PDF que a sustenta — em vez do stub que responde "Não se aplica" para tudo — para que a tela de revisão abra com um parecer inicial útil.

Recorte deste ciclo (backend):

- Novo adaptador `AnaliseIaOpenAiAdapter` que **implementa a `AnaliseIaPort` já existente** (`analisar({ pdf, requisitos[] }) → SugestaoRequisito[]`). **Nenhuma mudança no worker, na porta, nem no schema** — o `ProcessamentoService` já chama `analisar(...)` com timeout, grava uma avaliação por requisito e cai em `ERRO_PROCESSAMENTO` no erro.
- O adaptador manda o **PDF** e a **lista de requisitos** (código, título, descrição) para o modelo GPT via SDK `openai`, pede **saída estruturada** (JSON por requisito: `statusSugerido` ∈ 3 valores + `paginaReferencia?` inteiro), e mapeia de volta por `requisitoId`.
- Seleção por configuração: `IA_ADAPTER=openai` (o `stub` continua o **padrão**; o `openai` é opt-in). `OPENAI_API_KEY` obrigatória quando `IA_ADAPTER=openai`; `IA_MODELO` (modelo GPT) e `IA_BASE_URL` (opcional, p/ Azure/proxy) configuráveis.
- Robustez: timeout (o worker já envolve em `comTimeout`), erros do SDK viram falha de análise (→ `ERRO_PROCESSAMENTO`, reprocessável); resposta fora do schema → erro tratado.
- Fecha **A-02** (contrato da capacidade de IA): forma de entrada/saída, auth, timeout, e a decisão "o projeto **aciona** um serviço externo" (não consome um resultado pronto).

**Critérios de aceite**

- Com `IA_ADAPTER=stub` (padrão) nada muda; a bateria de testes atual segue verde.
- Com `IA_ADAPTER=openai` + `OPENAI_API_KEY`, o `CoreModule` injeta o adaptador OpenAI; sem a chave, o boot falha com mensagem clara.
- Dado um PDF + N requisitos, o adaptador devolve `SugestaoRequisito[]` com um item por requisito reconhecido, `statusSugerido` sempre um dos 3 valores, `paginaReferencia` inteiro ou ausente.
- Erro/timeout do serviço → exceção propagada (o worker marca `ERRO_PROCESSAMENTO`).
- Testes: unit do adaptador com o SDK `openai` **mockado** (monta o request certo; parseia a resposta estruturada; erro de rede/schema → exceção); teste de contrato da `AnaliseIaPort` (a forma de saída que o worker espera). **Validação ponta a ponta com a chave real fica como smoke manual** (depende da chave do responsável).

**Decisões do ciclo (respostas do usuário — 02/09/2026)**

1. **Provedor:** OpenAI / GPT (não Claude — o usuário confirmou). SDK `openai`.
2. **Modelo padrão:** `gpt-4o`, em `IA_MODELO` (configurável).
3. **PDF:** vai como **arquivo nativo** via Files API do OpenAI — upload por análise (`purpose: "user_data"`), referência no request, e **delete logo após** (não fica retido do lado deles). Melhor fidelidade e ajuda a `paginaReferencia`.
4. **Chamadas:** *"você decide"* → **uma chamada** com o PDF + todos os requisitos, mas com corte por `IA_MAX_REQUISITOS_POR_CHAMADA` (default folgado, ~200): se a lista passar disso, o adaptador divide em lotes contra o **mesmo** arquivo e junta os resultados. Cobre os 12 placeholder hoje e a base real (P-07) depois sem retrabalho.
5. **Endpoint:** *"você decide"* → **OpenAI direto** (`api.openai.com` + `OPENAI_API_KEY`). `IA_BASE_URL` opcional (o SDK aceita `baseURL`) para apontar a um proxy; **Azure OpenAI completo** (deployment/api-version na URL, auth própria) fica como follow-up se o órgão exigir.
6. **Saída estruturada:** `response_format` json_schema (`strict`) — array `[{ codigo, statusSugerido, paginaReferencia? }]`; o adaptador casa `codigo → requisitoId`.
7. **`stub` continua o padrão**; `IA_ADAPTER=openai` é opt-in. Merge com o stub ativo — ninguém liga o OpenAI sem querer.

**TSD associada:** `docs/engineering/specs/022-integracao-ia-openai.tsd.md` — **implementada**.

**Notas do ciclo (backend — 02/09/2026)**

Ciclo completo dos 6 papéis na branch `backend/ia-openai`; Crítico **aprovou (condicional)** e os não-bloqueadores foram aplicados e commitados. Gates reais: `npm run ci` OK (126 unit / 21 suites), `npm run test:contract` OK (2/2 — hoje só contra o stub), `npm run test:e2e` OK (39/39, não-regressão com `IA_ADAPTER` não setado → stub). O worker `ProcessamentoService` não mudou.

O que se aprendeu / o que muda para os próximos ciclos:

- **A-02 fechada** (ver `questoes-abertas.md` R-07): o projeto **aciona** a OpenAI/GPT pelo SDK `openai` (não consome resultado pronto, não é um `HttpAdapter` genérico). Entrada = PDF (Files API, `purpose: "user_data"`, apagado após) + lista de requisitos; saída = `SugestaoRequisito` por requisito (`statusSugerido` + `paginaReferencia` inteiro `≥ 1` ou ausente), mapeada por `codigo → requisitoId`. Timeout reusa `IA_TIMEOUT_MS` via `comTimeout` no worker; sem retry próprio (o SDK já retenta; erro → `ERRO_PROCESSAMENTO`).
- **`stub` continua o padrão**; `IA_ADAPTER=openai` é opt-in — nenhum ciclo futuro liga a OpenAI sem querer, e a bateria de testes segue rodando sobre o stub.
- **`IA_MAX_REQUISITOS_POR_CHAMADA` default caiu de 200 (TSD) para 50** por pedido do Crítico (margem de `max_output_tokens` por lote). Quando a base real de requisitos (P-07) entrar, o adapter já divide em lotes contra o mesmo arquivo — sem retrabalho, mas vale revisar o teto e o `IA_TIMEOUT_MS` para PDFs grandes.
- **`openai@^5.23.2`** (não `^7`): `openai@7` exige `engines.node >= 22` e o backend declara `>= 20`. Se o backend subir o `engines.node`, dá para migrar para a v7 (shapes idênticos).
- **Não altera a sequência do roadmap.** Não há próximo RF de backend. O MVP backend fica completo quando o merge + o smoke real com a chave forem feitos.

**Pendências:** aprovação de merge do usuário; **smoke ponta-a-ponta com a `OPENAI_API_KEY` real** (`IA_ADAPTER=openai` + `PROCESSAMENTO_AUTO=true` + PDF de licitação real — conferir que as sugestões vêm do GPT e que algumas trazem `paginaReferencia`; registrar em checkpoint/audit); plano B `chat.completions` + `response_format` se a OpenAI recusar a forma do `responses.create` (TSD-022 §9); decidir o versionamento de `backend/scripts/dev-db.mjs`, `backend/scripts/seed-demo.mjs` e `.claude/launch.json`.

## Tabela de sequenciamento — Frente Frontend (`frontend/`)

| Sequência | ID     | Feature (recorte frontend)                                        | Prioridade | Status                                                                                    |
| --------- | ------ | ----------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| 1         | RF-002 | Tela de listagem de análises + estado vazio                       | Must       | implementada (branch `frontend/rf-002-listagem`)                                          |
| 2         | RF-001 | Modal "Nova análise" (NUP, objeto) + validação                    | Must       | implementada (branch `frontend/rf-001-nova-analise`)                                      |
| 3         | RF-004 | Campo de upload de PDF no modal + estados de erro                 | Must       | implementada com RF-001 (branch `frontend/rf-001-nova-analise`)                           |
| 4         | RF-010 | Tela de análise: abas Checklist/Técnica + navegação livre         | Must       | implementada (branch `frontend/rf-010-tela-analise`)                                      |
| 5         | RF-007 | Exibição dos requisitos com status sugerido pela IA               | Must       | implementada (branch `frontend/rf-007-status-ia`)                                         |
| 6         | RF-009 | Visão inicial priorizando não conformes + filtros por status      | Must       | implementada — Crítico ✅ (branch `frontend/rf-009-filtros`)                              |
| 7         | RF-008 | Modal de alteração de status final ("parecer")                    | Must       | implementada — Crítico ✅ (branch `frontend/rf-008-parecer`)                              |
| 8         | RF-011 | Controle de "marcar como verificado"                              | Must       | implementada — Crítico ✅ (branch `frontend/rf-011-verificado`)                           |
| 9         | RF-017 | Campo de comentário obrigatório nas ações de revisão              | Must       | implementada — Crítico ✅ (branch `frontend/rf-017-comentario`)                           |
| 10        | RF-014 | Visor de PDF + referência de página clicável / ausência explícita | Must       | implementada — Crítico ✅ (branch `frontend/rf-014-visor`)                                |
| 11        | RF-012 | Modal de conclusão + botão global bloqueado até tudo verificado   | Must       | implementada — Crítico ✅ (branch `frontend/rf-012-conclusao`)                            |
| 12        | RF-016 | Ação de baixar o relatório PDF da análise concluída               | Must       | implementada — Crítico ✅ (branch `frontend/rf-016-relatorio`) — **fecha o MVP frontend** |

Status possíveis, nessa ordem de progresso dentro de um ciclo: `não iniciada` → `user story em aprovação` → `user story aprovada` → `TSD em aprovação` → `TSD aprovada` → `em construção` → `em validação` → `implementada`.

RFs sem recorte de frontend (só backend): RF-005, RF-006, RF-013, RF-015, RF-018, RF-003.

## Seções de Feature

Uma seção por RF. O Agente PM da frente correspondente preenche a User Story do seu recorte quando a feature entra em ciclo; nunca antes.

### RF-006 — Base fixa de requisitos

**Frentes:** Backend
**Status:** implementada (mergeada no `main` `13b111e`)

**User Story**

Como analista técnico, quero que toda análise seja avaliada contra o mesmo conjunto fixo de requisitos normativos, jurídicos e técnicos, persistido pelo sistema, para que a verificação de conformidade seja consistente e comparável entre análises e entre analistas.

Recorte deste ciclo (backend): modelar e persistir a base de requisitos e populá-la por um importador de arquivo externo. Não inclui a avaliação de requisitos por análise (RF-007+), nem a tela (frente frontend), nem endpoint público.

**Critérios de aceite**

- Existe uma tabela de requisitos persistida, criada por migration Prisma.
- Cada requisito tem, no mínimo: `codigo` (estável, legível, único), `area`, `titulo`, `descricao`, `obrigatorio` (bool), `ordem` (para exibição), `ativo` (bool), e a referência normativa **estruturada** (campos separados: lei, artigo, inciso, parágrafo, alínea — todos opcionais). Sem campos especulativos (subgrupo, severidade, texto de orientação) — entram depois se um caso real pedir.
- `area` **não** é um enum travado de dois valores — é um campo flexível (string com convenção documentada ou catálogo à parte, a definir na TSD), porque o vocabulário deve crescer.
- A base é populada por um **importador de arquivo externo** (ex.: CSV em `prisma/seed-data/`), não por lista digitada em código/JSON. Trocar a base real depois = trocar o arquivo de entrada, sem reescrever o mecanismo. Motivação: caso conhecido de ~12 requisitos estimados virarem 300+ quando a lista jurídica real chegou.
- Regra de imutabilidade: um requisito publicado tem texto imutável. Mudança normativa → **novo** requisito + o antigo vira `ativo = false`. O importador **nunca reescreve** o texto de um requisito existente (mesmo `codigo`): trata divergência de texto como erro/aviso, não como update silencioso. Isso, somado a cada parecer referenciar o requisito específico avaliado, já dá o snapshot histórico — sem coluna de versão.
- Importar num banco limpo popula a base; reimportar o mesmo arquivo é idempotente (não duplica, não reescreve texto).
- O sistema consegue ler a lista de requisitos ativos, ordenados por `area` e `ordem`, por um serviço interno testável. **Sem endpoint HTTP** neste slice (entra no RF-007, quando a tela definir o que consome).
- Testes: unitário do parser/importador (idempotência, rejeição de reescrita de texto, arquivo malformado) e do serviço de leitura; integração do importador + leitura contra o PostgreSQL de teste.

**Decisões do ciclo (respostas às perguntas do PM, 31/08/2026)**

1. P-07 — seed-placeholder (8–12 itens Checklist + Técnica) **agora**, mas via importador de arquivo externo desde já. Ver `questoes-abertas.md` P-07.
2. A-03 — `norma_referencia` estruturada (lei/artigo/inciso/parágrafo/alínea); sem campos especulativos. Ver `questoes-abertas.md` A-03.
3. Versionamento — sem coluna de versão; imutabilidade + novo requisito + `ativo=false`; snapshot via referência do parecer ao requisito.
4. P-04 — mesma tabela para todas as áreas; `area` como campo flexível, não enum fixo de 2 valores.
5. Endpoint — fora deste slice; leitura só interna.

**TSD associada:** `docs/engineering/specs/003-base-fixa-requisitos.tsd.md` — aprovada e implementada na branch `backend/tsd-001-fundacao-tecnica`. Pendente: testes de integração com Postgres antes de marcar `implementada` e mergear.

### RF-001 — Criar análise (NUP, objeto/descrição, PDF)

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada no `main` `9dd6792`)
**Status (frontend):** implementada na branch `frontend/rf-001-nova-analise` (ciclo agrupado RF-001 + RF-004) — aguardando revisão + merge

> Ciclo backend agrupado: **RF-001 + RF-004 + RF-018** = "criar análise com PDF persistido". A User Story e os critérios abaixo cobrem o recorte backend dos três.

**User Story**

Como analista técnico, quero criar uma análise informando o NUP, o objeto/descrição da contratação e enviando o PDF do processo, para que o sistema registre a análise e guarde o documento para a verificação de conformidade.

Recorte backend deste ciclo:

- `POST /analises` (multipart) — valida a entrada, persiste o PDF e cria o registro da análise sob o analista fixo, em estado inicial `PENDENTE`.
- `GET /analises/:id` — devolve os dados e o status de uma análise.
- `GET /analises/:id/pdf` — devolve o PDF de entrada persistido.
- **Fora**: listagem (RF-002), processamento/worker (RF-005), avaliação de requisitos, referência por página (RF-014), frente frontend.

**Critérios de aceite**

- `POST /analises` só cria a análise quando `nup` e `objeto` estão preenchidos e um PDF válido foi enviado; caso contrário responde `422` com mensagem específica e **não cria nada**.
- PDF inválido (não é PDF pelo mimetype/magic bytes, ou excede o limite de tamanho, ou está protegido por senha) → `422` com motivo claro.
- Em sucesso: o PDF é persistido via `ArmazenamentoPdfPort`; a `analise` é criada com `nup`, `objeto`, `analista_id` (do `AnalistaAtualProvider`), `arquivo_pdf_ref`, `status = PENDENTE`, `iniciada_em`; a resposta (`201`/`202`) traz o `id` e o `status`.
- Se a gravação do PDF falhar, **nenhuma** linha de `analise` é criada (sem registro órfão) e a resposta indica falha de persistência (`502`/`500`).
- `GET /analises/:id` devolve os campos + status; `404` se não existir.
- `GET /analises/:id/pdf` devolve exatamente o PDF enviado (`Content-Type: application/pdf`); `404` se a análise ou o arquivo não existir.
- Testes: unit da validação de entrada e do serviço de criação; integração do fluxo (criar → buscar → baixar PDF) e do rollback quando a persistência do PDF falha.

**Decisões do ciclo (respostas do usuário, 31/08/2026)**

1. **"PDF válido"**: mimetype `application/pdf` + magic bytes `%PDF-`; limite de tamanho **25 MB** (ajustável por `ANALISE_PDF_TAMANHO_MAX_MB`); **recusa PDF protegido por senha** (heurística: presença de `/Encrypt` no conteúdo).
2. **NUP**: **string livre** no MVP (obrigatória, `trim`, até 60 chars). Validação de máscara é questão aberta futura.
3. **Status da análise**: todos os valores do SDD §8 como **string + allowlist** em `src/analises/status-analise.ts` (padrão do `area` de RF-006). Neste slice só `PENDENTE` é atribuído.
4. **NUP repetido**: **permitido** — sem constraint de unicidade. Reanálise é caso legítimo.

**TSD associada (backend):** `docs/engineering/specs/004-criar-analise.tsd.md`.

**Recorte frontend deste ciclo (RF-001 + RF-004 frontend):**

Como analista técnico, quero criar uma análise por um modal — informando NUP e objeto da contratação e anexando o PDF do processo (clique ou arrastar-e-soltar) — com validação clara antes do envio e mensagens de erro que não me façam reescrever tudo, para registrar a análise e ser levado à tela dela.

- Botão "Nova análise" (hoje desabilitado) abre o modal `NovaAnaliseModal`: campos NUP (obrigatório, ≤ 60), Objeto (obrigatório, ≤ 2000), Arquivo (PDF, ≤ 25 MB — igual ao backend).
- Validação client-side: campos obrigatórios; arquivo `application/pdf` e dentro do limite; "Confirmar" desabilitado até válido; erros por campo.
- Envio via seam de dados (`AnalisesGateway.criarAnalise`, multipart `POST /analises` no `HttpAnalisesGateway`). Sucesso → fecha o modal e navega para `/analise/[id]`.
- Estados de erro (PRD §9): PDF inválido (antes do envio, na área do arquivo); erro no upload / persistência (banner no modal, **dados preservados**, permite reenviar); indisponibilidade.
- **Fora:** validação de magic bytes / `/Encrypt` no cliente (o backend é a autoridade e devolve 422); máscara de NUP; visor de PDF; qualquer coisa pós-criação além de navegar para a análise.
- **Divergências protótipo × PRD** (na TSD): limite exibido **25 MB** (protótipo dizia 50 MB); campo `objeto`/`arquivo` (não `subject`/`file`); sem a simulação de "Processando documento…" (o `POST` responde `201` na hora, análise nasce `PENDENTE`).

**TSD associada (frontend):** `docs/engineering/specs/012-nova-analise-frontend.tsd.md`.

### RF-004 — Upload manual de PDF na criação da análise

**Frentes:** Backend · Frontend
**Status (backend):** coberto no ciclo de RF-001 (ver seção RF-001)
**Status (frontend):** implementada na branch `frontend/rf-001-nova-analise` (com RF-001) — aguardando revisão + merge

### RF-018 — Persistência do PDF de entrada, associado à análise

**Frentes:** Backend
**Status:** coberto no ciclo de RF-001 (ver seção RF-001) — persistência via `ArmazenamentoPdfPort` + `analise.arquivo_pdf_ref`; retenção/object storage seguem abertos (P-09, A-05)

### RF-002 — Listagem das análises do analista

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada no `main` `57b170f`)
**Status (frontend):** implementada na branch `frontend/rf-002-listagem` — aguardando revisão + merge

**User Story**

Como analista técnico, quero ver a lista das análises que criei, com identificação suficiente e o status de cada uma, para reabrir a que eu precisar e acompanhar o andamento.

Recorte backend deste ciclo: `GET /analises` — devolve as análises do analista atual, com busca/filtro/ordenação/paginação a definir (P-06). Sem alteração no modelo `Analise`. Sem a tela (frente frontend).

**Recorte frontend deste ciclo (RF-002 frontend):**

Como analista técnico, quero abrir a tela inicial e ver, numa tabela, as análises que criei — com NUP, objeto, status e data de início —, podendo buscar por NUP/objeto, filtrar por status, ordenar e paginar, para localizar e reabrir rapidamente a análise que preciso; e quando eu ainda não tiver análises, quero uma tela que me oriente a criar a primeira.

- `/` deixa de ser casca: tabela + busca (`q`) + filtro por status (multi) + ordenação (`iniciadaEm`/`nup`) + paginação, tudo refletido na URL. Linha leva a `/analise/[id]`.
- Estados: vazio "sem análises" (orienta a criar) e "sem resultado" (limpar busca/filtros); carregando; erro com "tentar novamente" (PRD §9).
- Consome o contrato `GET /analises` (TSD-005) pelo seam de dados: `HttpAnalisesGateway` + teste de contrato; `getAnalisesGateway()` usa HTTP quando `NEXT_PUBLIC_API_BASE_URL` estiver definida, senão fixtures.
- **Fora:** criação de análise (RF-001, frontend); tela de análise (RF-010+); painel de filtros consolidado; seletor de tamanho de página na UI; contagens de requisitos por linha (RF-007).
- **Divergências protótipo × PRD** (na TSD): coluna "Status" adicionada e "Adicionado por" removida (analista único); filtro por status como chips inline em vez do modal "Filtros"; "Nova análise" desabilitado.

**Follow-up incluído neste ciclo:** migração de `next lint` → `eslint .` (ESLint CLI + flat config), scripts do `package.json` adaptados.

**TSD associada (frontend):** `docs/engineering/specs/011-listagem-analises-frontend.tsd.md`.

**Critérios de aceite**

- `GET /analises` devolve apenas as análises do analista atual (query já filtra por `analista_id`).
- Cada item traz identificação suficiente para reabrir a análise e mostrar seu estado (o conjunto exato de campos sai de P-06).
- Busca, filtro por status, ordenação e paginação conforme o contrato aprovado em P-06.
- Estado vazio: quando o analista não tem análises, a resposta é uma lista vazia (o texto de orientação é da frente frontend).
- Testes: unit do serviço de listagem (montagem do filtro/ordenação); integração (criar N análises → listar → conferir filtro, ordenação e paginação).

**Decisões do ciclo (P-06 fechado, respostas do usuário "você decide" — 31/08/2026)**

1. **Contrato completo.** `GET /analises` com: `q` (busca em `nup` + `objeto`, contém, case-insensitive), `status` (multi-seleção), `ordenarPor` (`iniciadaEm` default | `nup`), `ordem` (`asc` | `desc` default), `pagina` (1-based, default 1) + `tamanho` (default 20, máx 100).
2. **Campos por linha:** `id`, `nup`, `objeto`, `status`, `iniciadaEm`, `concluidaEm`. Sem contagens de requisitos (dependem de RF-007).
3. **Resposta:** `{ itens: [...], total, pagina, tamanho }`.

**TSD associada:** `docs/engineering/specs/005-listagem-analises.tsd.md` (a redigir pelo Engenheiro).

### RF-005 — Processamento do PDF pela capacidade de análise por IA

**Frentes:** Backend
**Status:** implementada (mergeada no `main` `67ff89f`)

> Ciclo backend agrupado: **RF-005 + RF-007** = "processar a análise e gerar a sugestão por requisito". User Story e critérios abaixo cobrem os dois.

**User Story**

Como analista técnico, quero que, ao criar uma análise, o sistema processe o PDF contra a base de requisitos e gere um parecer sugerido para cada requisito, para eu começar a revisão já com um ponto de partida.

Recorte backend deste ciclo:

- Worker **em processo** que pega análises `PENDENTE`, chama a `AnaliseIaPort` (hoje o `StubAdapter`), e grava uma `avaliacao_requisito` por requisito ativo, com `status_sugerido_ia` ∈ {`CONFORME`, `NAO_CONFORME`, `NAO_SE_APLICA`}, `pagina_referencia` (ou nulo), `status_final = status_sugerido_ia`, `verificado = false`.
- Máquina de status: `PENDENTE → PROCESSANDO → PRONTA_PARA_REVISAO`; falha/timeout → `ERRO_PROCESSAMENTO` + `motivo_erro`.
- Recuperação no boot: reprocessa o que ficou preso em `PENDENTE`/`PROCESSANDO`.
- **Fora**: leitura/agrupamento/ordenação das avaliações para a tela (RF-009), edição do parecer (RF-008/011/017), entrega do PDF por página (RF-014), frente frontend, e o `HttpAdapter` real da IA (adiado para o fim do MVP).

**Critérios de aceite**

- Existe a tabela `avaliacao_requisito` (migration), única por (`analise_id`, `requisito_id`), com FK para `analise` e `requisito`.
- Uma análise criada em `PENDENTE` é processada sem intervenção manual e termina em `PRONTA_PARA_REVISAO` com uma `avaliacao_requisito` para **cada requisito ativo** da base.
- Cada avaliação tem `status_sugerido_ia` dentre os três valores, `status_final` inicial igual a ele, `verificado = false`.
- Falha/timeout da `AnaliseIaPort` → `ERRO_PROCESSAMENTO` com `motivo_erro`; nenhuma avaliação parcial fica gravada (transação).
- O claim da análise é atômico (duas execuções do worker não processam a mesma análise duas vezes).
- Reinício do serviço com uma análise presa em `PROCESSANDO` → ela volta a ser processada.
- Testes: unit do serviço de processamento (claim, sucesso, erro→rollback, base vazia) com `AnaliseIaPort`/prisma mockados; integração (criar via `POST /analises` → aguardar → `avaliacao_requisito` populada e `status = PRONTA_PARA_REVISAO`) contra Postgres embutido + `StubAdapter`.

**Decisões do ciclo (respostas do usuário "você decide" — 31/08/2026)**

1. **Disparo:** imediato após `POST /analises` + varredura periódica (`PROCESSAMENTO_INTERVALO_MS`, default 5 s) + recuperação no boot (`PROCESSANDO` preso → `PENDENTE`). Flag `PROCESSAMENTO_AUTO` (default `true`) desliga o agendamento nos testes.
2. **Reprocessar:** `POST /analises/:id/reprocessar` incluído — `ERRO_PROCESSAMENTO` → `PENDENTE` (`404`/`409`), dispara na hora.
3. **Timeout:** `IA_TIMEOUT_MS` (default 120 000).
4. **Base vazia:** 0 requisitos ativos → `ERRO_PROCESSAMENTO` com motivo "base de requisitos vazia".

**TSD associada:** `docs/engineering/specs/006-processamento-analise.tsd.md` (a redigir pelo Engenheiro).

### RF-007 — Sugestão de status por requisito

**Frentes:** Backend · Frontend
**Status (backend):** coberto no ciclo de RF-005 (ver seção RF-005)
**Status (frontend):** implementada na branch `frontend/rf-007-status-ia` — Crítico aprovou, aguardando merge

**User Story (frontend)**

Como analista técnico, quero ver, em cada requisito da tela de análise, qual foi o status **sugerido pela IA** (Conforme / Não conforme / Não se aplica) e distinguir claramente quando o parecer atual difere dessa sugestão, para saber o que a IA propôs e o que já foi alterado na revisão.

Recorte deste ciclo (frontend): o `RequisitoItem` (criado em RF-010) passa a exibir `statusSugeridoIa`, além do `statusFinal` que já mostra. O backend já entrega os dois campos no `GET /analises/:id` — não há mudança de contrato.

- **Recolhido:** quando `statusSugeridoIa === statusFinal` (situação atual, antes de qualquer edição — RF-008), o badge mostra que aquele status **é uma sugestão da IA** (marca/rótulo discreto). Quando diferem, aparece também um indicador secundário "IA sugeriu: X" ao lado do parecer atual.
- **Expandido:** linha explícita "Sugestão da IA: <status>"; quando `statusFinal` difere, linha "Parecer atual: <status>" e um realce de divergência.
- Uma nota curta no topo da lista deixando claro que os status são sugestões da IA até a revisão do analista.
- **Fora do escopo:** editar o parecer / alterar `statusFinal` (RF-008); marcar verificado (RF-011); comentário (RF-017); filtros (RF-009). Nenhuma chamada nova ao backend — só apresentação do dado que já vem no payload.

**Critério de aceite (PRD RF-007):** todo requisito exibido na tela de análise apresenta exatamente um status sugerido pela IA, dentre os três valores permitidos, visualmente identificável como sugestão da IA.

**Contrato consumido:** `GET /analises/:id` (`avaliacoesPorArea[].itens[].statusSugeridoIa` + `.statusFinal`) — já implementado (backend TSD-006/007). Sem mudança.

**TSD associada (frontend):** `docs/engineering/specs/014-status-ia-frontend.tsd.md`.

### RF-009 — Abertura da análise priorizando requisitos não conformes

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada no `main` `96ff8fb`)
**Status (frontend):** implementada — Crítico ✅ (01/09/2026), branch `frontend/rf-009-filtros`; `npm run ci` verde (129 testes). Aguardando push + merge.

**User Story**

Como analista técnico, quero abrir uma análise e ver os requisitos avaliados — com os não conformes em primeiro plano e um resumo do estado — para começar a revisão pelo que mais importa.

**User Story (frontend — RF-009)**

Como analista técnico, quero que a tela de análise já abra mostrando primeiro os requisitos **não conformes** e ter chips para filtrar a lista por status (Não conforme / Conforme / Não se aplica / Todos), para começar a revisão pelo que mais importa e navegar rápido entre os grupos.

Recorte deste ciclo (frontend), em cima do painel do RF-010:

- **Chips de filtro por status** no `PainelRevisao` (adiados do RF-010): 4 opções, colorindo quando ativas (padrão do protótipo). O filtro é por `statusFinal` (parecer atual — a IA só sugere, o humano decide) e vale para a aba corrente; trocar de aba mantém o filtro.
- **Visão inicial:** o filtro abre em **"Não conforme"**.
- **Filtro persistido na URL** (`?requisitos=<slug>`): sobrevive a recarregar a página e ao polling; compartilhável por link. (Decisão validada pelo usuário — 01/09/2026.)
- **Estado "nenhum não conforme"** (PRD §9): quando o filtro "Não conforme" está ativo e a aba não tem itens nesse status, mostrar mensagem clara + atalho "Ver todos" (troca o filtro para "Todos").
- Grupos de área sem itens no filtro atual **continuam visíveis** com uma linha de placeholder; a contagem do cabeçalho reflete os itens visíveis. (Decisão validada pelo usuário — diverge do protótipo, que oculta.)
- **Fora do escopo:** ordenação alternativa / reordenar (o backend já entrega não conformes primeiro); busca textual dentro da análise; filtro por "verificado/pendente" (pode virar refinamento); edição de parecer (RF-008), verificado interativo (RF-011), comentário (RF-017), visor de PDF (RF-014), conclusão (RF-012).

**Critério de aceite (PRD RF-009 + §9):** ao abrir a análise, a primeira visão destaca/filtra os não conformes; quando não houver nenhum, isso é informado claramente e o acesso aos demais requisitos é fácil.

**Contrato consumido:** `GET /analises/:id` — sem mudança (o backend já ordena não conformes primeiro e manda o `resumo`; TSD-007).

**TSD associada (frontend):** `docs/engineering/specs/015-filtros-status-frontend.tsd.md`.

Recorte backend deste ciclo: o endpoint de leitura da análise passa a devolver as avaliações (avaliação + dados do requisito), agrupadas por área e ordenadas priorizando não conformes, mais um resumo de contagens. Sem edição de parecer (RF-008/011/017), sem tela (frontend), sem entrega do PDF por página (RF-014).

**Critérios de aceite**

- Abrir uma análise `PRONTA_PARA_REVISAO` devolve, além dos campos atuais, a lista das avaliações — cada item com: `id` (da avaliação), `requisitoId`, `codigo`, `area`, `titulo`, `descricao`, `obrigatorio`, `ordem`, referência normativa, `statusSugeridoIa`, `statusFinal`, `verificado`, `comentario`, `paginaReferencia`.
- As avaliações vêm agrupadas por área; dentro de cada área, os não conformes primeiro, depois pela `ordem` do requisito.
- Vem também um resumo de contagens (total, por status, verificados, obrigatórios ainda não verificados).
- Análise `PENDENTE`/`PROCESSANDO` → lista vazia + o status (o frontend mostra "processando"). `ERRO_PROCESSAMENTO` → lista vazia + `motivoErro`.
- `404` se a análise não existir para o analista atual.
- Testes: unit da montagem/ordenação/resumo; integração (criar → processar → abrir → conferir agrupamento, ordenação e contagens).

**Decisões do ciclo (respostas do usuário — 31/08/2026)**

1. **Enriquecer o `GET /analises/:id`** — uma chamada, passa a incluir `avaliacoesPorArea` + `resumo`.
2. **Agrupado por área no backend**: `avaliacoesPorArea: [{ area, itens: [...] }]`, áreas em ordem alfabética, cada grupo com não conformes primeiro depois `ordem`.
3. Priorização por **`statusFinal`** (parecer atual).
4. **Resumo** incluído: `total`, `conforme`, `naoConforme`, `naoSeAplica`, `verificados`, `obrigatoriosPendentes`.

**TSD associada:** `docs/engineering/specs/007-abrir-analise.tsd.md` (a redigir pelo Engenheiro).

### RF-010 — Navegação livre entre seções e abas da análise

**Frentes:** Frontend (backend entrega os requisitos agrupados por área)
**Status (frontend):** implementada na branch `frontend/rf-010-tela-analise` — validada, aguardando merge

**User Story (frontend)**

Como analista técnico, quero abrir uma análise e ver os requisitos avaliados organizados nas abas **Checklist** e **Técnica**, podendo alternar livremente entre elas (sem ordem obrigatória de revisão) e expandir cada requisito para ler o detalhe, para começar a revisão pela parte que eu quiser.

Recorte deste ciclo (frontend):

- `/analise/[id]` deixa de ser casca: carrega `GET /analises/:id` pelo seam de dados (`AnalisesGateway.abrirAnalise(id)`), com estados de carregando / erro / não encontrada (404).
- Cabeçalho da análise: NUP, objeto, badge de status; quando `PENDENTE`/`PROCESSANDO`, mostra "processando" em vez da lista; `ERRO_PROCESSAMENTO` mostra o `motivoErro`.
- Frame de dois painéis (do TSD-002): à esquerda o **espaço do visor de PDF** (segue placeholder — o visor real é RF-014); à direita o **painel de revisão**.
- Painel de revisão: **abas Checklist / Técnica** (derivadas de `avaliacoesPorArea` pelo prefixo da `area`), **navegação livre** entre elas; Legislação/Outros aparecem desabilitadas (indisponíveis no MVP).
- Dentro da aba: lista dos requisitos **agrupada por área**, na ordem que o backend já entrega (não conformes primeiro, depois `ordem`); cada requisito é um item em acordeão — recolhido: título + badge do `statusFinal`; expandido: descrição, norma (lei/artigo/…), comentário (se houver), referência de página (texto, ainda não clicável).
- Barra de progresso a partir do `resumo` (verificados / total).

**Fora do escopo (entram nos próximos ciclos):**

- Filtros por status (chips) + "visão inicial priorizando não conformes" na UI → **RF-009**.
- Destaque do status **sugerido pela IA** vs. final → **RF-007**.
- Controle interativo de "marcar como verificado" → **RF-011**.
- Modal de alteração do parecer (`statusFinal`) → **RF-008**.
- Campo/obrigatoriedade de comentário na revisão → **RF-017**.
- Visor de PDF real + referência de página clicável (`#page=N`) → **RF-014**.
- Modal de conclusão + botão global → **RF-012**.
- Semântica definitiva da aba Técnica (P-04): neste ciclo os itens de Técnica são renderizados como os de Checklist (com badge de `statusFinal`, que o backend entrega para todo requisito ativo). Divergência do protótipo (que trata Técnica como "observações" neutras) registrada na TSD.

**Contrato consumido:** `GET /analises/:id` (backend TSD-004 + TSD-007 + TSD-009 + TSD-010) — SDD §7, fluxo "Abrir análise".

**TSD associada (frontend):** `docs/engineering/specs/013-tela-analise-frontend.tsd.md`.

### RF-008 — Definição do status final de cada requisito

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada no `main` `ad2e8cd`)
**Status (frontend):** implementada — Crítico ✅ (01/09/2026), branch `frontend/rf-008-parecer`; `npm run ci` verde (164 testes). Aguardando push + merge.

> Ciclo backend agrupado: **RF-008 + RF-011 + RF-017** = "revisar um requisito" (um endpoint de PATCH). User Story e critérios abaixo cobrem os três.

**User Story**

Como analista técnico, quero, ao revisar um requisito, definir o parecer final (podendo alterar a sugestão da IA), marcá-lo como verificado e registrar um comentário quando exigido, para consolidar minha avaliação daquele item.

Recorte backend deste ciclo: `PATCH /analises/:id/requisitos/:requisitoId` que atualiza `statusFinal`, `verificado` e/ou `comentario` de uma avaliação; alterar `statusFinal` marca `verificado = true`; comentário obrigatório conforme a regra de P-03. Sem tela (frontend), sem conclusão da análise (RF-012).

**User Story (frontend — RF-008)**

Como analista técnico, quero, a partir de um requisito na tela de análise, abrir um modal "Alterar parecer" para escolher o novo `statusFinal` e escrever o comentário que o justifica, e ver a lista e o progresso se atualizarem na hora — para consolidar minha decisão sobre aquele item quando discordo da sugestão da IA (ou quando quero corrigir).

Recorte deste ciclo (frontend), em cima do painel do RF-010/RF-007/RF-009:

- **Botão "Alterar parecer"** em cada `RequisitoItem` (o item deixa de ser 100% read-only). Abre um modal.
- **Modal "Alterar parecer"** (padrão do protótipo `ChangeOpinionModal`, simplificado): bloco "Parecer atual" (só leitura, com o requisito e o `statusFinal` de agora); bloco "Novo parecer" com **select de parecer** (os 3 status, exceto o atual) e **textarea de comentário obrigatório**. Sem o campo "Página no documento" (isso é RF-014).
- **Confirmar** chama `PATCH /analises/:id/requisitos/:requisitoId` com `{ statusFinal, comentario }` e recebe `{ item, resumo }`. O painel aplica o item atualizado e o novo `resumo` **na hora** (sem recarregar a página): a lista, os badges "IA"/divergência (RF-007), os filtros (RF-009) e a barra de progresso refletem a mudança.
- **Erros do backend:** `422` (ex.: comentário obrigatório não atendido) → mensagem no modal, sem fechar; `409` (análise não está `PRONTA_PARA_REVISAO`) e `404` → mensagem clara. Validação client-side espelha a regra R-06 (comentário obrigatório quando o novo parecer difere da sugestão da IA) para não depender só do 422.
- **Alterar `statusFinal` marca `verificado = true`** (o backend faz; o frontend só reflete). O check de "verificado" segue **desabilitado** para toggle manual — isso é o RF-011.
- **Fora do escopo:** marcar/desmarcar "verificado" manualmente (RF-011); campo de comentário fora do fluxo de alterar parecer / edição de página (RF-017 amplo + RF-014); concluir a análise (RF-012); baixar relatório (RF-016); histórico de alterações do parecer.

**Critério de aceite (frontend)**

- Cada requisito tem uma ação "Alterar parecer" que abre o modal com o parecer atual visível.
- O modal exige um novo parecer (≠ atual) e um comentário não vazio; "Confirmar" fica desabilitado até os dois estarem preenchidos.
- Ao confirmar, a chamada ao gateway é feita; no sucesso o modal fecha, o item some/aparece conforme o filtro ativo (RF-009), o badge de status muda, a marca de divergência da IA (RF-007) reavalia, o progresso (`verificados/total`) e as contagens das abas se ajustam pelo `resumo` devolvido.
- `422`/`409`/`404` são mostrados no modal (ou como aviso) sem perder o que o usuário digitou; `422` mantém o modal aberto.
- Nenhuma mudança no contrato; a tela continua consumindo `GET /analises/:id` e agora também `PATCH /analises/:id/requisitos/:requisitoId` (TSD-008).

**TSD associada (frontend):** `docs/engineering/specs/016-alterar-parecer-frontend.tsd.md`.

**Critérios de aceite**

- `PATCH /analises/:id/requisitos/:requisitoId` aceita `statusFinal`, `verificado`, `comentario` (todos opcionais no corpo; ao menos um obrigatório).
- `statusFinal`, quando presente, deve ser um dos três valores; outro → `422`.
- Alterar `statusFinal` também grava `verificado = true` (RF-011).
- Comentário obrigatório: quando a regra de P-03 exigir e ele não vier → `422` sem gravar nada.
- Só é possível editar quando a análise está `PRONTA_PARA_REVISAO`; caso contrário → `409`. `404` se a análise ou o requisito/avaliação não existir para o analista atual.
- A resposta traz a avaliação atualizada (mesmo formato do item de `GET /analises/:id`) e o `resumo` recalculado.
- Testes: unit da lógica de atualização (coerção, regra "altera status → verificado", regra de comentário, 409/404) e integração (criar → processar → PATCH → conferir avaliação + resumo).

**Decisões do ciclo (respostas do usuário — 31/08/2026)**

1. **P-03 fechado:** comentário obrigatório **quando `statusFinal ≠ statusSugeridoIa`** — invariante: uma avaliação divergente da IA precisa ter comentário (definido agora ou já armazenado); PATCH que resulte nesse estado sem comentário → `422`.
2. **`verificado` alterna livremente** (true↔false) até a conclusão.
3. **Rota:** `PATCH /analises/:id/requisitos/:requisitoId` (SDD §7).
4. **Resposta:** `{ item, resumo }` (resumo recalculado).

**TSD associada:** `docs/engineering/specs/008-revisao-requisito.tsd.md` (a redigir pelo Engenheiro).

### RF-011 — Marcar requisito como verificado

**Frentes:** Backend · Frontend
**Status (backend):** coberto no ciclo de RF-008 (ver seção RF-008)
**Status (frontend):** implementada — Crítico ✅ (01/09/2026), branch `frontend/rf-011-verificado`; `npm run ci` verde (179 testes). Aguardando push + merge.

**User Story (frontend — RF-011)**

Como analista técnico, quero **marcar e desmarcar cada requisito como "verificado"** direto na lista da tela de análise, e ver a barra de progresso e os contadores acompanharem na hora, para controlar o que já revisei sem abrir o modal de parecer.

Recorte deste ciclo (frontend), em cima do painel do RF-010/007/009/008:

- O **checkbox de "verificado"** de cada `RequisitoItem` deixa de ser desabilitado: clicar alterna `verificado` (true↔false) via `PATCH /analises/:id/requisitos/:requisitoId` com `{ verificado }` — **sem comentário** (a regra R-06 só vale ao mudar `statusFinal`).
- A resposta `{ item, resumo }` é aplicada **na hora** (mesmo mecanismo de `overrides` + `resumo` de estado do RF-008): a **barra de progresso** (`verificados/total`) e as contagens acompanham; nada recarrega.
- Enquanto o `PATCH` está em curso, o checkbox fica **desabilitado**; se falhar, ele **volta ao estado anterior** e aparece uma mensagem curta no item.
- **Só quando a análise está `PRONTA_PARA_REVISAO`.** Em `CONCLUIDA` o checkbox fica desabilitado (a revisão está fechada).
- Alterar o parecer pelo modal (RF-008) continua ligando `verificado = true` — sem regressão.
- **Fora do escopo:** "verificar tudo" em massa; concluir a análise / botão global (RF-012); campo de comentário fora do fluxo de parecer (RF-017); página do PDF (RF-014); histórico.

**Critério de aceite (frontend)**

- Cada requisito de uma análise `PRONTA_PARA_REVISAO` tem um checkbox de "verificado" **operável**; o de uma análise `CONCLUIDA` fica desabilitado.
- Clicar chama `AnalisesGateway.marcarVerificado(analiseId, requisitoId, verificado)` (nenhum componente fala HTTP direto); no sucesso o item reflete o novo `verificado` e o **progresso/contadores** se ajustam pelo `resumo` devolvido, sem reload.
- Durante a chamada o checkbox não aceita novos cliques; num erro (`409`/`404`/rede) ele volta ao valor anterior e o item mostra uma mensagem.
- O corpo enviado é só `{ verificado: boolean }` — nunca `statusFinal`/`comentario`.
- Nenhuma mudança de contrato; mesmo endpoint da TSD-008.

**TSD associada (frontend):** `docs/engineering/specs/017-verificado-interativo-frontend.tsd.md`.

### RF-017 — Comentário obrigatório nas ações de revisão

**Frentes:** Backend · Frontend
**Status (backend):** coberto no ciclo de RF-008 (ver seção RF-008); regra exata em P-03
**Status (frontend):** implementada — Crítico ✅ (01/09/2026), branch `frontend/rf-017-comentario`; `npm run ci` verde (186 testes). Aguardando push + merge.

**User Story (frontend — RF-017)**

Como analista técnico, quero que **a justificativa da minha alteração de parecer fique visível no requisito** e que, se o sistema recusar uma ação de revisão por falta de comentário, **a mensagem diga exatamente isso** — para que a exigência de comentário (R-06) seja clara na tela, não só uma regra escondida no backend.

**O que já está pronto (RF-008):** o modal "Alterar parecer" **sempre exige** um comentário e mostra a dica "A IA sugeriu X; explique a mudança" quando o novo parecer diverge da sugestão; um `422` do backend já aparece no modal. Ou seja, a _exigência_ de comentário nas ações de revisão do frontend já é cumprida. RF-017 fecha as pontas de **visibilidade** e **mensageria**.

Recorte deste ciclo (frontend), em cima do RF-007/008/011:

- **Justificativa da alteração visível no requisito.** Quando `statusFinal ≠ statusSugeridoIa` (o caso que a R-06 governa), o `StatusIaResumo` do bloco expandido passa a mostrar **"Justificativa da alteração: …"** com o texto do `comentario`, logo abaixo de "Parecer atual — alterado na revisão". O `comentario` de itens **não divergentes** continua na linha "Comentário:" de hoje.
- **Erro de revisão fiel à regra.** Quando uma ação de revisão fora do modal (marcar "verificado", RF-011) é recusada com `422`/`AnaliseValidacaoError`, o item mostra **a mensagem do backend** (ex.: "comentário obrigatório quando o parecer difere da sugestão da IA") em vez do genérico "Não foi possível salvar". `409`/`404`/rede continuam com as mensagens de hoje.
- **Sem novo campo de comentário solto na lista** e **sem relaxar** a exigência do modal (o RF-008 decidiu "comentário sempre obrigatório" e o usuário validou — não se mexe nisso aqui).
- **Fora do escopo:** editar só o comentário sem mudar o parecer; histórico de comentários; conclusão (RF-012); visor de PDF (RF-014).

**Critério de aceite (frontend)**

- Num requisito com `statusFinal ≠ statusSugeridoIa` e `comentario` preenchido, o bloco expandido mostra "Justificativa da alteração:" com o texto; num requisito não divergente com `comentario`, continua aparecendo a linha "Comentário:".
- Uma ação de "marcar verificado" recusada com `422` mostra a mensagem do backend no item (`role="alert"`); com `409`/`404`/rede, as mensagens atuais.
- Nenhuma mudança de contrato; nenhuma regressão nos testes do RF-008/RF-011.

**TSD associada (frontend):** `docs/engineering/specs/018-comentario-revisao-frontend.tsd.md`.

### RF-014 — Rastreabilidade documental por referência de página do PDF

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada no `main` `19f308b`)
**Status (frontend):** implementada — Crítico ✅ (02/09/2026), branch `frontend/rf-014-visor`; `npm run ci` verde (214 testes). Aguardando push + merge.

**User Story** — _validada em 31/08/2026_

Como analista técnico, quero, a partir de um requisito, abrir a página do PDF que sustenta o parecer — e ver claramente quando não há página associada — para conferir a evidência sem folhear o documento inteiro.

**User Story (frontend — RF-014)**

Como analista técnico, quero **ver o PDF do processo ao lado da lista de requisitos** e, ao clicar na referência de página de um requisito, **o visor pula para aquela página** — e, quando a página estiver errada ou faltando, **corrigir/definir a página** sem sair da tela.

Recorte deste ciclo (frontend), em cima da tela do RF-010/007/008/009/011/017:

- **Visor de PDF real** no lugar do `AnaliseVisorPlaceholder`: um `<iframe>` com o PDF inteiro servido por `GET /analises/:id/pdf` (backend `19f308b`) + navegação por `#page=N` (decisão do ciclo — nada de extração no servidor). Barra simples: página atual / total (`totalPaginasPdf` do payload) + anterior/próxima + campo de página.
- **Sem backend real (fixtures)** não há PDF → o visor mostra um aviso claro ("O visor abre o PDF quando conectado ao backend") + o total de páginas; a referência de página clicável e a correção continuam funcionando (só não há documento para exibir).
- **Referência de página clicável no requisito**: a linha "Referência de página: Página N" do bloco expandido vira um botão que manda o visor para a página N. `paginaReferencia: null` continua como "não informada" (ausência explícita).
- **Corrigir/definir a página**: no bloco expandido, ao lado da referência, um controle "Editar" → campo numérico + salvar. Envia `PATCH /analises/:id/requisitos/:requisitoId` com `{ paginaReferencia }` (inteiro `1..totalPaginasPdf`, ou `≥1` quando o total é desconhecido, ou `null` para limpar). **Não** dispara a regra de comentário (R-06). Aplica o `{ item, resumo }` devolvido na hora (mecanismo do RF-008/011).
- **Fora do escopo:** destaque de trecho/anotação no PDF; miniaturas; busca no PDF; download; sugestão automática de página pela IA (depende de A-02); campo de página dentro do modal "Alterar parecer" (fica só o editor inline).

**Critério de aceite (frontend)**

- A tela de análise mostra o visor do PDF à esquerda; com backend real, o `<iframe>` carrega `GET /analises/:id/pdf`; com fixtures, um aviso + o total de páginas.
- Clicar na referência de página de um requisito move o visor para aquela página (`#page=N`); `paginaReferencia: null` aparece como "não informada" e não é clicável.
- O editor inline de página envia `PATCH { paginaReferencia }` via `AnalisesGateway` (nenhum componente fala HTTP direto); no sucesso o requisito reflete a nova página e o `resumo` é aplicado; `422` (fora do intervalo) mostra a mensagem do backend; `409`/`404`/rede, mensagens claras.
- Só é possível editar a página quando a análise está `PRONTA_PARA_REVISAO` (igual às demais ações de revisão).
- Nenhuma mudança de contrato; sem regressão nos testes de RF-008/011/017.

**TSD associada (frontend):** `docs/engineering/specs/019-visor-pdf-frontend.tsd.md`.

Recorte backend deste ciclo (reduzido após as decisões — o visor do frontend navega para a página via `#page=N` contra o PDF inteiro que já existe; **não há extração de página no servidor**):

- Persistir o **total de páginas** do PDF de entrada (nova coluna `Analise.totalPaginasPdf`, calculada no `criar` com `pdf-lib`, best-effort).
- Expor `totalPaginasPdf` no `GET /analises/:id`.
- `PATCH /analises/:id/requisitos/:requisitoId` passa a aceitar `paginaReferencia` (corrigir/limpar a página sugerida).
- A ausência de página já é explícita no payload (`paginaReferencia: null`).
- Sem endpoint `?pagina=N`, sem visor, sem destaque de trecho.

**Critérios de aceite**

- Ao criar uma análise, `totalPaginasPdf` é calculado do PDF e persistido; PDF não parseável → `null` (sem falhar a criação).
- `GET /analises/:id` inclui `totalPaginasPdf`.
- `PATCH .../requisitos/:requisitoId` aceita `paginaReferencia`: inteiro entre `1` e `totalPaginasPdf` (quando conhecido) ou `≥ 1` (quando `null`), **ou** `null` para limpar; fora disso → `422`. Definir `paginaReferencia` **não** dispara a regra de comentário (R-06).
- `GET /analises/:id/pdf` (inteiro) segue igual — o frontend usa `#page=N`.
- Testes: unit (contagem de páginas com `pdf-lib`; validação de `paginaReferencia` no PATCH) e integração (criar → `totalPaginasPdf` no payload; `PATCH paginaReferencia` ok e fora do intervalo).

**Decisões do ciclo (respostas do usuário — 31/08/2026)**

1. **Navegação no visor** (`#page=N`) em vez de extração no servidor. `lerPagina` da porta fica como seam não implementado, documentado.
2. Validação de página fora do intervalo passa a ser da `paginaReferencia` no PATCH (`1..totalPaginasPdf` ou `≥ 1` ou `null`) → `422`.
3. **Correção da página pelo analista incluída** no `PATCH` de revisão.
4. Lib: **`pdf-lib`**, só para contar páginas.

**TSD associada:** `docs/engineering/specs/009-pdf-por-pagina.tsd.md` (aprovada e implementada).

**Notas do ciclo (01/09/2026)**

- **Testes:** `npm run ci` ✅ (91 unit, lint, typecheck, `prisma:validate`, build) · `npm run test:e2e` ✅ 32/32.
- **Crítico:** aprovado, sem desvios de escopo. Menores: `contarPaginasPdf` roda no caminho do request de `criar` (aceitável no MVP; mover para o worker se pesar); `pdf-lib` loga warnings de parse em PDFs malformados (ruído, tratado pelo `catch`); 3º parâmetro `totalPaginasPdf` de `validarEResolverPatch` com default `null`.
- **Documentador:** SDD §7/§8/§9; `questoes-abertas.md` P-05 → parcialmente fechada; audit `01/09/2026`.
- **Frente frontend:** consumir `totalPaginasPdf` de `GET /analises/:id` e navegar no visor via `#page=N`; enviar correção de página no `PATCH .../requisitos/:requisitoId` com `paginaReferencia`.

### RF-012 — Conclusão global da análise

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada no `main` `56f83bd`)
**Status (frontend):** implementada — Crítico ✅ (02/09/2026), branch `frontend/rf-012-conclusao`; `npm run ci` verde (240 testes); smoke conjunto contra o NestJS real feito. Aguardando push + merge.

> Ciclo backend agrupado: **RF-012 + RF-013 + RF-015** = "concluir a análise" (um endpoint de conclusão). User Story e critérios abaixo cobrem os três.

**User Story (frontend — RF-012)**

Como analista técnico, quero um botão **"Concluir análise"** na tela, que só habilita quando **todos os requisitos obrigatórios estão verificados**, e uma confirmação antes de fechar — para registrar o parecer final e deixar a análise congelada para consulta, numa única ação.

Recorte deste ciclo (frontend), em cima da tela do RF-010/…/RF-014:

- **Botão "Concluir análise"** no cabeçalho da tela (ao lado do status), visível enquanto a análise está `PRONTA_PARA_REVISAO`.
  - **Desabilitado** enquanto `resumo.obrigatoriosPendentes > 0`, com um texto curto do porquê ("Faltam N requisitos obrigatórios não verificados"). O contador usa o `resumo` **corrente** da sessão (reflete o que o analista acabou de marcar — RF-011), não só o do servidor.
  - **Habilitado** quando `obrigatoriosPendentes === 0`.
- **Modal de confirmação** — "Concluir a análise? Depois disso ela fica **somente leitura**." + Cancelar / Concluir.
- **Confirmar** → `POST /analises/:id/concluir` via `AnalisesGateway.concluirAnalise` (nenhum componente fala HTTP direto).
  - **Sucesso** → a tela reflete `CONCLUIDA` **na hora** (sem reload): o badge de status vira "Concluída", aparece "Concluída em", e **todas as ações de revisão ficam read-only** (o `podeEditar` já deriva do status — "Alterar parecer", checkbox de "verificado" e o editor de página somem/desabilitam). O visor de PDF continua.
  - **`422`** (corrida — alguém desverificou entre a checagem e o clique) → o modal mostra "Ainda faltam N requisitos obrigatórios:" + a lista (`codigo` — `titulo`) que o backend devolve; a análise segue aberta.
  - **`409`** (fora de `PRONTA_PARA_REVISAO`) / **`404`** / rede → mensagem clara no modal.
- **Idempotência:** abrir uma análise já `CONCLUIDA` não mostra o botão; o backend responde `200` idempotente se chamado de novo.
- **Fora do escopo:** baixar o relatório PDF (RF-016 — fica um lugar reservado); reabrir uma análise concluída (fora do MVP); os "modais de etapa concluída" intermediários do protótipo (checklist/técnica) — aqui é uma conclusão única.

**Critério de aceite (frontend)**

- Numa análise `PRONTA_PARA_REVISAO` com obrigatórios pendentes, o botão "Concluir análise" aparece **desabilitado** com o motivo; ao verificar o último obrigatório (RF-011), ele **habilita** sem reload.
- Confirmar no modal chama `POST /analises/:id/concluir`; no sucesso a tela vira `CONCLUIDA` sem reload — badge, "Concluída em" e read-only em tudo; `422` lista os pendentes do backend; `409`/`404`/rede, mensagem clara.
- Numa análise `CONCLUIDA` o botão não aparece.
- Nenhuma mudança de contrato; sem regressão nos testes de RF-008/011/014/017.

**TSD associada (frontend):** `docs/engineering/specs/020-conclusao-analise-frontend.tsd.md`.

**Notas do ciclo (frontend — 02/09/2026)**

- **User Story + TSD-020 validadas** pelo usuário ("Siga o protótipo de alta fidelidade, pode seguir") — o modal segue o enquadramento do `CompletionModal` do protótipo (card central, círculo `--color-brand-muted` + ícone de check, `<h2>`, `<p>`), com 2 ações (Cancelar / Concluir) por ser confirmação irreversível.
- **Implementação:** `AnalisesGateway.concluirAnalise(id)` (Http + Fixtures + contrato) + `AnaliseRequisitosPendentesError` (422, com `.pendentes`); `ConcluirAnalise` (botão no `AnaliseHeader` via prop `acao`, trava por `obrigatoriosPendentes` com `aria-describedby` no motivo; modal portal com A11y do `AlterarParecerModal`); `TelaAnalise` orquestra `detalheEfetivo` (trocado na conclusão, sem `router.refresh()`) + `resumoAtual` (de `onResumoChange` do `PainelRevisao`), e o `AnaliseHeader` migrou do `page.tsx` para dentro dela.
- **Testes:** `npm run ci` verde (lint + typecheck + **240 testes** + `next build`). Contrato de `concluirAnalise` (POST sem corpo; 422 → `AnaliseRequisitosPendentesError`, degrada p/ `[]`; 409/404/500/rede) + fixtures + `ConcluirAnalise` + `TelaAnalise` + `PainelRevisao` (`onResumoChange`).
- **Smoke conjunto contra o backend real** (NestJS + PostgreSQL 17, `:3000` / frontend `:3201`): botão bloqueado com o motivo (11 pendentes) → verificar o último obrigatório pela UI destrava sem reload → corrida real `422` com a lista (`TEC-003 — Habilitação técnica proporcional`) e modal aberto → re-verificar → `200` → tela `CONCLUIDA` read-only, `status`/`concluidaEm` confirmados no banco. Evidência: `frontend/docs/visual-reference/rf-012/`.
- **Crítico:** APROVADO, sem bloqueadores. Ajustes aplicados: foco no "Concluir" num efeito condicionado a `montado` (o portal não existe no efeito de mount); motivo do bloqueio ligado ao `<button>` por `aria-describedby`; plural do motivo simplificado; `ConcluirAnalise` recebe `detalheEfetivo.id`. Não-bloqueadores registrados: `focus()` com ref-null é padrão pré-existente também no `AlterarParecerModal` (follow-up para os dois); em modo fixtures o caminho feliz "verificar → concluir" não é alcançável (`marcarVerificado` não persiste — andaime; caminho real coberto pelo smoke).

**User Story** — _validada em 01/09/2026_

Como analista técnico, quero, quando terminar de verificar todos os requisitos obrigatórios de uma análise, concluí-la numa única confirmação — sem depender de aprovação, assinatura ou segunda pessoa — para registrar o parecer final e deixar a análise pronta para consulta e para o relatório.

Recorte backend deste ciclo:

- `POST /analises/:id/concluir` — muda a análise de `PRONTA_PARA_REVISAO` para `CONCLUIDA` e grava `concluidaEm`, **somente** se não houver nenhum requisito **obrigatório** com `verificado = false` (RF-012). Requisito obrigatório com status final `NAO_SE_APLICA` também precisa estar `verificado`.
- Bloqueio → `422` com a lista dos requisitos obrigatórios ainda pendentes (`codigo`, `titulo`, `area`); a análise continua aberta (`PRONTA_PARA_REVISAO`).
- `409` se a análise não está `PRONTA_PARA_REVISAO` (ex.: `PENDENTE`, `PROCESSANDO`, `ERRO_PROCESSAMENTO`).
- Conclusão é do próprio analista, sem etapa de aprovação/assinatura/dupla revisão (RF-015) — nada além da checagem de obrigatórios.
- **RF-013:** a análise concluída expõe, para consulta, o responsável (`analistaId`), `iniciadaEm`, `concluidaEm` e o `statusFinal` de cada requisito. `iniciadaEm` e `statusFinal` já são persistidos; este ciclo grava `concluidaEm` e passa a incluir `analistaId` no payload de `GET /analises/:id`.
- Depois de `CONCLUIDA`, os requisitos ficam congelados: `PATCH .../requisitos/:requisitoId` já responde `409` fora de `PRONTA_PARA_REVISAO` (sem reabertura no MVP).

**Critérios de aceite**

- `POST /analises/:id/concluir` numa análise `PRONTA_PARA_REVISAO` sem obrigatórios pendentes → `200`, `status = CONCLUIDA`, `concluidaEm` gravado.
- Mesma chamada com ≥ 1 requisito obrigatório não verificado → `422` com a lista de pendentes; nada é gravado; a análise segue `PRONTA_PARA_REVISAO`.
- Requisito **não** obrigatório não verificado **não** bloqueia a conclusão.
- Análise fora de `PRONTA_PARA_REVISAO` → `409`. Análise inexistente para o analista → `404`.
- Segunda chamada de `concluir` numa análise já `CONCLUIDA` → **idempotente `200`** com a análise já concluída (não altera `concluidaEm`).
- `GET /analises/:id` de uma análise concluída traz o responsável (`analistaId` + `analistaNome`), `iniciadaEm`, `concluidaEm` e `statusFinal` por requisito.
- Resposta do `POST /concluir` no sucesso = **payload completo**, no mesmo formato de `GET /analises/:id`.
- Testes: unit da regra de bloqueio (obrigatório vs. não obrigatório; `NAO_SE_APLICA` obrigatório conta; transição de status; idempotência) e integração (criar → processar → verificar todos → concluir `200`; tentar concluir com pendente → `422` + lista; `409` fora de revisão; reconcluir → `200`).

**Decisões do ciclo (respostas do usuário — 01/09/2026)**

1. **Re-conclusão:** idempotente — `POST /concluir` numa análise já `CONCLUIDA` retorna `200` com o payload da análise, sem mexer em `concluidaEm`.
2. **Resposta de sucesso:** payload completo (mesmo corpo de `GET /analises/:id`).
3. **Responsável (RF-013):** _"você decide"_ → expor `analistaId` **e** `analistaNome` (resolvidos pelo `AnalistaAtualProvider`, que já tem os dois na config). Motivo: o relatório PDF (RF-016, próximo ciclo) precisa de um nome legível; custo baixo agora.
4. **Trava (RF-012):** fiel ao PRD — basta que **todo requisito obrigatório esteja `verificado`**. Não se exige que o `statusFinal` tenha sido editado (o analista pode verificar aceitando a sugestão da IA).

**TSD associada:** `docs/engineering/specs/010-conclusao-analise.tsd.md` (aprovada e implementada).

**Notas do ciclo (01/09/2026)**

- **Testes:** `npm run ci` ✅ (97 unit, lint, typecheck, `prisma:validate`, build) · `npm run test:e2e` ✅ 36/36.
- **Crítico:** aprovado, sem desvios de escopo. Menores: `concluir` relê a análise inteira no fim (via `abrir`); `analistaNome` de análises antigas mostra sempre o analista corrente (analista único — P-10); a transição condicional cobre a corrida de status, não a de conteúdo.
- **Documentador:** SDD §7/§8; `questoes-abertas.md` P-01/P-02 anotadas (conclusão interna, auditoria mínima); audit `01/09/2026`.
- **Frente frontend:** `POST /analises/:id/concluir` (botão global, bloqueado até `resumo.obrigatoriosPendentes === 0`); tratar `422` mostrando `requisitosPendentes`; exibir responsável/datas da análise concluída.

### RF-013 — Registro de responsável, datas e status final

**Frentes:** Backend
**Status:** coberto no ciclo de RF-012 (ver seção RF-012)

### RF-015 — Conclusão interna sem aprovação, assinatura ou dupla revisão

**Frentes:** Backend
**Status:** coberto no ciclo de RF-012 (ver seção RF-012)

### RF-016 — Relatório PDF final da análise concluída

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada na `main`)
**Status (frontend):** implementada — Crítico ✅ (02/09/2026), branch `frontend/rf-016-relatorio`; `npm run ci` verde (250 testes); smoke conjunto contra o NestJS real feito. **Fecha o MVP frontend.** Aguardando push + merge.

**User Story (frontend — RF-016)**

Como analista técnico, quando uma análise está **concluída**, quero um botão **"Baixar relatório"** na tela dela para abrir/salvar o relatório PDF final — sem sair da tela, para arquivar ou compartilhar o resultado fora do sistema.

Recorte deste ciclo (frontend), em cima da tela do RF-010/…/RF-012:

- **Botão "Baixar relatório"** no cabeçalho da tela (mesmo lugar do "Concluir análise"), visível **apenas quando `status === "CONCLUIDA"`**. Nas demais situações não aparece (numa análise `PRONTA_PARA_REVISAO` o slot é o "Concluir análise" do RF-012).
- Ao concluir a análise pelo modal do RF-012, o cabeçalho troca "Concluir análise" → "Baixar relatório" **na hora** (sem reload) — o `TelaAnalise` já segura o `detalheEfetivo`.
- Com `NEXT_PUBLIC_API_BASE_URL` definida → o botão é um link para `GET /analises/:id/relatorio` (contrato TSD-011: `application/pdf`, `Content-Disposition: inline`), aberto em nova aba (`target="_blank" rel="noopener noreferrer"`); o visor nativo do browser abre o PDF e o usuário salva se quiser — consistente com o visor do RF-014 (`GET /analises/:id/pdf`).
- **Sem backend** (fixtures) → o botão aparece desabilitado com um aviso curto ("Disponível com a tela conectada ao backend"), como o visor de PDF faz sem `NEXT_PUBLIC_API_BASE_URL`. As fixtures não têm relatório real e não vale forjar um.
- **Nenhum componente fala HTTP direto:** a URL do relatório vem de um seam no gateway (`AnalisesGateway.urlRelatorio(analiseId): string | null`), como o `urlPdf` do RF-014.
- **Fora do escopo:** pré-visualizar o relatório embutido na tela; escolher formato/idioma; baixar o PDF **de entrada** (não é RF); reabrir análise concluída; qualquer mudança no conteúdo do relatório (é o backend TSD-011 que define — este ciclo só entrega o acesso).

**Critério de aceite (frontend)**

- Numa análise `CONCLUIDA`, o cabeçalho mostra **"Baixar relatório"**; ao clicar (com backend), abre `GET /analises/:id/relatorio` (PDF) numa nova aba.
- Numa análise `PRONTA_PARA_REVISAO`/`PROCESSANDO`/`ERRO_PROCESSAMENTO`/`PENDENTE`, o botão **não aparece**.
- Concluir a análise pelo modal do RF-012 troca o botão do cabeçalho para "Baixar relatório" sem reload.
- Sem `NEXT_PUBLIC_API_BASE_URL`, o botão aparece **desabilitado** com o aviso; nenhuma chamada é feita.
- `AnalisesGateway.urlRelatorio` implementado em `Http` (monta `${base}/analises/${id}/relatorio`) e `Fixtures` (`null`); nenhum componente monta a URL sozinho.
- Nenhuma mudança de contrato; `npm run ci` verde; sem regressão em RF-012/014.

**TSD associada (frontend):** `docs/engineering/specs/021-relatorio-pdf-frontend.tsd.md`.

**Notas do ciclo (frontend — 02/09/2026)**

- **User Story + TSD-021 validadas** pelo usuário; decisão da §9 "link em nova aba (não fetch+blob+download forçado)" aprovada — consistente com o `urlPdf` do RF-014 e com a decisão do ciclo backend de entregar `Content-Disposition: inline`.
- **Implementação:** `AnalisesGateway.urlRelatorio(analiseId): string | null` (Http monta `${base}/analises/${id}/relatorio`, id encodado; Fixtures → `null`) — segundo uso do padrão "seam expõe URL de binário", ao lado do `urlPdf`. `BaixarRelatorio` (client, novo): `url` → `<a href target="_blank" rel="noopener noreferrer">Baixar relatório</a>`; `null` → span desabilitado + aviso "Disponível com a tela conectada ao backend." (mesmo tratamento do visor sem backend). `TelaAnalise.acao` ganha o ramo `status === "CONCLUIDA"` → `<BaixarRelatorio>` (o slot do "Concluir análise" do RF-012); concluir pelo modal troca o botão sem reload. `AnaliseHeader` intocado.
- **Testes:** `npm run ci` verde (lint + typecheck + **250 testes / 26 arquivos** + `next build`). Contrato de `urlRelatorio` (Http monta a URL; Fixtures → `null`); `baixar-relatorio.test.tsx` (com/sem url — link vs span+aviso); `tela-analise` (CONCLUIDA mostra "Baixar relatório", PRONTA mostra "Concluir análise"; PENDENTE/PROCESSANDO/ERRO_PROCESSAMENTO nenhum dos dois; link com backend; troca sem reload após concluir).
- **Smoke conjunto contra o backend real** (NestJS + PostgreSQL 17, `:3000` / frontend `:3201`): análise `CONCLUIDA` → botão "Baixar relatório" (`href` do endpoint real, `target="_blank"`); clicar abre nova aba → `GET /analises/:id/relatorio` → `200 application/pdf`, `Content-Disposition: inline; filename="relatorio-analise-<id>.pdf"`, corpo `%PDF-`, o visor nativo renderiza o "Relatório de Análise de Conformidade"; análise `PRONTA_PARA_REVISAO` → "Concluir análise", sem "Baixar relatório"; `GET /relatorio` em análise não `CONCLUIDA` → `409` (confirmado direto na API); modo fixtures → botão desabilitado + aviso. Evidência: `frontend/docs/visual-reference/rf-016/` (3 screenshots + README).
- **Crítico:** APROVADO, sem bloqueadores. Ajuste aplicado: teste parametrizado dos estados sem botão (§8 item 2). Não-bloqueadores: follow-up de A11y unificada nos três botões desabilitados (`BaixarRelatorio` / `ConcluirAnalise` travado / `AnaliseVisor` sem backend) — `aria-describedby` ligando o pseudo-botão ao aviso; fora do escopo desta slice.
- **Marco:** fecha o **MVP frontend** (ver o marco após esta seção).

**User Story** — _validada em 01/09/2026_

Como analista técnico, quero gerar, para uma análise concluída, um relatório PDF com a identificação da análise, o responsável, as datas e o parecer final de cada requisito, para arquivar e compartilhar o resultado da verificação fora do sistema.

Recorte backend deste ciclo:

- `GET /analises/:id/relatorio` → `application/pdf` (`Content-Disposition: inline`), gerado **sob demanda** com `pdfkit` (não persiste — A-04).
- `409` se a análise não está `CONCLUIDA`; `404` se não existe para o analista atual.
- Conteúdo: NUP, objeto, responsável (`analistaId` + `analistaNome`), data/hora de início e de conclusão, **resumo de contagens**, e por requisito o `codigo`/`titulo`, a **norma estruturada** (lei/artigo/inciso/parágrafo/alínea), a **referência de página** (quando houver) e o `statusFinal`. Comentário do analista **fora** deste ciclo.
- Requisitos agrupados por área, na ordem natural (`area` + `ordem`) — documento formal, não a visão "não conformes primeiro" da tela.
- Reaproveita `montarAnaliseDetalhe` (mesmos dados de `GET /analises/:id`).
- Novo `RelatorioModule` com a rota; sem mudança de modelo; sem persistência do arquivo.

**Critérios de aceite**

- `GET /analises/:id/relatorio` numa análise `CONCLUIDA` → `200`, `Content-Type: application/pdf`, corpo com bytes de PDF válido (`%PDF-`).
- O PDF contém, no mínimo: NUP, objeto, nome do responsável, data/hora de início, data/hora de conclusão, o resumo de contagens, e a lista de requisitos com `codigo`/`titulo`, norma, referência de página (quando houver) e `statusFinal` de cada um.
- Análise fora de `CONCLUIDA` → `409`; análise inexistente para o analista → `404`.
- `Content-Type: application/pdf`, `Content-Disposition: inline`.
- Nada é gravado em disco/banco (relatório é efêmero — A-04).
- Testes: unit da composição do relatório (dado um `AnaliseDetalhe`, o documento tem as seções/campos exigidos — sem renderizar pixels) e integração (criar → processar → verificar tudo → concluir → baixar relatório `200 application/pdf` com assinatura `%PDF-`; `409` antes de concluir; `404`).

**Decisões do ciclo (respostas do usuário — 01/09/2026)**

1. **Lib:** `pdfkit` (+ `@types/pdfkit`), como sugerido no SDD §6. Sem headless browser.
2. **Conteúdo além do mínimo do PRD:** incluir o **resumo de contagens**, a **referência de página** por requisito (quando houver) e a **norma estruturada** de cada requisito. **Não** incluir o comentário do analista neste ciclo.
3. **Ordenação:** _"você decide"_ → agrupar por área e listar na ordem natural do requisito (`ordem`), não a visão "não conformes primeiro". Motivo: é um documento de arquivo/compartilhamento, previsível; a priorização é afordância de tela (RF-009).
4. **Entrega:** `Content-Disposition: inline` (abre no visor; usuário salva se quiser), consistente com `GET /analises/:id/pdf`.

**TSD associada:** `docs/engineering/specs/011-relatorio-pdf.tsd.md` (aprovada e implementada).

**Notas do ciclo (01/09/2026)**

- **Testes:** `npm run ci` ✅ (106 unit, lint, typecheck, `prisma:validate`, build) · `npm run test:e2e` ✅ 39/39.
- **Crítico:** aprovado, sem desvios de escopo. Menores: o texto do PDF não é assertável por extração (`pdfkit` não devolve texto) — a lógica de conteúdo mora em `montarModeloRelatorio` (puro, testado), o render tem smoke; fuso fixado em `America/Sao_Paulo`; documento montado em memória (ok no MVP).
- **Documentador:** SDD §7 ("Relatório PDF" — contrato final); `questoes-abertas.md` **A-04 fechada para o MVP** (sob demanda, sem persistir); audit `01/09/2026`.
- **Frente frontend:** botão "baixar relatório" na tela da análise concluída → `GET /analises/:id/relatorio` (abre inline / salva).

> **Marco:** com RF-016 mergeado, o **backend de features do MVP está completo**. A integração com o serviço de IA real (A-02) foi implementada como `AnaliseIaOpenAiAdapter` na branch `backend/ia-openai` (TSD-022) — resta a aprovação de merge e o smoke ponta-a-ponta com a `OPENAI_API_KEY` real.

> **Marco (frontend — 02/09/2026):** com RF-016 (frontend) mergeado, o **MVP frontend está completo**. As 12 linhas da tabela de sequenciamento do frontend estão `implementada — Crítico ✅`. `/` (listagem + "Nova análise") e `/analise/[id]` (visor de PDF + navegação por página, revisão de requisitos com status sugerido pela IA, "Alterar parecer", "verificado" interativo, justificativa visível, referência de página clicável + editor, "Concluir análise" com trava por obrigatórios, "Baixar relatório") cobrem todos os RFs de frontend. Consumidos 6 contratos do backend (`GET /analises`, `POST /analises`, `GET /analises/:id`, `GET /analises/:id/pdf`, `PATCH /analises/:id/requisitos/:requisitoId`, `POST /analises/:id/concluir`) + o link para `GET /analises/:id/relatorio`; todos com teste de contrato e smoke conjunto contra o NestJS real. Pendências gerais do MVP: a integração da IA real (backend, A-02) e os follow-ups de acabamento anotados no checkpoint.

### RF-003 — Restrição de visualização das análises ao analista que as iniciou

**Frentes:** Backend
**Status:** não iniciada — pós-MVP (depende de `questoes-abertas.md` P-10)
