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
| 5 | RF-002 | Endpoint de listagem das análises do analista | Must | em construção |
| 6 | RF-005 | Worker de processamento do PDF pela `AnaliseIaPort` | Must | não iniciada |
| 7 | RF-007 | Gravação da sugestão de status por requisito (3 valores) | Must | não iniciada |
| 8 | RF-009 | Ordenação da resposta priorizando não conformes | Must | não iniciada |
| 9 | RF-008 | Endpoint de definição do status final do requisito | Must | não iniciada |
| 10 | RF-011 | Endpoint de marcação de "verificado" | Must | não iniciada |
| 11 | RF-017 | Validação de comentário obrigatório nas ações de revisão | Must | não iniciada |
| 12 | RF-014 | Referência de página + entrega do PDF por página | Must | não iniciada |
| 13 | RF-012 | Endpoint de conclusão global com trava por obrigatórios | Must | não iniciada |
| 14 | RF-013 | Registro de responsável, datas e status final | Must | não iniciada |
| 15 | RF-015 | Conclusão interna sem aprovação/assinatura/dupla revisão | Must | não iniciada |
| 16 | RF-016 | Geração sob demanda do relatório PDF final | Must | não iniciada |
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
**Status (backend):** em construção
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
**Status:** não iniciada

### RF-007 — Sugestão de status por requisito

**Frentes:** Backend · Frontend
**Status (backend):** não iniciada
**Status (frontend):** não iniciada

### RF-009 — Abertura da análise priorizando requisitos não conformes

**Frentes:** Backend · Frontend
**Status (backend):** não iniciada
**Status (frontend):** não iniciada

### RF-010 — Navegação livre entre seções e abas da análise

**Frentes:** Frontend (backend entrega os requisitos agrupados por área)
**Status:** não iniciada

### RF-008 — Definição do status final de cada requisito

**Frentes:** Backend · Frontend
**Status (backend):** não iniciada
**Status (frontend):** não iniciada

### RF-011 — Marcar requisito como verificado

**Frentes:** Backend · Frontend
**Status (backend):** não iniciada
**Status (frontend):** não iniciada

### RF-017 — Comentário obrigatório nas ações de revisão

**Frentes:** Backend · Frontend
**Status (backend):** não iniciada
**Status (frontend):** não iniciada

### RF-014 — Rastreabilidade documental por referência de página do PDF

**Frentes:** Backend · Frontend
**Status (backend):** não iniciada
**Status (frontend):** não iniciada

### RF-012 — Conclusão global da análise

**Frentes:** Backend · Frontend
**Status (backend):** não iniciada
**Status (frontend):** não iniciada

### RF-013 — Registro de responsável, datas e status final

**Frentes:** Backend
**Status:** não iniciada

### RF-015 — Conclusão interna sem aprovação, assinatura ou dupla revisão

**Frentes:** Backend
**Status:** não iniciada

### RF-016 — Relatório PDF final da análise concluída

**Frentes:** Backend · Frontend
**Status (backend):** não iniciada
**Status (frontend):** não iniciada

### RF-003 — Restrição de visualização das análises ao analista que as iniciou

**Frentes:** Backend
**Status:** não iniciada — pós-MVP (depende de `questoes-abertas.md` P-10)
