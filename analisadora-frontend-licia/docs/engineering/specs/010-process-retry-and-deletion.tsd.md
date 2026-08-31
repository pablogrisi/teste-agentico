---
title: TSD - Process Retry and Deletion
type: tsd
status: completed
created: 17/08/2026 - 01:20 // Rolf Matela
updated: 17/08/2026 - 02:05 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md
- docs/engineering/specs/005-real-analysis-detail-status.tsd.md
- docs/engineering/specs/009-status-filter-and-bulk-verification.tsd.md
---

# TSD — Process Retry and Deletion

## 1. Resumo

Esta slice dá saída aos dois becos sem saída que restavam na interface: um processo parcialmente processado, cujos requisitos falhos só podiam ser resolvidos com parecer humano item a item, e um processo travado por um worker morto, que não podia ser removido de forma alguma.

Os dois endpoints já existiam na Analisadora API e já passavam pelo gateway sem nenhum consumidor no frontend. Nada de novo foi pedido ao backend.

## 2. Objetivo técnico

Expor `retry` e `delete` por rotas BFF allowlisted, com o mesmo mapa de erros das demais mutações, e ancorar cada ação onde o analista consegue julgar o que está fazendo, sem alterar a geometria validada do workspace.

## 3. Escopo

### Incluído

- `POST /api/analyses/[id]/retry`, sem corpo, respondendo 204.
- `DELETE /api/analyses/[id]`, respondendo 204.
- Ação de reprocessamento no detalhe, restrita a `partially_processed` não concluído.
- Ação de exclusão no cabeçalho do painel documental, disponível em todos os estados.
- Confirmação explícita antes da exclusão, com aviso de irreversibilidade.
- Redirecionamento para a lista após excluir.
- `ConfirmDialog` compartilhado em `src/components/`.

### Não incluído

- Exclusão a partir da lista de análises.
- Reprocessamento em `error`; a API só aceita `partially_processed`.
- Reprocessamento seletivo de requisitos específicos.
- Desfazimento da exclusão ou lixeira.
- Toast de confirmação na lista após a exclusão.
- Mudanças no gateway, na Users API ou na Analisadora API.

## 4. Fronteira

```text
Browser
├── POST   /api/analyses/{id}/retry
│   └── POST   /analisadora-api-licia/processes/{id}/retry
└── DELETE /api/analyses/{id}
    └── DELETE /analisadora-api-licia/processes/{id}
                └── Gateway → Analisadora API
```

Ambas usam `authenticatedGatewayFetch`, herdando a política de um refresh e um retry. Ownership permanece no backend: processo ausente e processo de outro analista continuam indistinguíveis por 404.

A API responde 202 com `ProcessDetail` no retry; o BFF descarta esse corpo e responde 204, pela mesma razão da conclusão na TSD 008 — o detalhe tem uma única fonte, que é o dono do polling.

## 5. Respostas do BFF

### `POST .../retry`

| Situação | Status | Código |
|---|---:|---|
| Reenfileiramento aceito | 204 | Sem corpo |
| ID/query inválida | 400 | `invalid-id` / `invalid-query` |
| Sessão inválida | 401 | `unauthorized` |
| Processo ausente ou estrangeiro | 404 | `not-found` |
| Não é `partially_processed`, está concluído, ou nada é elegível | 409 | `conflict` |
| Gateway/API indisponível | 503 | `unavailable` |

### `DELETE /api/analyses/[id]`

| Situação | Status | Código |
|---|---:|---|
| Excluído | 204 | Sem corpo |
| ID/query inválida | 400 | `invalid-id` / `invalid-query` |
| Sessão inválida | 401 | `unauthorized` |
| Processo ausente ou estrangeiro | 404 | `not-found` |
| Gateway/API indisponível | 503 | `unavailable` |

A exclusão não possui 409: a API a permite em qualquer estado, `processing` incluído. Sem endpoint de edição e sem recuperação automática de job travado (ADR-0001 da Analisadora API), excluir e recriar é a única saída para um processo abandonado por um worker morto.

## 6. Elegibilidade do reprocessamento

A API reenfileira atomicamente toda opinião não verificada em `failed` ou `pending`, e nunca redespacha trabalho bem-sucedido ou já verificado. As três condições de recusa são indistinguíveis para o frontend, todas 409:

| Situação | Motivo |
|---|---|
| Estado diferente de `partially_processed` | só o parcial pode ser reprocessado |
| Análise concluída | análises concluídas são congeladas |
| Nenhuma opinião elegível | os falhos já receberam parecer humano |

Por isso o texto do erro cobre as três de uma vez e sugere atualizar o status, em vez de afirmar uma causa que o frontend não consegue distinguir.

Após o aceite, o processo volta a um estado ativo e o detalhe é recarregado: o polling da TSD 005 retoma sozinho e o painel de revisão desmonta.

## 7. Ancoragem das ações

- **Reprocessar** aparece como aviso no painel de análise, apenas em `partially_processed` não concluído. É o mesmo lugar onde o analista já lê que há requisitos sem resultado da IA, e a mensagem apresenta as duas saídas: reprocessar ou dar parecer manualmente.
- **Excluir** fica no cabeçalho do painel documental, que existe em todos os estados. Isso mantém intacta a geometria validada na TSD 007 — o painel direito de 596px e o gap de 16px não são tocados — e coloca a ação junto da identidade do processo, não junto dos pareceres.

A exclusão exige confirmação, declara que é irreversível e nomeia o NUP. Um 404 na exclusão é tratado como sucesso: o processo já não existe, que era o resultado desejado.

## 8. Arquivos principais

| Arquivo/Módulo | Responsabilidade |
|---|---|
| `src/app/api/analyses/[id]/retry/route.ts` | BFF de reprocessamento |
| `src/app/api/analyses/[id]/route.ts` | `DELETE` somado ao `GET` existente |
| `src/features/analyses/data/analysisMutations.ts` | `retryAnalysis`, `deleteAnalysis` e `AnalysisProcessError` |
| `src/features/analyses/detail/AnalysisDetailLoader.tsx` | Estado das duas ações, erros e navegação |
| `src/features/analyses/detail/AnalysisDetail.tsx` | Aviso de reprocessamento por estado |
| `src/features/analyses/workspace/PdfPanel.tsx` | Ação de exclusão no cabeçalho documental |
| `src/components/ConfirmDialog/ConfirmDialog.tsx` | Confirmação genérica, neutra ou destrutiva |

`ConfirmDialog` é novo e fica em `src/components/` porque tem dois consumidores potenciais e nenhuma relação com o domínio da análise. `CompletionModal` permanece intacto: ele celebra a conclusão com ícone de check, o que seria enganoso numa exclusão.

## 9. Critérios de aceite

- [x] As duas rotas recusam ID e query fora do contrato antes de alcançar a API.
- [x] Sessão ausente retorna 401 nas duas rotas.
- [x] Processo estrangeiro e inexistente retornam o mesmo 404.
- [x] Reprocessamento só é oferecido em `partially_processed` não concluído.
- [x] Reprocessamento reenfileira apenas o elegível e devolve o processo a um estado ativo.
- [x] As três recusas de reprocessamento retornam 409 com mensagem que cobre as três.
- [x] Exclusão disponível em todos os estados, com confirmação e aviso de irreversibilidade.
- [x] Exclusão remove opiniões em cascata e o PDF armazenado.
- [x] Exclusão de processo já ausente é tratada como sucesso.
- [x] Geometria do workspace preservada.
- [x] Cache privado nas duas rotas.

## 10. Validação executada

Executada em 17/08/2026 contra a stack local real, com dois analistas distintos logados pela Users API. As linhas de `process` e `opinion` foram copiadas antes dos testes e restauradas ao final, sem perda.

### Reprocessamento

- [x] ID não numérico e ID zero retornaram 400 `invalid-id`.
- [x] Query arbitrária retornou 400 `invalid-query`.
- [x] Sem sessão retornou 401; `GET` na rota retornou 405.
- [x] Processo de outro analista e processo inexistente retornaram 404.
- [x] Processo `processed` retornou 409.
- [x] Processo `partially_processed` com 3 requisitos falhos retornou 204, voltou a `pending` e reenfileirou **exatamente os 3 elegíveis**, sem redespachar os 22 bem-sucedidos.
- [x] Com os 3 falhos já resolvidos por parecer humano, o reprocessamento retornou 409.
- [x] Análise concluída retornou 409.

### Exclusão

- [x] ID não numérico e query arbitrária retornaram 400.
- [x] Sem sessão retornou 401.
- [x] Processo de outro analista e inexistente retornaram 404.
- [x] Processo próprio retornou 204; sumiu do banco, as opiniões caíram em cascata e o objeto no MinIO foi removido.
- [x] Segunda exclusão do mesmo processo retornou 404, e o detalhe passou a responder 404.
- [x] A lista deixou de apresentar o processo excluído.

### Geral

- [x] `npm run lint`, `npm run typecheck` e `npm run build`.
- [x] `private, no-store` e `Vary: Cookie` nas duas rotas.

### Não executado

- [ ] Execução da interface em navegador; não há navegador headless no ambiente. Os controles novos foram validados na fronteira HTTP.
- [ ] Reprocessamento acompanhado até um novo resultado real do worker; o worker Python não foi iniciado, então a validação vai até o reenfileiramento.

## 11. Limitações

- A exclusão só existe no detalhe. Um processo travado em `processing` precisa ser aberto para ser removido, o que é aceitável, mas a lista seria o lugar mais direto.
- Após excluir, o analista volta para a lista sem confirmação visual; o processo simplesmente não está mais lá.
- Processos em `error` não podem ser reprocessados, apenas excluídos e recriados. É restrição da API, não da interface.
- As três causas de 409 do reprocessamento não são distinguíveis pelo frontend, porque a API responde o mesmo código para todas.
- O reprocessamento não tem confirmação prévia. Ele não destrói trabalho — nunca redespacha o que já teve sucesso ou foi verificado —, mas consome processamento de IA.

## 12. Rollback

O rollback remove as duas rotas, as funções de mutação, os controles no detalhe e no painel documental, e o `ConfirmDialog`. Detalhe, polling, revisão e conclusão permanecem funcionais e inalterados.
