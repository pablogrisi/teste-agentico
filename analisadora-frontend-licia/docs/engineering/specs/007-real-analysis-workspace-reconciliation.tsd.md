---
title: TSD - Real Analysis Workspace Reconciliation
type: tsd
status: completed
created: 05/08/2026 - 22:11 // Rolf Matela
updated: 05/08/2026 - 22:25 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md
- docs/engineering/specs/005-real-analysis-detail-status.tsd.md
- docs/engineering/specs/006-real-read-only-opinions.tsd.md
---

# TSD — Real Analysis Workspace Reconciliation

## 1. Resumo

Esta slice reconcilia o detalhe real com o workspace split-view já presente no repositório. A composição visual existente — painel documental flexível, gap de 16px e painel de análise de 596px — permanece como baseline. Somente fontes e comportamentos reais entram na rota: polling e metadados da TSD 005, opiniões read-only da TSD 006 e um placeholder documental sem conteúdo ou controles fictícios.

## 2. Objetivo técnico

Reintegrar a estrutura visual do workspace em `/analise/[id]` sem reintroduzir mocks, adaptar dados reais ao modelo legado de checklist ou criar novas fronteiras de backend.

## 3. Autoridade visual

O baseline desta slice é exclusivamente a implementação atual em:

- `src/features/analyses/workspace/AnalysisWorkspace.tsx`;
- `src/features/analyses/workspace/AnalysisWorkspace.module.css`;
- `src/features/analyses/workspace/PdfPanel.tsx`;
- `src/features/analyses/workspace/PdfPanel.module.css`;
- estrutura e linguagem visual de `ReviewPanel.module.css`.

Não há referência Figma identificada na branch atual. Validação contra fonte visual externa permanece pendente e não bloqueia a preservação da composição já aprovada no repositório.

## 4. Escopo

### Incluído

- Workspace horizontal existente em todos os estados carregados do processo.
- NUP e objeto reais no cabeçalho documental.
- Placeholder documental seguro, sem filename, página, conteúdo ou controle inventado.
- Status `pending`, `processing` e `error` dentro do painel direito.
- Opiniões reais em `processed` e `partially_processed`.
- Metadados reais e atualização manual preservados.
- Polling de 10 segundos, pausa por visibilidade, retomada e stale data preservados.
- Loading, 401, 404, indisponibilidade, inconsistência vazia e retries preservados.
- Cards de opinião read-only na linguagem visual existente do workspace.

### Não incluído

- PDF, MinIO, filename, total de páginas ou navegação documental.
- Checklist/Técnica, tabs, filtros, busca, ordenação ou agrupamento por tipo.
- Checkbox, edição, comentário mutável, verificação mutável ou conclusão.
- Retry de processamento ou polling de opiniões.
- Adaptação de `AnalysisOpinion` para tipos demonstrativos.
- Mudanças nos BFFs, gateway, Users API, Analisadora API ou worker.
- Redesenho das dimensões dos painéis, navegação global ou linguagem dos cards.

## 5. Composição

```text
AuthenticatedLayout
└── AnalysisDetailLoader
    └── AnalysisDetail
        └── AnalysisWorkspace
            ├── PdfPanel seguro
            └── Painel de análise real (596px)
                ├── status e atualização
                ├── metadados e avisos
                └── estado process-level ou AnalysisOpinionsLoader
```

`AnalysisDetailLoader` continua sendo o único owner do polling. `AnalysisOpinionsLoader` continua sendo a fronteira isolada de resultados. O workspace não consulta dados e não mantém estado de negócio.

## 6. Comportamento por estado

| Status | Painel direito | Opiniões |
|---|---|---|
| `pending` | Aguardando processamento e polling ativo | Não monta |
| `processing` | Processamento em andamento e polling ativo | Não monta |
| `processed` | Processamento concluído e resultados read-only | Monta uma vez |
| `partially_processed` | Resultado parcial, falha process-level opcional e itens individuais | Monta uma vez |
| `error` | Erro process-level, sem retry de processamento | Não monta |

## 7. Regras de apresentação

- O painel esquerdo não afirma possuir acesso ao PDF.
- A navegação de retorno à lista permanece funcional.
- Sugestão da IA, decisão humana, comentários, verificação e evidência continuam separados.
- Evidência permanece texto não interativo.
- O acento do card deriva somente de estados reais conhecidos.
- Requisito inativo continua visível.
- Parecer verificado aparece somente com `verified: true`.
- Nenhum controle visual sugere persistência ausente.

## 8. Arquivos principais

| Arquivo/Módulo | Responsabilidade |
|---|---|
| `src/features/analyses/workspace/AnalysisWorkspace.tsx` | Shell split-view sem domínio mock |
| `src/features/analyses/workspace/PdfPanel.tsx` | Cabeçalho real e placeholder seguro |
| `src/features/analyses/detail/AnalysisDetail.tsx` | Composição real por status |
| `src/features/analyses/detail/AnalysisOpinions.tsx` | Cards reais no painel lateral |
| `src/features/analyses/detail/AnalysisDetailLoader.tsx` | Polling preservado sem alteração funcional |
| `src/features/analyses/detail/AnalysisOpinionsLoader.tsx` | Fetch e retry de opiniões preservados |

## 9. Critérios de aceite

- [x] `/analise/[id]` usa o split-view atual com dados reais.
- [x] Painel direito mantém largura de 596px e workspace mantém gap de 16px.
- [x] Painel documental não contém dados ou controles fictícios.
- [x] `pending` e `processing` preservam polling e não consultam opiniões.
- [x] `processed` e `partially_processed` apresentam opiniões reais.
- [x] `error` não apresenta opiniões nem retry de processamento.
- [x] Falhas e retries permanecem isolados conforme TSDs 005 e 006.
- [x] Nenhum mock ou componente de revisão local entra no grafo da rota real.
- [x] Não há PDF, mutação, conclusão ou agrupamento Checklist/Técnica.

## 10. Validação executada

- [x] Estados process-level `pending`, `processing`, `processed`, `partially_processed` e `error`.
- [x] Opiniões completas, parciais, falha, pending, inconsistência vazia e retry.
- [x] Sessão expirada, ownership 404, DTO inválido e indisponibilidade.
- [x] Painel direito medido em 596px e gap entre painéis medido em 16px.
- [x] Placeholder sem documento fictício, filename, navegação de páginas ou requisição de PDF.
- [x] Ausência de Checklist/Técnica, checkbox, alteração de parecer e conclusão.
- [x] Navegação de retorno à lista preservada.
- [x] Inspeção estática sem imports de mocks ou componentes mutáveis na rota/detalhe.
- [x] Processo real 41 em `processed` renderizou 25 opiniões normalizadas.
- [x] Viewport 1440×900 ficou sem scroll de página; a lista de opiniões rolou internamente.
- [x] Navegador chamou somente os BFFs.
- [x] `npm run lint`.
- [x] `npm run typecheck`.
- [x] `npm run build`.
- [x] `git diff --check`.

A matriz controlada preservou integralmente as validações da TSD 006 e acrescentou verificações de geometria, placeholder, linguagem dos cards e ausência de comportamento local. A captura real foi comparada somente com o workspace atual do repositório; validação contra referência externa permanece pendente porque nenhuma está registrada na branch.

## 11. Rollback

O rollback restaura somente a composição vertical da TSD 006. BFFs, polling, normalização e opiniões reais não são removidos nem substituídos por mocks.
