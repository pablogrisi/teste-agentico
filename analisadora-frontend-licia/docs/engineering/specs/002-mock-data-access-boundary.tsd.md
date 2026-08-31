---
title: TSD - Mock Data Access Boundary
type: tsd
status: completed
created: 26/07/2026 - 21:03 // Rolf Matela
updated: 26/07/2026 - 21:03 // Rolf Matela
related (internal files):
- docs/engineering/licia-analisadora-engineering-checkpoint.md
- docs/architecture/licia-analisadora-sdd.md
---

# TSD — Mock Data Access Boundary

## 1. Resumo

Esta slice introduz uma fronteira controlada e exclusivamente server-side para leitura dos dados demonstrativos de análises. As páginas Server passam a consultar essa fronteira e entregam dados serializáveis aos componentes, eliminando o consumo direto dos mocks por rotas e componentes de interface.

## 2. Objetivo técnico

Concentrar o acesso aos mocks de análises em um único módulo de consultas, preservando integralmente o comportamento demonstrativo atual e preparando a troca futura da fonte de leitura sem antecipar contratos HTTP ou comportamentos de persistência.

## 3. Escopo

### Incluído

- Criar um módulo `server-only` como único consumidor dos mocks de análises.
- Expor consultas assíncronas para listagem e detalhe por ID.
- Preservar o estado demonstrativo especial de `/analise/nova`.
- Retornar ausência de resultado para IDs desconhecidos e preservar o `notFound()` da rota.
- Passar dados serializáveis das páginas Server para lista, workspace e painel de revisão por props.
- Adicionar somente os tipos necessários aos resultados das consultas e às props.

### Não incluído

- Contratos HTTP, API client, adapters, services ou novas dependências.
- Persistência, upload ou processamento documental real.
- Alterações na criação simulada, no estado local da revisão ou em qualquer escrita.
- Alterações de produto, autenticação, ownership ou comportamento visual.
- Alterações no PRD, no SDD ou na TSD 001 concluída.

## 4. Arquivos / módulos afetados

| Arquivo/Módulo | Mudança esperada |
|---|---|
| `src/features/analyses/data/analysisQueries.ts` | Concentrar as consultas assíncronas e o consumo dos mocks |
| `src/features/analyses/types.ts` | Definir os formatos serializáveis mínimos das consultas |
| `src/app/(authenticated)/page.tsx` | Consultar e entregar os dados da listagem |
| `src/app/(authenticated)/analise/[id]/page.tsx` | Consultar o detalhe e preservar `notFound()` |
| `src/features/analyses/list/AnalysisList.tsx` | Receber a listagem por props |
| `src/features/analyses/workspace/AnalysisWorkspace.tsx` | Receber e encaminhar o detalhe por props |
| `src/features/analyses/workspace/ReviewPanel.tsx` | Receber checklist e Técnica por props |
| `docs/engineering/licia-analisadora-engineering-checkpoint.md` | Registrar a slice e as validações executadas |

## 5. Plano de implementação

1. Definir os tipos mínimos para listagem, detalhe e dados de revisão.
2. Criar `analysisQueries.ts` com `import "server-only"`.
3. Implementar `listAnalyses()` e `getAnalysisById(id)` como funções assíncronas.
4. Resolver o ID especial `nova` dentro da fronteira de consulta.
5. Atualizar as páginas Server para consultar os dados e tratar resultado ausente.
6. Atualizar os componentes para consumir somente props serializáveis.
7. Confirmar que nenhum outro módulo importa `features/analyses/mocks`.
8. Executar as validações obrigatórias e atualizar esta TSD e o checkpoint.

## 6. Contratos / interfaces

A slice define somente formatos internos do frontend para os resultados das consultas mockadas. Esses tipos não representam contratos de backend ou HTTP.

- `AnalysisListData`: itens e metadados demonstrativos da listagem.
- `AnalysisDetails`: cabeçalho, documento e dados de revisão de uma análise.
- `AnalysisReviewData`: grupos serializáveis de checklist e Técnica.

## 7. Critérios de aceite

- [x] `analysisQueries.ts` é server-only e o único consumidor dos mocks de análises.
- [x] `listAnalyses()` e `getAnalysisById(id)` são assíncronas.
- [x] `/analise/nova` preserva o estado demonstrativo existente.
- [x] IDs desconhecidos retornam `null` na consulta e continuam produzindo 404 na rota.
- [x] Páginas Server passam dados serializáveis aos componentes por props.
- [x] Criação, revisão e escritas mantêm o comportamento existente.
- [x] Nenhum contrato HTTP, adapter, service ou dependência foi adicionado.
- [x] PRD, SDD e TSD 001 permanecem inalterados por esta slice.

## 8. Validação obrigatória

- [x] Executar `npm run lint`.
- [x] Executar `npm run typecheck`.
- [x] Executar `npm run build`.
- [x] Confirmar que somente `analysisQueries.ts` importa `features/analyses/mocks`.
- [x] Validar `/`, `/analise/1` e `/analise/nova`.
- [x] Validar 404 para ID desconhecido.
- [x] Validar os fluxos existentes de criação e revisão.
- [x] Atualizar o checkpoint com resultados realmente executados.

## 9. Riscos e cuidados

| Risco | Mitigação |
|---|---|
| A fronteira mock ser confundida com contrato da API futura | Manter os tipos internos e registrar explicitamente a ausência de contrato HTTP |
| Dados server-only alcançarem o grafo cliente por import direto | Passar somente estruturas serializáveis por props |
| A adaptação alterar regras locais de revisão | Preservar os mesmos cálculos e todo o estado no `ReviewPanel` |
| A TSD concluída anterior ser reinterpretada | Não modificar a TSD 001 |

## 10. Rollback

O rollback consiste em remover o módulo de consultas e restaurar os imports diretos dos mocks nas páginas e componentes. Não há migração de dados, dependência externa ou persistência envolvida.
