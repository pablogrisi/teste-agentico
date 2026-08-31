# TSD — Criar análise com PDF persistido (RF-001 + RF-004 + RF-018, backend)

---
title: TSD - Criar análise com PDF persistido (RF-001/RF-004/RF-018, backend)
type: tsd
status: concluída — mergeada no main (9dd6792)
created: 31/08/2026 // Pablo Grisi (Engenheiro)
updated: 31/08/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/001-fundacao-tecnica.tsd.md
- docs/engineering/specs/003-base-fixa-requisitos.tsd.md
---

## 1. Resumo

Entrega o recorte backend do primeiro fluxo de produto: registrar uma análise a partir de NUP, objeto/descrição e um PDF enviado manualmente, persistindo o PDF e o registro. Cobre RF-001 (criar), RF-004 (upload manual) e RF-018 (persistência do PDF), na camada de backend.

**User Story de origem:** `docs/product/roadmap.md`, feature RF-001 (recorte backend, ciclo agrupado RF-001+RF-004+RF-018), User Story e decisões de ciclo aprovadas em 31/08/2026.

## 2. Objetivo técnico

- Modelo Prisma `Analise` + migration.
- `POST /analises` (multipart) que valida entrada, persiste o PDF via `ArmazenamentoPdfPort` e cria a `analise` sob o analista fixo, `status = PENDENTE`.
- `GET /analises/:id` e `GET /analises/:id/pdf`.
- Validação de PDF: mimetype + magic bytes + limite de tamanho + recusa de PDF protegido por senha.
- Testes unitários da validação e do serviço; integração do fluxo completo contra PostgreSQL embutido + filesystem real.

## 3. Escopo

### Incluído

- **Modelo Prisma `Analise`** (`@@map("analise")`):
  - `id` (uuid, PK)
  - `nup` (string) — string livre no MVP; validada só como não-vazia e `<= 60` chars
  - `objeto` (string) — não-vazia, `<= 2000` chars
  - `analistaId` (`@map("analista_id")`) — do `AnalistaAtualProvider`
  - `arquivoPdfRef` (`@map("arquivo_pdf_ref")`) — referência devolvida por `ArmazenamentoPdfPort.salvar`
  - `status` (string, default `"PENDENTE"`) — **não** enum de banco; validado contra `STATUS_ANALISE` em `src/analises/status-analise.ts` (`PENDENTE`, `PROCESSANDO`, `PRONTA_PARA_REVISAO`, `ERRO_PROCESSAMENTO`, `CONCLUIDA`). Neste slice só `PENDENTE` é escrito.
  - `motivoErro` (`@map("motivo_erro")`, nullable) — reservado para RF-005
  - `iniciadaEm` (`@map("iniciada_em")`, default now)
  - `concluidaEm` (`@map("concluida_em")`, nullable) — reservado para RF-012
  - `criadoEm`, `atualizadoEm`
  - índice `@@index([analistaId, iniciadaEm])`
- **Migration** `*_criar_analise` (hand-written seguindo o estilo do Prisma; verificada pelo `migrate deploy` do `test:e2e`).
- **`src/analises/status-analise.ts`**: constante `STATUS_ANALISE` + `isStatusAnalise`.
- **`AnalisesController`** (em `AnalisesModule`):
  - `POST /analises` — `@UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize } }))`, `@UploadedFile()` + `@Body()` (`nup`, `objeto`). Fluxo:
    1. `ValidacaoAnaliseService.validar({ nup, objeto, arquivo })` — acumula erros; se houver → `UnprocessableEntityException` (422) com a lista, **nada é criado**.
    2. `armazenamentoPdf.salvar(arquivo.buffer)` → `ref`. Falha → `BadGatewayException` (502), nada criado.
    3. `prisma.analise.create({ data: { nup, objeto, analistaId, arquivoPdfRef: ref, status: 'PENDENTE', iniciadaEm } })`. Falha após o passo 2 → loga `ref` como PDF órfão (best-effort; `ArmazenamentoPdfPort` não tem `delete` no MVP) e propaga 500.
    4. `201` com `{ id, nup, objeto, status, iniciadaEm }`.
  - `GET /analises/:id` — `prisma.analise.findFirst({ where: { id, analistaId } })`; `null` → `NotFoundException` (404). Devolve os campos + status (sem o PDF).
  - `GET /analises/:id/pdf` — mesma busca; 404 se não achar. `armazenamentoPdf.ler(ref)` → responde `application/pdf`, `Content-Disposition: inline; filename="analise-<id>.pdf"`. Falha de leitura → 404.
- **`ValidacaoAnaliseService`** (unitário puro, sem Nest DI obrigatória):
  - `nup`: `trim` não-vazio, `<= 60`.
  - `objeto`: `trim` não-vazio, `<= 2000`.
  - `arquivo`: presente; `mimetype === 'application/pdf'`; primeiros bytes `%PDF-`; tamanho `<= ANALISE_PDF_TAMANHO_MAX_MB` (default 25); **não** contém a marca `/Encrypt` (heurística de PDF protegido — documentada como heurística).
- **`AnalisesService`**: `criar(input)`, `buscarPorId(id)`, `lerPdf(id)` — recebe `analistaId` do `AnalistaAtualProvider`.
- **Config**: `ANALISE_PDF_TAMANHO_MAX_MB` (default `25`) em `env.validation.ts` + `configuration.ts`.
- **Dep nova**: `@types/multer` (dev) — `multer` já vem com `@nestjs/platform-express`.
- **Testes** (ver §7).

### Fora do escopo

- Listagem `GET /analises` (RF-002).
- Worker de processamento, transição de status, chamada à `AnaliseIaPort` (RF-005).
- Avaliação de requisitos por análise, `avaliacao_requisito` (RF-007+).
- Entrega de PDF por página / referência de página (RF-014).
- Conclusão / `concluidaEm` (RF-012).
- Escopo multiusuário / 403 entre analistas (P-10) — a query já filtra por `analistaId`, mas com analista único o efeito é só 404.
- Exclusão de PDF órfão (sem `delete` no `ArmazenamentoPdfPort` no MVP).
- Máscara/validação de formato do NUP.
- Frente frontend.

## 4. Contexto consultado

- `START_HERE.md`, `.ai-dev/context-map.md`, `docs/engineering/checkpoint.md`
- `docs/product/prd.md` — RF-001, RF-004, RF-018, §9 (estados de erro: PDF inválido, erro no upload, erro de persistência)
- `docs/architecture/sdd.md` — §7 (fluxo "Criar análise e processar"), §8 (`analise`), §6 (`AnalisesModule`, portas)
- `docs/product/glossario.md` — "Análise", "NUP", "PDF de entrada"
- `docs/engineering/specs/001-*` (portas, config, testes), `003-*` (padrão string+allowlist, migration, integração)
- `.ai-dev/quality-gates.md`

## 5. Impacto esperado

- **Produto:** primeiro fluxo utilizável — criar e recuperar uma análise + seu PDF. Sem processamento ainda.
- **Arquitetura:** segunda tabela de domínio (`analise`); primeiro controller de produto; primeiro uso real de `ArmazenamentoPdfPort` e `AnalistaAtualProvider`.
- **Implementação:** `src/analises/**`, migration, config nova, `@types/multer`.
- **Testes:** primeira integração de endpoint multipart (Supertest `.attach`).
- **Documentação:** SDD §8 (`analise` de "proposto" para "implementado"), checkpoint, audit, roadmap (RF-001/004/018).
- **Operação:** `ARMAZENAMENTO_PDF_DIR` passa a receber arquivos de verdade; `ANALISE_PDF_TAMANHO_MAX_MB` nova.

## 6. Plano de implementação

1. `prisma/schema.prisma`: modelo `Analise`. `prisma generate`.
2. Migration `*_criar_analise` (hand-written); validar aplicando via `test:e2e`.
3. `src/analises/status-analise.ts`.
4. `src/config`: `ANALISE_PDF_TAMANHO_MAX_MB`.
5. `ValidacaoAnaliseService` + testes unitários.
6. `AnalisesService` (criar/buscar/lerPdf) + testes unitários com prisma e portas mockados.
7. `AnalisesController` + `FileInterceptor`; registrar controller/serviços no `AnalisesModule`.
8. `@types/multer`.
9. Integração `test/integration/analises.integration-spec.ts`: POST multipart (PDF mínimo) → 201; GET → confere; GET /pdf → mesmos bytes; POST inválido → 422 e contagem 0; 404s.
10. Rodar `npm run ci` + `npm run test:e2e`; registrar saída real.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `ValidacaoAnaliseService` (nup/objeto vazios e longos, sem arquivo, mimetype errado, magic bytes errados, acima do limite, `/Encrypt`). `AnalisesService.criar` (happy path; `salvar` falha → sem `create`; `create` falha → propaga) com prisma e `ArmazenamentoPdfPort` mockados. |
| Integração | Sim | App real + PostgreSQL embutido + `ArmazenamentoPdfFilesystemAdapter` real (dir temporário). Fluxo criar → buscar → baixar PDF; rejeição 422 sem criar linha; 404 de análise inexistente e de PDF ausente. |
| Contrato | Não | Nenhum serviço externo neste slice (a `AnaliseIaPort` só entra no RF-005). |
| Smoke/validação manual contra dependência externa real | Não | Sem dependência externa real. |

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npx prisma validate
```

## 8. Critérios de aceite

- [ ] `prisma/schema.prisma` tem `Analise` conforme §3; `npx prisma validate` passa; a migration aplica num banco limpo (verificado pelo `test:e2e`).
- [ ] `POST /analises` com `nup`, `objeto` e PDF válido → `201` com `{ id, status: "PENDENTE", ... }`; a `analise` existe no banco com `arquivo_pdf_ref` preenchido e o PDF está no `ARMAZENAMENTO_PDF_DIR`.
- [ ] `POST /analises` sem `nup`, sem `objeto`, sem arquivo, com arquivo não-PDF, com arquivo acima de 25 MB, ou com PDF `/Encrypt` → `422` com motivo, e **nenhuma** linha de `analise` criada.
- [ ] Falha ao persistir o PDF → resposta de erro (`502`) e nenhuma linha criada.
- [ ] `GET /analises/:id` devolve os campos + status; `404` para id inexistente.
- [ ] `GET /analises/:id/pdf` devolve exatamente os bytes enviados, `Content-Type: application/pdf`; `404` se a análise ou o arquivo não existir.
- [ ] `status` é string validada por `STATUS_ANALISE` (não enum de banco); só `PENDENTE` é escrito neste slice.
- [ ] Nenhum endpoint de listagem, nenhum worker, nenhuma outra tabela.
- [ ] `npm run ci` e `npm run test:e2e` verdes, com saída real registrada.

## 9. Riscos e decisões abertas

- **PDF órfão** em falha de `create` após `salvar` OK: aceito no MVP (log), porque `ArmazenamentoPdfPort` não tem `delete`. Se virar problema, adicionar `remover(ref)` à porta num slice futuro.
- **Heurística de "PDF protegido"** (`/Encrypt` no conteúdo): pode ter falso positivo (a string aparecer em conteúdo legítimo) ou falso negativo em casos raros. Suficiente para o MVP; validação real de criptografia fica para quando/se necessário.
- **Migration hand-written**: verificada por `migrate deploy` + testes de integração que exercem as colunas reais via Prisma Client. Se o time preferir gerar via `prisma migrate dev` contra um Postgres, o resultado deve ser idêntico.
- **`nup` livre**: máscara de formato é questão aberta (registrar em `questoes-abertas.md` se ainda não estiver).
- Não altera decisões do SDD além de promover `analise` de "proposto" para "implementado" e confirmar `status` como string+allowlist (§8) — Documentador ajusta o SDD.

## 10. Referências visuais

Não se aplica — slice de backend, sem interface.

## 11. Rollback

- Reverter a migration (nova migration `DROP TABLE "analise"`).
- Remover `src/analises/**` (voltar `AnalisesModule` para `@Module({})`), a config `ANALISE_PDF_TAMANHO_MAX_MB`, `@types/multer`, e `test/integration/analises.integration-spec.ts`.
- Nenhum outro módulo depende de `AnalisesService` ainda. PDFs gravados em dev ficam no `ARMAZENAMENTO_PDF_DIR` (apagáveis à mão).

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (004), a TSD-001/003 e o checkpoint.
Implemente apenas o escopo desta TSD, em backend/, na branch backend/rf-001-criar-analise.
NÃO crie listagem, worker, avaliação de requisitos, entrega por página, nem conclusão.
Valide o PDF por mimetype + magic bytes + limite (ANALISE_PDF_TAMANHO_MAX_MB, default 25) +
ausência de /Encrypt. `status` é string validada por STATUS_ANALISE, não enum de banco.
Em erro de validação: 422 e nada criado. Em erro de persistência do PDF: 502 e nada criado.
Execute npm run ci e npm run test:e2e e registre a saída real.
Atualize checkpoint e .ai-dev/audit.md ao final.
```
