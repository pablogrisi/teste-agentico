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

| Sequência | ID | Feature (recorte backend) | Prioridade | Status |
|---|---|---|---|---|
| 1 | RF-006 | Base fixa de requisitos: modelo + seed persistido | Must | implementada |
| 2 | RF-001 | Endpoint de criação de análise (NUP, objeto, PDF) | Must | implementada |
| 3 | RF-004 | Recebimento de upload manual de PDF (multipart) | Must | implementada com RF-001 |
| 4 | RF-018 | Persistência do PDF de entrada associada à análise | Must | implementada com RF-001 |
| 5 | RF-002 | Endpoint de listagem das análises do analista | Must | implementada |
| 6 | RF-005 | Worker de processamento do PDF pela `AnaliseIaPort` | Must | implementada |
| 7 | RF-007 | Gravação da sugestão de status por requisito (3 valores) | Must | implementada com RF-005 |
| 8 | RF-009 | Ordenação da resposta priorizando não conformes | Must | implementada |
| 9 | RF-008 | Endpoint de definição do status final do requisito | Must | implementada |
| 10 | RF-011 | Endpoint de marcação de "verificado" | Must | implementada com RF-008 |
| 11 | RF-017 | Validação de comentário obrigatório nas ações de revisão | Must | implementada com RF-008 |
| 12 | RF-014 | Referência de página + entrega do PDF por página | Must | implementada |
| 13 | RF-012 | Endpoint de conclusão global com trava por obrigatórios | Must | implementada |
| 14 | RF-013 | Registro de responsável, datas e status final | Must | implementada (com RF-012) |
| 15 | RF-015 | Conclusão interna sem aprovação/assinatura/dupla revisão | Must | implementada (com RF-012) |
| 16 | RF-016 | Geração sob demanda do relatório PDF final | Must | TSD em aprovação |
| 17 | RF-003 | Escopo de acesso por analista | Must (fase com identidade) | não iniciada — pós-MVP (P-10) |

## Tabela de sequenciamento — Frente Frontend (`frontend/`)

| Sequência | ID | Feature (recorte frontend) | Prioridade | Status |
|---|---|---|---|---|
| 1 | RF-002 | Tela de listagem de análises + estado vazio | Must | não iniciada |
| 2 | RF-001 | Modal "Nova análise" (NUP, objeto) + validação | Must | não iniciada |
| 3 | RF-004 | Campo de upload de PDF no modal + estados de erro | Must | não iniciada |
| 4 | RF-010 | Tela de análise: abas Checklist/Técnica + navegação livre | Must | não iniciada |
| 5 | RF-007 | Exibição dos requisitos com status sugerido pela IA | Must | não iniciada |
| 6 | RF-009 | Visão inicial priorizando não conformes + filtros por status | Must | não iniciada |
| 7 | RF-008 | Modal de alteração de status final ("parecer") | Must | não iniciada |
| 8 | RF-011 | Controle de "marcar como verificado" | Must | não iniciada |
| 9 | RF-017 | Campo de comentário obrigatório nas ações de revisão | Must | não iniciada |
| 10 | RF-014 | Visor de PDF + referência de página clicável / ausência explícita | Must | não iniciada |
| 11 | RF-012 | Modal de conclusão + botão global bloqueado até tudo verificado | Must | não iniciada |
| 12 | RF-016 | Ação de baixar o relatório PDF da análise concluída | Must | não iniciada |

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
**Status (frontend):** não iniciada

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

**TSD associada:** `docs/engineering/specs/004-criar-analise.tsd.md` (a redigir pelo Engenheiro).

### RF-004 — Upload manual de PDF na criação da análise

**Frentes:** Backend · Frontend
**Status (backend):** coberto no ciclo de RF-001 (ver seção RF-001)
**Status (frontend):** não iniciada

### RF-018 — Persistência do PDF de entrada, associado à análise

**Frentes:** Backend
**Status:** coberto no ciclo de RF-001 (ver seção RF-001) — persistência via `ArmazenamentoPdfPort` + `analise.arquivo_pdf_ref`; retenção/object storage seguem abertos (P-09, A-05)

### RF-002 — Listagem das análises do analista

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada no `main` `57b170f`)
**Status (frontend):** não iniciada

**User Story**

Como analista técnico, quero ver a lista das análises que criei, com identificação suficiente e o status de cada uma, para reabrir a que eu precisar e acompanhar o andamento.

Recorte backend deste ciclo: `GET /analises` — devolve as análises do analista atual, com busca/filtro/ordenação/paginação a definir (P-06). Sem alteração no modelo `Analise`. Sem a tela (frente frontend).

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
**Status (frontend):** não iniciada

### RF-009 — Abertura da análise priorizando requisitos não conformes

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada no `main` `96ff8fb`)
**Status (frontend):** não iniciada

**User Story**

Como analista técnico, quero abrir uma análise e ver os requisitos avaliados — com os não conformes em primeiro plano e um resumo do estado — para começar a revisão pelo que mais importa.

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
**Status:** não iniciada

### RF-008 — Definição do status final de cada requisito

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada no `main` `ad2e8cd`)
**Status (frontend):** não iniciada

> Ciclo backend agrupado: **RF-008 + RF-011 + RF-017** = "revisar um requisito" (um endpoint de PATCH). User Story e critérios abaixo cobrem os três.

**User Story**

Como analista técnico, quero, ao revisar um requisito, definir o parecer final (podendo alterar a sugestão da IA), marcá-lo como verificado e registrar um comentário quando exigido, para consolidar minha avaliação daquele item.

Recorte backend deste ciclo: `PATCH /analises/:id/requisitos/:requisitoId` que atualiza `statusFinal`, `verificado` e/ou `comentario` de uma avaliação; alterar `statusFinal` marca `verificado = true`; comentário obrigatório conforme a regra de P-03. Sem tela (frontend), sem conclusão da análise (RF-012).

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
**Status (frontend):** não iniciada

### RF-017 — Comentário obrigatório nas ações de revisão

**Frentes:** Backend · Frontend
**Status (backend):** coberto no ciclo de RF-008 (ver seção RF-008); regra exata em P-03
**Status (frontend):** não iniciada

### RF-014 — Rastreabilidade documental por referência de página do PDF

**Frentes:** Backend · Frontend
**Status (backend):** implementada (mergeada no `main` `19f308b`)
**Status (frontend):** não iniciada

**User Story** — *validada em 31/08/2026*

Como analista técnico, quero, a partir de um requisito, abrir a página do PDF que sustenta o parecer — e ver claramente quando não há página associada — para conferir a evidência sem folhear o documento inteiro.

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
**Status (frontend):** não iniciada

> Ciclo backend agrupado: **RF-012 + RF-013 + RF-015** = "concluir a análise" (um endpoint de conclusão). User Story e critérios abaixo cobrem os três.

**User Story** — *validada em 01/09/2026*

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
3. **Responsável (RF-013):** *"você decide"* → expor `analistaId` **e** `analistaNome` (resolvidos pelo `AnalistaAtualProvider`, que já tem os dois na config). Motivo: o relatório PDF (RF-016, próximo ciclo) precisa de um nome legível; custo baixo agora.
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
**Status (backend):** TSD em aprovação
**Status (frontend):** não iniciada

**User Story** — *validada em 01/09/2026*

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
3. **Ordenação:** *"você decide"* → agrupar por área e listar na ordem natural do requisito (`ordem`), não a visão "não conformes primeiro". Motivo: é um documento de arquivo/compartilhamento, previsível; a priorização é afordância de tela (RF-009).
4. **Entrega:** `Content-Disposition: inline` (abre no visor; usuário salva se quiser), consistente com `GET /analises/:id/pdf`.

**TSD associada:** `docs/engineering/specs/011-relatorio-pdf.tsd.md` (redigida — em aprovação).

### RF-003 — Restrição de visualização das análises ao analista que as iniciou

**Frentes:** Backend
**Status:** não iniciada — pós-MVP (depende de `questoes-abertas.md` P-10)
