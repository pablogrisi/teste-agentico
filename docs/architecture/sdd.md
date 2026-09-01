# SDD — LicIA Analisadora

---
title: SDD - LicIA Analisadora
type: sdd
status: aprovado
created: 31/08/2026 // Pablo Grisi
updated: 31/08/2026 // Pablo Grisi (baseline aprovado na fundação)
related (internal files):
- docs/product/prd.md
- docs/product/questoes-abertas.md
- docs/engineering/decisions/001-framework-backend-nestjs.md
---

## 1. Objetivo da solução

Viabilizar tecnicamente o MVP descrito no PRD:

- Registrar análises de processos licitatórios (NUP, objeto, PDF), cada uma sob o analista único configurado.
- Persistir o PDF de entrada e mantê-lo recuperável, inclusive por página, associado à análise.
- Acionar/consumir uma capacidade externa de análise assistida por IA que produz, por requisito, um status sugerido e uma referência de página, sem esperar o resultado numa única requisição HTTP.
- Persistir a base fixa de requisitos e, por análise, a avaliação de cada requisito (status sugerido pela IA, status final do analista, verificado, comentário, página).
- Bloquear a conclusão da análise enquanto houver requisito obrigatório não verificado; registrar responsável (analista fixo) e datas de início/conclusão.
- Gerar sob demanda um relatório PDF da análise concluída.
- Expor estados de erro e vazio de forma explícita para o frontend.

## 2. Contexto técnico atual

- **Sistema atual:** não há sistema legado a evoluir. LicIA Analisadora é novo. O repositório é um **monorepo** com duas frentes independentes: `backend/` (este SDD — serviço NestJS + banco, responsável Pablo) e `frontend/` (aplicação Next.js, responsável Vinicius, com sua própria fundação técnica na TSD-002). Método e docs compartilhados na raiz. Existe um protótipo de referência de UX em `Prototipo Licia Analisadora/` (React + Vite) — referência visual, não fonte de cópia de código. Este SDD descreve o backend; o frontend consome os contratos REST definidos nas TSDs de backend de cada RF.
- **Stack:**
  - Linguagem: **TypeScript** (Node.js LTS 20+), por consistência com o ecossistema do time.
  - Backend: **NestJS** — decisão registrada em `docs/engineering/decisions/001-framework-backend-nestjs.md` (alternativa descartada: Fastify puro).
  - Banco: **PostgreSQL**, acessado via **Prisma** (migrations + tipos gerados).
  - Armazenamento do PDF: **filesystem/volume** no MVP, caminho referenciado no banco (ver §9 e `questoes-abertas.md` A-05).
  - Processamento assíncrono: **em processo**, dentro do próprio serviço, com estado persistido no banco (sem Redis/fila dedicada no MVP — ver §9 e A-06).
  - Geração de PDF do relatório: biblioteca leve de composição (ex.: `pdfkit`), sem headless browser.
  - Deploy: um único contêiner do serviço + PostgreSQL gerenciado, na infraestrutura interna da PGE. Volume persistente para os PDFs. Volume baixo de uso — sem requisito de auto-scaling.
- **Módulos/serviços envolvidos:** API LicIA, worker de processamento (mesmo processo), banco PostgreSQL, volume de arquivos.
- **Integrações:**
  1. **Capacidade de análise assistida por IA** — recebe o PDF + a base de requisitos e devolve, por requisito, status sugerido e página. Pode já existir ou ser construída em paralelo; o projeto a trata como dependência externa atrás de uma porta (`AnaliseIaPort`). Contrato a confirmar (`questoes-abertas.md` A-02).
  2. *(Pós-MVP)* **Serviço de identidade do ecossistema** — forneceria a identidade validada do analista quando a separação por analista (RF-003) entrar. Fora do escopo desta versão (`questoes-abertas.md` P-10, A-01).
- **Limitações conhecidas:**
  - Processamento do PDF pode levar minutos em documentos grandes → não pode ser síncrono numa requisição HTTP; exige acompanhamento de status.
  - Documentos são de processo licitatório de órgão público → PDF é dado sensível; acesso ao volume e aos endpoints deve ser restrito na infra.
  - Volume de uso baixo (ferramenta interna de um time) → não desenhar para escala alta agora.
  - A capacidade de IA é dependência potencialmente instável/custosa → isolar atrás de porta, com adapter stub para desenvolvimento e testes.

## 3. Escopo técnico

### Dentro do escopo

- Serviço backend NestJS com os módulos: Análises, Requisitos/Avaliações, Processamento, Relatório.
- Modelo de dados e migrations para: análise, requisito (base fixa), avaliação de requisito por análise.
- Endpoints REST para criar/listar/abrir análise, revisar requisito, concluir análise, baixar PDF de entrada e baixar relatório.
- Persistência do PDF de entrada em volume, com recuperação por análise e por página.
- Worker em processo que consome análises pendentes, chama a `AnaliseIaPort` e grava as sugestões, com máquina de status persistida.
- `AnaliseIaPort` com dois adapters: **stub** (determinístico, para dev/teste) e **HTTP real** (contra o serviço externo, quando o contrato existir).
- `AnalistaAtualProvider`: devolve o analista único definido por configuração; toda análise é criada e consultada sob esse id. Seam deliberado para trocar por identidade real depois sem reescrever as queries.
- Geração sob demanda do relatório PDF da análise concluída.
- Seed da base de requisitos a partir de um arquivo versionado (conteúdo do primeiro subconjunto é placeholder até P-07).
- Respostas de erro padronizadas cobrindo os estados aplicáveis do PRD §9.

### Fora do escopo

- Autenticação, cadastro de usuário, login, emissão/renovação de token.
- Múltiplos analistas e separação de acesso por analista (RF-003) — pós-MVP (`questoes-abertas.md` P-10).
- Consumo do serviço de identidade do ecossistema.
- O modelo de IA em si e o pipeline de extração/OCR do PDF (responsabilidade da capacidade externa).
- Frontend (`frontend/`, frente própria: TSD-002 de fundação e ciclos próprios por RF).
- Aprovação, dupla revisão, assinatura.
- Versionamento de documentos, comparação de versões, destaque de trecho no PDF além da referência de página.
- Fila/broker dedicado, auto-scaling, alta disponibilidade multi-nó.
- Política de retenção/expiração do PDF e migração para object storage (abertos: P-09, A-05).

## 4. Estratégia da solução

Um único serviço backend expõe uma API REST para o frontend Next.js e encapsula todo o estado da análise no PostgreSQL. O PDF de entrada é gravado num volume e referenciado pelo banco.

A criação de uma análise é uma operação rápida: valida entrada, grava o PDF, cria a linha de `analise` em estado `PENDENTE` e responde. O trabalho lento (chamar a IA para todos os requisitos) roda **fora do ciclo de request**, num worker no mesmo processo que varre análises pendentes, processa uma de cada vez e avança a máquina de status. O frontend acompanha por polling em `GET /analises/:id`. Como o estado do job vive no banco, uma reinicialização do serviço não perde trabalho: no boot, o worker re-seleciona análises presas em `PENDENTE`/`PROCESSANDO`.

A capacidade de IA entra como **porta** (`AnaliseIaPort`) com adapters trocáveis por configuração. Isso permite desenvolver, testar e rodar o MVP mesmo antes de o contrato externo estar fechado, e isola instabilidade/custo da IA do resto do sistema.

Não há identidade no MVP: o `AnalistaAtualProvider` devolve sempre o analista configurado, e as análises são gravadas e lidas sob esse id. Toda query de análise já é escrita filtrando por `analista_id` — quando identidade real entrar, troca-se só o provider.

## 5. Arquitetura proposta

```text
                 ┌─────────────────────────────┐
                 │   Frontend LicIA (Next.js)   │   (frente própria, frontend/)
                 └───────────────┬─────────────┘
                                 │ HTTPS / REST
                                 ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      Serviço LicIA Analisadora (NestJS)                 │
│                                                                       │
│  AnalistaAtualProvider ──> devolve o analista único configurado        │
│                                                                       │
│  ┌───────────────┐  ┌────────────────────┐  ┌──────────────────────┐   │
│  │ Módulo         │  │ Módulo Requisitos  │  │ Módulo Relatório      │   │
│  │ Análises       │  │ / Avaliações       │  │ (gera PDF sob demanda)│   │
│  │ (CRUD, upload) │  │ (base fixa + revisão)│ └──────────────────────┘   │
│  └──────┬────────┘  └─────────┬──────────┘                              │
│         │                     │                                        │
│  ┌──────▼─────────────────────▼───────┐   ┌────────────────────────┐    │
│  │ Worker de processamento (em processo)│──▶│ AnaliseIaPort          │    │
│  │  varre PENDENTE, avança status        │   │  ├─ StubAdapter (dev)  │    │
│  └──────┬───────────────────────────────┘   │  └─ HttpAdapter (real)─┼──▶ Capacidade
│         │                                    └────────────────────────┘   de IA
│  ┌──────▼───────┐   ┌──────────────────────┐                              (externa)
│  │ Prisma        │   │ ArmazenamentoPdfPort │──▶ volume/filesystem
│  └──────┬───────┘   └──────────────────────┘
└─────────┼─────────────────────────────────────────────────────────────────┘
          ▼
   PostgreSQL  (analise, requisito, avaliacao_requisito)
```

## 6. Componentes principais

| Componente | Responsabilidade | Observações |
|---|---|---|
| API REST (NestJS) | Expor endpoints, validar entrada, padronizar erros do PRD §9 | Um serviço só; sem gateway próprio |
| AnalistaAtualProvider | Devolver o analista único configurado (env/config) para carimbar e filtrar análises | Seam para identidade real futura (P-10); sem header, sem token |
| Módulo Análises | Criar (multipart), listar, abrir (com requisitos), concluir; orquestrar upload e enfileiramento lógico | Conclusão valida requisitos obrigatórios verificados |
| Módulo Requisitos/Avaliações | Ler base fixa; registrar status final, comentário e "verificado" por requisito/análise | Alterar status final marca verificado=true (RF-011) |
| Worker de processamento (`ProcessamentoService`) | **Implementado (TSD-006).** Claim atômico `PENDENTE`→`PROCESSANDO` (`updateMany`), lê o PDF, carrega requisitos ativos, chama `AnaliseIaPort` com timeout (`IA_TIMEOUT_MS`), grava 1 `avaliacao_requisito` por requisito + `PRONTA_PARA_REVISAO` numa transação; falha → `ERRO_PROCESSAMENTO`. Disparo imediato no `criar` + varredura `setInterval` (`PROCESSAMENTO_INTERVALO_MS`, single-flight) + `recuperarPresas` no boot. Tudo sob `PROCESSAMENTO_AUTO`. Sem `@nestjs/schedule` (ESM-only, incompatível com o ts-jest CJS) — `setInterval` próprio. Sem Redis no MVP (A-06) |
| AnaliseIaPort | Contrato interno: (PDF + requisitos) → lista de (requisito, status sugerido, página) | StubAdapter determinístico + HttpAdapter real; alvo de teste de contrato |
| ArmazenamentoPdfPort | Gravar/ler o PDF de entrada; entregar bytes por página para o visor | Adapter filesystem no MVP; S3/Blob depois (A-05) |
| Módulo Relatório | Gerar PDF da análise concluída sob demanda | `pdfkit`; não persiste o relatório (A-04) |
| Persistência (Prisma + PostgreSQL) | Migrations, tipos, seed da base de requisitos | Seed a partir de arquivo versionado |

## 7. Fluxos técnicos principais

### Fluxo - Criar análise e processar

1. `POST /analises` (multipart: NUP, objeto/descrição, arquivo PDF). `AnalistaAtualProvider` resolve o analista configurado.
2. Valida campos obrigatórios e o PDF (tipo/assinatura de arquivo, tamanho máximo). PDF inválido → 422 sem criar a análise.
3. `ArmazenamentoPdfPort` grava o PDF; falha de gravação → 502/500, nada é criado.
4. Cria `analise` com `status = PENDENTE`, `analista_id`, `iniciada_em`, referência do arquivo e `total_paginas_pdf` (contagem best-effort do PDF via `pdf-lib` — `null` se não parseável, sem falhar a criação; TSD-009 / RF-014). Responde `201` com o id e o status. *(A TSD-004 usa 201: nada assíncrono é disparado na requisição — o worker do RF-005 pega os `PENDENTE` por varredura.)* Erro de validação → `422` sem criar nada; falha ao gravar o PDF → `502` sem criar nada.
5. Worker seleciona a análise `PENDENTE`, muda para `PROCESSANDO`.
6. Worker carrega a base de requisitos ativa e chama `AnaliseIaPort` com o PDF + requisitos.
7. Para cada requisito retornado, cria `avaliacao_requisito` com `status_sugerido_ia` (Conforme | Não conforme | Não se aplica), `pagina_referencia` (ou nulo), `status_final = status_sugerido_ia`, `verificado = false`.
8. Sucesso → `status = PRONTA_PARA_REVISAO`. Erro/timeout da IA → `status = ERRO_PROCESSAMENTO` com motivo; permite novo disparo.

### Fluxo - Revisar requisito

**Implementado (TSD-008 + TSD-009).** `PATCH /analises/:id/requisitos/:requisitoId` com `{ statusFinal?, verificado?, comentario?, paginaReferencia? }` (ao menos um).

1. `404` se a análise ou a avaliação (par análise+requisito) não existir para o analista; `409` se a análise não está `PRONTA_PARA_REVISAO`.
2. `statusFinal`, quando presente, deve ser um dos 3 valores (`422` senão).
3. Alterar `statusFinal` força `verificado = true` (RF-011). `verificado` alterna livre quando o status não muda.
4. **Comentário obrigatório (P-03 = R-06):** se o estado resultante tiver `statusFinal ≠ statusSugeridoIa` e nenhum comentário → `422` sem gravar. Confirmar a sugestão ou só marcar `verificado` não exigem comentário.
5. `comentario` vazio/só espaços = limpar (`null`) — mas não pode violar a regra 4.
6. **`paginaReferencia` (RF-014 / TSD-009):** inteiro `1..total_paginas_pdf` quando o total é conhecido, inteiro `≥ 1` quando é `null`, ou `null` para limpar; fora disso → `422`. **Não** dispara a regra 4 (corrigir a página não é mudar o parecer).
7. Grava só os campos que mudam; responde `{ item, resumo }` — `item` no mesmo formato do item de `GET /analises/:id`, `resumo` recalculado.

### Fluxo - Concluir análise

**Implementado (TSD-010).** `POST /analises/:id/concluir` (`HttpCode 200` — nada é criado). RF-012 + RF-013 + RF-015.

1. `404` se a análise não existe para o analista atual.
2. Análise já `CONCLUIDA` → **`200` idempotente** com o payload completo, sem alterar `concluida_em`.
3. Análise fora de `PRONTA_PARA_REVISAO` (`PENDENTE`/`PROCESSANDO`/`ERRO_PROCESSAMENTO`) → `409`.
4. Se existir requisito **obrigatório** com `verificado = false` (inclui obrigatório com `statusFinal = NAO_SE_APLICA`) → `422` com `{ message, requisitosPendentes: [{ requisitoId, codigo, titulo, area }] }`; nada gravado, análise segue `PRONTA_PARA_REVISAO`. A trava olha **só** `verificado` (não exige edição do parecer).
5. Caso contrário → transição atômica `updateMany(where status = PRONTA_PARA_REVISAO) → status = CONCLUIDA`, grava `concluida_em`. Responde o payload completo (mesmo formato de `GET /analises/:id`).
6. Sem etapa de aprovação, assinatura ou dupla revisão (RF-015). Conclusão do MVP é interna (P-01 aberta).

### Fluxo - Abrir análise / listar

1. `GET /analises` → **implementado (TSD-005)**. Filtrado por `analista_id`. Query: `q` (busca em `nup`+`objeto`, contém, case-insensitive), `status` (um ou mais, vírgula ou repetição), `ordenarPor` (`iniciadaEm` default | `nup`), `ordem` (`asc`|`desc` default `desc`), `pagina` (1-based, default 1), `tamanho` (default 20, máx 100). Resposta `{ itens, total, pagina, tamanho }`; `itens` com `id`, `nup`, `objeto`, `status`, `iniciadaEm`, `concluidaEm`. Query inválida → `422` sem tocar no banco. (P-06 fechado; contagem de requisitos por linha fica para depois de RF-007.)
2. `GET /analises/:id` → **implementado (TSD-004 + TSD-007 + TSD-009 + TSD-010)**. Devolve os campos da análise (`id`, `nup`, `objeto`, `status`, `motivoErro`, `analistaId` + `analistaNome` — responsável, RF-013, `iniciadaEm`, `concluidaEm`, `totalPaginasPdf` — número ou `null`), `resumo` (`total`, `conforme`, `naoConforme`, `naoSeAplica`, `verificados`, `obrigatoriosPendentes` — por `statusFinal`) e `avaliacoesPorArea: [{ area, itens: [...] }]` — áreas em ordem alfabética, dentro de cada área os `NAO_CONFORME` (por `statusFinal`) primeiro e depois `requisito.ordem`. Cada item: `id` da avaliação, `requisitoId`, `codigo`, `area`, `titulo`, `descricao`, `obrigatorio`, `ordem`, `norma` (estruturada), `statusSugeridoIa`, `statusFinal`, `verificado`, `comentario`, `paginaReferencia`. Sem avaliações (`PENDENTE`/`PROCESSANDO`) → `avaliacoesPorArea: []` e resumo zerado; `ERRO_PROCESSAMENTO` → idem + `motivoErro`. `404` se o id não existir sob o `analista_id` atual (estrutura que já suporta o `403` de RF-003).
3. `GET /analises/:id/pdf` → **implementado (TSD-004)**. Bytes do PDF **inteiro** (`application/pdf`). A navegação por página (RF-014) é do visor no frontend, via fragmento `#page=N` sobre este mesmo recurso — **não há endpoint/param de página no servidor** (decisão do ciclo RF-014 / TSD-009). O total de páginas para validar o alvo vem de `totalPaginasPdf` em `GET /analises/:id`.

### Fluxo - Relatório PDF

1. `GET /analises/:id/relatorio`.
2. Se `status != CONCLUIDA` → 409. Caso contrário, `pdfkit` compõe o relatório (identificação, responsável, datas, status final por requisito) e devolve `application/pdf`. Não persiste (A-04).

## 8. Dados e contratos

| Entidade/Contrato | Responsabilidade | Observações |
|---|---|---|
| `analise` | Uma análise, sob o analista atual | **Implementada (TSD-004 + TSD-009 + TSD-010).** Campos: `id`, `nup`, `objeto`, `analista_id` (responsável — RF-013; exposto como `analistaId` + `analistaNome` resolvido pelo `AnalistaAtualProvider`), `arquivo_pdf_ref`, `status` (string validada por `STATUS_ANALISE` em `src/analises/status-analise.ts` — **não** enum de banco: `PENDENTE`, `PROCESSANDO`, `PRONTA_PARA_REVISAO`, `ERRO_PROCESSAMENTO`, `CONCLUIDA`), `motivo_erro`, `total_paginas_pdf` (int nulo — contagem best-effort do PDF via `pdf-lib` no `criar`; RF-014), `iniciada_em`, `concluida_em` (gravado na conclusão — RF-013), `criado_em`, `atualizado_em`. Índice (`analista_id`, `iniciada_em`). Transição `PRONTA_PARA_REVISAO → CONCLUIDA` por `updateMany` condicional (TSD-010) |
| `requisito` | Item da base fixa de verificação | **Implementado (TSD-003).** Campos: `id`, `codigo` (único), `area` (string livre validada por allowlist em `src/requisitos/areas.ts` — **não** enum; começa com `CHECKLIST`/`TECNICA`), `titulo`, `descricao`, `obrigatorio` (bool), `ordem`, `ativo`, referência normativa estruturada (`norma_lei`/`artigo`/`inciso`/`paragrafo`/`alinea`, opcionais), `criado_em`/`atualizado_em`. Sem coluna de versão: texto + `obrigatorio` imutáveis após publicação; mudança normativa = novo `codigo` + antigo `ativo=false`. Populado por importador de CSV externo (`prisma/seed-data/requisitos.csv`). Conteúdo real do 1º subconjunto ainda pendente (P-07) |
| `avaliacao_requisito` | Avaliação de um requisito dentro de uma análise | **Implementada (TSD-006).** Campos: `id`, `analise_id` (FK `analise` `onDelete: Cascade`), `requisito_id` (FK `requisito` `onDelete: Restrict`), `status_sugerido_ia`, `status_final` (`CONFORME` \| `NAO_CONFORME` \| `NAO_SE_APLICA` — string validada em código), `verificado` (bool, default false), `comentario` (nulo — RF-017), `pagina_referencia` (int nulo; corrigível pelo analista no PATCH de revisão — RF-014/TSD-009, validado contra `analise.total_paginas_pdf`), `criado_em`, `atualizado_em`. `@@unique(analise_id, requisito_id)`, índice em `analise_id`. Edição de `status_final`/`verificado`/`comentario`/`pagina_referencia`: RF-008/011/017 + RF-014 |
| Contrato REST LicIA ↔ Frontend | Endpoints de §7 + formato de erro padronizado | Detalhamento fica para a TSD de cada feature, não para o SDD |
| `AnaliseIaPort` (interno) | `analisar(pdf, requisitos[]) → { requisitoId, statusSugerido, paginaReferencia? }[]` | Forma estável; adapter real mapeia para o contrato externo (A-02). Alvo de teste de contrato |
| `AnalistaAtualProvider` (interno) | `getAnalistaAtual() → { analistaId, nome }` | MVP: valor de configuração. Futuro: identidade real (P-10) |
| `ArmazenamentoPdfPort` (interno) | `salvar(bytes) → ref`, `ler(ref) → bytes`, `lerPagina(ref, n) → bytes` | Adapter filesystem no MVP. `lerPagina` é seam **não implementado**: o RF-014 (TSD-009) optou por navegação de página no visor do frontend (`#page=N`), sem extração server-side. Mantido para eventual necessidade futura |

## 9. Decisões técnicas relevantes

| Decisão | Motivo | Consequência |
|---|---|---|
| Backend em NestJS + TypeScript | Consistência com o ecossistema; DI e suporte a testes que sustentam o ciclo de papéis/TSD | Mais estrutura/boilerplate que Fastify puro. Registro completo: `decisions/001-framework-backend-nestjs.md` |
| PostgreSQL + Prisma | Dados naturalmente relacionais (análise → avaliações → requisitos); baixo volume; DX de tipos | Prisma como dependência de build; migrations versionadas |
| Processamento assíncrono em processo, estado no banco | Volume baixo não justifica Redis/broker; estado no banco sobrevive a restart | Um só nó processa; se o volume crescer, migrar para fila dedicada (A-06) |
| Worker com `setInterval` próprio, não `@nestjs/schedule` (TSD-006) | O pacote é ESM-only e quebra o ts-jest (CJS) do projeto; o uso era só bookkeeping de intervalo | `onModuleDestroy` limpa o intervalo; `PROCESSAMENTO_AUTO=false` desliga tudo nos testes |
| PDF em filesystem/volume no MVP | "O mais simples viável" pedido na fundação | Não portável entre múltiplos nós; migração a object storage + cripto at-rest fica aberta (A-05, P-09) |
| Sem identidade no MVP; `AnalistaAtualProvider` devolve analista fixo | Pedido explícito na fundação: MVP sem autenticação nem multiusuário | RF-003 e o estado "sem permissão" ficam pós-MVP (P-10); queries já filtram por `analista_id` para a troca ser barata |
| Capacidade de IA atrás de `AnaliseIaPort` com stub + adapter real | Contrato externo ainda não fechado; IA é cara/instável | Permite MVP e testes sem a IA real; risco de divergência stub↔real, mitigado por teste de contrato |
| Relatório PDF gerado sob demanda, não persistido | Simplicidade; sempre reflete o estado concluído | Se exigirem imutabilidade/arquivamento do relatório, revisar (A-04) |
| RF-014 sem extração de página no servidor; visor do frontend navega via `#page=N` (TSD-009) | Evita depender de lib de render/recorte de PDF e um endpoint de página; o PDF inteiro já é servido | Backend só persiste `total_paginas_pdf` (contagem via `pdf-lib`, best-effort) e deixa o analista corrigir `pagina_referencia`. `lerPagina` fica como seam não implementado |

Decisões que precisarem de alternativas descartadas e análise de reversibilidade em detalhe devem virar decision records em `docs/engineering/decisions/` e ser referenciadas aqui.

## 10. Riscos técnicos

| Risco | Impacto | Mitigação |
|---|---|---|
| Contrato da capacidade de IA muda ou demora a existir | Bloqueia processamento real; retrabalho no adapter | Porta + stub determinístico; teste de contrato; adapter real isolado |
| PDF grande estoura tempo/memória no processamento | Análise trava em `PROCESSANDO` | Timeout na `AnaliseIaPort`, transição para `ERRO_PROCESSAMENTO` com motivo, reprocessamento manual; limite de tamanho no upload |
| Restart do serviço durante processamento | Job perdido | Worker re-seleciona `PENDENTE`/`PROCESSANDO` no boot; operações idempotentes por (`analise_id`, `requisito_id`) |
| Ausência de identidade real vira dívida difícil de pagar depois | Retrofit de RF-003/multiusuário custoso | `AnalistaAtualProvider` isolado e `analista_id` em todas as queries desde já; P-10 registrada |
| PDF sensível em volume sem criptografia | Exposição de dado de órgão público | Acesso ao volume restrito na infra; migração para object storage + cripto at-rest registrada (A-05); PDF e relatório só via endpoint |
| Divergência entre protótipo (React/Vite) e frontend real (Next.js) | Expectativa de UX desalinhada | Protótipo é referência de UX, não contrato; `.ai-dev/visual-reference-workflow.md` em toda TSD de interface |

## 11. Estratégia de validação

- [ ] Testes unitários dos serviços de domínio (conclusão bloqueada por requisito obrigatório; alterar status final marca verificado; filtro por `analista_id`) com portas mockadas.
- [ ] Testes de integração da API real contra PostgreSQL de teste (criar → processar com StubAdapter → revisar → concluir → relatório).
- [ ] Teste de contrato da `AnaliseIaPort` (forma de entrada/saída) que o adapter real precisa satisfazer.
- [ ] Teste do worker: seleção de `PENDENTE`, transições de status, recuperação de itens presos no boot, caminho de `ERRO_PROCESSAMENTO`.
- [ ] Validação manual/smoke contra a capacidade de IA real quando o contrato existir (custo/latência/comportamento) — não substitui os testes acima.
- [ ] `lint`, `typecheck`, `build` e cobertura conforme `.ai-dev/quality-gates.md`.
- [ ] Estados do PRD §9 exercitados por teste (PDF inválido, IA indisponível, base de requisitos indisponível, conclusão com pendências).

## 12. Questões em aberto

Índice completo em [`docs/product/questoes-abertas.md`](../product/questoes-abertas.md). Diretamente ligadas a este SDD:

- [ ] A-02 — contrato da capacidade de IA (campos, auth, timeout, retry; aciona vs. consome).
- [ ] A-03 — estrutura definitiva da base de requisitos (estrutura mínima proposta em §8).
- [ ] A-04 — relatório PDF: sob demanda (proposto) vs. persistido.
- [ ] A-05 — migração do PDF para object storage + criptografia at-rest.
- [ ] A-06 — fila/worker dedicado se o volume crescer.
- [ ] P-07 — primeiro subconjunto de requisitos para o seed.
- [ ] P-10 — quando/como entra identidade real, multiusuário e RF-003 (A-01 depende disto).
