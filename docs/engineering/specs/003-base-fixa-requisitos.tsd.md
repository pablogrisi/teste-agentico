# TSD — Base fixa de requisitos (RF-006, backend)

---
title: TSD - Base fixa de requisitos (RF-006, backend)
type: tsd
status: draft
created: 31/08/2026 // Pablo Grisi (Engenheiro)
updated: 31/08/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/product/roadmap.md
- docs/architecture/sdd.md
- docs/engineering/specs/001-fundacao-tecnica.tsd.md
- docs/product/questoes-abertas.md
---

## 1. Resumo

Cria a primeira tabela de domínio do backend — `requisito` — e o mecanismo para populá-la a partir de um **arquivo externo** (CSV versionado no repositório), mais um serviço interno para ler a base ativa. Entrega o recorte backend do RF-006; não há avaliação de requisitos por análise, endpoint HTTP nem tela.

**User Story de origem:** `docs/product/roadmap.md`, feature RF-006 (recorte backend), User Story aprovada em 31/08/2026, incluindo as cinco decisões de ciclo registradas lá.

## 2. Objetivo técnico

- Modelo Prisma `Requisito` persistido em PostgreSQL, com referência normativa estruturada e sem coluna de versão.
- Migration Prisma que cria a tabela `requisito` num banco limpo.
- Importador de base a partir de um CSV (`prisma/seed-data/requisitos.csv`), acionável como seed do Prisma e como script avulso apontando para outro arquivo.
- Regra de imutabilidade de texto aplicada pelo importador: nunca reescreve o texto de um `codigo` já existente.
- `RequisitosService.listarAtivos()` devolve os requisitos ativos ordenados por `area` e `ordem`.
- Um CSV placeholder com 8–12 requisitos (Checklist + Técnica), claramente marcado como provisório.
- Testes unitários (parser/validador/regra de imutabilidade) e de integração (importar → reimportar → ler) contra o PostgreSQL de teste.

## 3. Escopo

### Incluído

- **Modelo Prisma `Requisito`** (`@@map("requisito")`):
  - `id` (uuid, PK)
  - `codigo` (string, **único**) — identificador estável e legível (ex.: `CHK-001`)
  - `area` (string) — **não** é enum Prisma nem enum de banco; campo livre, validado na importação contra uma allowlist em código (`src/requisitos/areas.ts`), fácil de estender
  - `titulo` (string) — texto imutável após publicação
  - `descricao` (string) — texto imutável após publicação
  - `obrigatorio` (boolean, default `true`) — **imutável** após publicação: se um requisito passa a bloquear (ou deixa de bloquear) a conclusão, isso é mudança de regra → novo `codigo`
  - `ordem` (int) — ordem de exibição dentro da área, **mutável** (puro display)
  - `ativo` (boolean, default `true`) — **mutável**; é assim que um requisito é "aposentado"
  - referência normativa estruturada, todos opcionais: `normaLei`, `normaArtigo`, `normaInciso`, `normaParagrafo`, `normaAlinea` (`@map` para snake_case)
  - `criadoEm`, `atualizadoEm`
  - índice `@@index([area, ordem])`
- **Migration** `*_base_fixa_requisitos` criando a tabela. Autoria via `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` (funciona sem banco); aplicação via `prisma migrate deploy` quando houver PostgreSQL.
- **Importador** (`src/requisitos/importador/`):
  - `parseRequisitosCsv(conteudo: string): LinhaRequisito[]` — usa `csv-parse` (síncrono), tolera campos com aspas/vírgulas/quebras de linha.
  - `validarLinhas(linhas): ResultadoValidacao` — checa: campos obrigatórios presentes; `area` na allowlist; `ordem` inteiro; `obrigatorio`/`ativo` boolean (`true`/`false`); `codigo` único dentro do arquivo. Erros acumulam com número da linha; qualquer erro aborta a importação inteira.
  - `ImportadorRequisitosService.importar(linhas): ResumoImportacao` — numa única transação Prisma:
    - `codigo` inexistente → insere.
    - `codigo` existente com `titulo` + `descricao` + `norma*` + `obrigatorio` idênticos → atualiza só `ativo` e `ordem`.
    - `codigo` existente com qualquer campo **imutável** (`titulo`, `descricao`, `norma*`, `obrigatorio`) divergente → **aborta** a transação e reporta o `codigo` e o diff. Mensagem orienta criar um novo `codigo`.
    - `codigo` ausente do arquivo → **não** é desativado automaticamente (desativar é sempre explícito, via `ativo=false` na linha).
  - `ResumoImportacao`: inseridos, atualizados, inalterados, e (em erro) a lista de motivos.
- **Seed do Prisma**: `prisma/seed.ts` lê `prisma/seed-data/requisitos.csv` e chama o importador. Registrado em `package.json` (`"prisma": { "seed": "ts-node prisma/seed.ts" }`). Script `npm run seed` (arquivo padrão) e `npm run seed:file -- <caminho>` (arquivo arbitrário).
- **CSV placeholder** `prisma/seed-data/requisitos.csv` — 8–12 linhas, Checklist e Técnica, referências à Lei 14.133/2021, cabeçalho comentado indicando que é provisório (P-07).
- **`RequisitosService`** (em `RequisitosModule`, hoje vazio): `listarAtivos(): Promise<Requisito[]>` — `where: { ativo: true }`, `orderBy: [{ area: 'asc' }, { ordem: 'asc' }]`. `RequisitosModule` passa a `providers`/`exports` esse serviço.
- **Dependência nova**: `csv-parse` (runtime).
- **Testes** (ver §7).

### Fora do escopo

- Endpoint HTTP (`GET /requisitos` e afins) — entra no RF-007.
- Avaliação de requisito por análise (`avaliacao_requisito`), status sugerido/final, "verificado".
- A lista real de requisitos da área jurídica (P-07) — só o placeholder.
- Catálogo de áreas em tabela, agrupamento/subgrupo visual, severidade/peso, texto de orientação (adicionar depois se um caso real pedir — decisão do PM).
- Desativação automática de requisitos ausentes do arquivo.
- UI / frente frontend.
- Qualquer alteração no fluxo de análise (ainda não existe).

## 4. Contexto consultado

- `START_HERE.md`, `.ai-dev/context-map.md`, `docs/engineering/checkpoint.md`
- `docs/product/roadmap.md` — RF-006, User Story aprovada + decisões de ciclo
- `docs/product/prd.md` — RF-006, RF-007, RF-012 (para `obrigatorio`), §8 regras de negócio
- `docs/architecture/sdd.md` — §8 (entidade `requisito`), §6 (RequisitosModule)
- `docs/product/glossario.md` — "Requisito", "Base fixa de requisitos", "Checklist", "Técnica"
- `docs/engineering/specs/001-fundacao-tecnica.tsd.md` — Prisma, estrutura de testes, quality gates
- `.ai-dev/quality-gates.md` — comandos e tipos de teste

## 5. Impacto esperado

- **Produto:** habilita a base contra a qual toda análise será avaliada; nenhum comportamento visível ainda.
- **Arquitetura:** primeira tabela de domínio; estabelece o padrão de "base populada por arquivo externo importável" que vale para qualquer dado de referência do projeto. Confirma `area` como campo flexível (SDD §8 falava em enum `CHECKLIST | TECNICA` — esta TSD relaxa isso; SDD a ser ajustado pelo Documentador).
- **Implementação:** nova dependência `csv-parse`; `prisma/seed.ts`, `prisma/seed-data/`, `src/requisitos/*`.
- **Testes:** primeiro teste de integração real contra PostgreSQL de teste — reforça a necessidade do banco no ambiente de teste/CI (gap herdado da TSD-001 §9).
- **Documentação:** SDD §8 (estrutura do `requisito`), checkpoint, audit, roadmap (status RF-006), `questoes-abertas.md` (A-03 fechada, P-04 e P-07 anotadas).
- **Operação:** `prisma migrate deploy` passa a criar uma tabela; `prisma db seed` popula o placeholder.

## 6. Plano de implementação

1. Adicionar o modelo `Requisito` a `prisma/schema.prisma`.
2. Gerar a migration `*_base_fixa_requisitos` (via `migrate diff` se não houver banco; via `migrate dev` se houver) e conferir o SQL.
3. `npm i csv-parse`.
4. Criar `src/requisitos/areas.ts` com a allowlist (`['CHECKLIST', 'TECNICA']` inicialmente) e um comentário de como estender.
5. Criar o parser (`parse-requisitos-csv.ts`) e o validador (`validar-linhas.ts`) com seus tipos.
6. Criar `ImportadorRequisitosService` com a lógica transacional de insert / update-operacional / abort-por-reescrita.
7. Criar `RequisitosService.listarAtivos()` e registrar ambos em `RequisitosModule` (providers + exports).
8. Criar `prisma/seed-data/requisitos.csv` (placeholder, 8–12 linhas) e `prisma/seed.ts`; registrar `prisma.seed` e os scripts `seed` / `seed:file` no `package.json`.
9. Escrever os testes de §7.
10. Rodar os quality gates e registrar a saída real; aplicar a migration + seed num PostgreSQL quando disponível.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | Parser (CSV com aspas/vírgula/quebra de linha), validador (campo faltando, `area` fora da allowlist, `ordem` não inteiro, boolean inválido, `codigo` duplicado no arquivo), e a regra de imutabilidade (diff de texto → erro; só campos operacionais mudam → ok). Dependências (Prisma) mockadas onde couber. |
| Integração | Sim | Contra o PostgreSQL de teste: importar o CSV placeholder num banco limpo (conta inseridos), reimportar o mesmo arquivo (idempotente: 0 inseridos, texto intacto), importar arquivo com um `codigo` de texto alterado (aborta, nada é gravado — checar rollback da transação), importar arquivo que só muda `ativo`/`ordem` (aplica), e `RequisitosService.listarAtivos()` retorna só ativos ordenados por `area`,`ordem`. |
| Contrato | Não | Não há serviço externo nem contrato entre serviços neste slice. |
| Smoke/validação manual contra dependência externa real | Não | Sem dependência externa real. |

Pendência de ambiente: os testes de integração exigem PostgreSQL (mesmo gap da TSD-001 §9). Se o ambiente do Dev não tiver Docker, os unitários + `migrate diff` + build rodam, e os de integração ficam registrados como pendência a rodar numa máquina com banco — não podem ser marcados como "não se aplica".

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e        # inclui os testes de integração deste slice
npm run build
npx prisma validate
npx prisma migrate deploy   # aplica a nova migration (requer PostgreSQL)
npm run seed                # popula o placeholder (requer PostgreSQL)
```

## 8. Critérios de aceite

- [ ] `prisma/schema.prisma` tem o modelo `Requisito` conforme §3 e `npx prisma validate` passa.
- [ ] Existe a migration `*_base_fixa_requisitos`; aplicá-la num banco limpo cria a tabela `requisito` com todas as colunas e o índice `(area, ordem)`.
- [ ] `area` não é enum Prisma nem enum de banco; a allowlist está em `src/requisitos/areas.ts` e estendê-la é uma mudança de uma linha.
- [ ] O importador popula a base a partir de `prisma/seed-data/requisitos.csv`; reimportar o mesmo arquivo não duplica nada nem altera texto.
- [ ] Importar um arquivo cujo `codigo` existente tenha `titulo`/`descricao`/`norma*`/`obrigatorio` diferente **falha** com mensagem clara citando o `codigo`, e **nada** é gravado (transação revertida).
- [ ] Importar um arquivo que só altera `ativo`/`ordem` de um `codigo` existente aplica essas mudanças.
- [ ] `codigo` ausente do arquivo não é desativado automaticamente.
- [ ] `RequisitosService.listarAtivos()` retorna apenas `ativo = true`, ordenado por `area` e depois `ordem`, e está exportado por `RequisitosModule`.
- [ ] O CSV placeholder tem 8–12 linhas entre `CHECKLIST` e `TECNICA`, com referência normativa estruturada preenchida onde aplicável, e um comentário deixando claro que é provisório.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` passam, com saída real registrada.
- [ ] Testes de integração escritos; executados contra PostgreSQL (ou registrados como pendência de ambiente, com o motivo).
- [ ] Nenhum endpoint HTTP novo; nenhuma outra tabela de domínio; nada da avaliação por análise.

## 9. Riscos e decisões abertas

- **Split imutável × mutável (decidido):** imutáveis pelo importador = `titulo`, `descricao`, `norma*` e `obrigatorio` (bloquear ou não a conclusão é efeito normativo → novo `codigo`). Mutáveis = `ordem` (display) e `ativo` (aposentadoria explícita).
- **Formato do CSV:** cabeçalho fixo `codigo,area,titulo,descricao,obrigatorio,ordem,ativo,norma_lei,norma_artigo,norma_inciso,norma_paragrafo,norma_alinea`. Se a área jurídica for entregar a lista em Excel/outro layout, um conversor para esse CSV é trabalho de outro slice, não deste.
- **Ambiente de teste sem PostgreSQL** (herdado da TSD-001 §9): os testes de integração deste slice dependem de banco.
- **`area` como string livre:** aceita o risco de typo em troca de flexibilidade; mitigado pela allowlist na importação. Migrar para catálogo em tabela, se necessário, é um slice futuro.
- Não altera nenhuma decisão do SDD além de relaxar o enum de `area` (§8) — o Documentador ajusta o SDD no fechamento.

## 10. Referências visuais

Não se aplica — slice de backend, sem interface.

## 11. Rollback

- Reverter a migration (`prisma migrate resolve` / nova migration que faz `DROP TABLE requisito`).
- Remover `src/requisitos/importador/`, `RequisitosService`, o conteúdo de `RequisitosModule` (volta a `@Module({})`), `prisma/seed.ts`, `prisma/seed-data/`, os scripts `seed*` e a chave `prisma.seed` do `package.json`, e a dependência `csv-parse`.
- Nenhum outro módulo depende de `RequisitosService` ainda, então a remoção é local. Sem dado real em produção a preservar.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (003), a TSD-001 e o checkpoint.
Implemente apenas o escopo desta TSD: modelo Requisito + migration, importador de CSV
(prisma/seed-data/requisitos.csv), seed do Prisma, RequisitosService.listarAtivos(), CSV
placeholder e testes. Trabalhe em backend/, na branch backend/tsd-001-fundacao-tecnica.
NÃO crie endpoint HTTP, NÃO crie a avaliação por análise, NÃO toque no frontend.
O importador nunca reescreve campos imutáveis (titulo, descricao, norma*, obrigatorio) de um
codigo existente — qualquer divergência aí aborta a transação inteira; só ordem e ativo mudam.
codigo ausente do arquivo não é desativado.
Execute lint, typecheck, test, build e prisma validate e registre a saída real. Rode os
testes de integração contra PostgreSQL se houver Docker; senão registre como pendência de
ambiente (não marque como "não se aplica").
Atualize checkpoint e .ai-dev/audit.md ao final, com pendências e próximo passo.
```
