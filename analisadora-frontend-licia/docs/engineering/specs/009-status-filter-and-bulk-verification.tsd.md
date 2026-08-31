---
title: TSD - Status Filter and Bulk Verification
type: tsd
status: completed
created: 16/08/2026 - 23:15 // Rolf Matela
updated: 16/08/2026 - 23:15 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md
- docs/engineering/specs/008-real-review-mutations-and-conclusion.tsd.md
---

# TSD — Status Filter and Bulk Verification

## 1. Resumo

Esta slice entrega três controles que reduzem o trabalho manual do analista sem ampliar a superfície de backend: filtro por estado de processamento na lista, uma segunda camada de filtro por verificação dentro das áreas de revisão, e verificação em massa por veredito.

O filtro da lista é o primeiro item de "busca, filtros e ordenação" do PRD a ganhar contrato real: `GET /processes` já aceita `status` repetível. Busca e ordenação continuam sem suporte no backend e permanecem visivelmente desabilitadas.

## 2. Objetivo técnico

Aplicar filtragem de lista no servidor, para que o resultado seja global e não uma seleção sobre a página carregada, e permitir verificação em lote sobre um contrato que só oferece escrita item a item, sem inventar semântica que a Analisadora API não sustenta.

## 3. Escopo

### Incluído

- `status` repetível e allowlisted em `GET /api/analyses`, validado contra `PROCESSING_STATUSES`.
- Controle de filtro por estado na lista, com contagem de filtros ativos e limpeza.
- Retorno à primeira página quando o filtro muda.
- Estado vazio específico para "nenhum resultado nos estados selecionados".
- Segunda camada de filtro nas áreas de revisão: todos, verificados e não verificados.
- Combinação das duas camadas de filtro por conjunção.
- Verificação em massa por veredito — Conforme, Não-conforme, Não se aplica e Todos — restrita à área aberta.
- Contagem por opção antes da execução.
- Exclusão automática de requisitos sem veredito efetivo e dos já verificados.
- Falha parcial informando quantos itens foram gravados antes da interrupção.

### Não incluído

- Busca textual e ordenação, ausentes do contrato da API.
- Filtro por estado combinado com busca ou ordenação.
- Endpoint de lote; não existe e esta slice não o cria.
- Desverificação em massa.
- Verificação em massa atravessando as duas áreas de uma vez.
- Atribuição de parecer em massa; só a verificação é feita em lote.
- Mudanças no gateway, na Users API ou na Analisadora API.

## 4. Filtro por estado

```text
Browser
└── GET /api/analyses?page&pageSize&status&status…
    └── Next.js BFF
        └── GET /analisadora-api-licia/processes?page&pageSize&status&status…
```

O BFF recusa qualquer estado fora de `PROCESSING_STATUSES` e qualquer repetição além do número de estados existentes, então um valor desconhecido nunca alcança a Analisadora API. Repetições idênticas são deduplicadas para não inflar a query enviada. Lista vazia de estados significa "sem filtro", nunca "nenhum estado".

Como a filtragem acontece no backend, a paginação continua coerente: o total e as páginas refletem o conjunto filtrado. Trocar o filtro volta para a primeira página, porque a posição anterior deixa de ter significado.

## 5. Segunda camada de filtro

As áreas de revisão passam a ter duas camadas independentes, aplicadas em conjunto:

| Camada | Valores | Pergunta que responde |
|---|---|---|
| Parecer | Não-conforme, Conforme, Não se aplica, Sem parecer, Todos | o que a análise concluiu |
| Verificação | Todos, Não verificados, Verificados | o que o analista já conferiu |

`isVisible` em `reviewModel.ts` é o único lugar que combina as duas. Ambas operam sobre o conjunto integral de opiniões do processo, que já é carregado de uma vez, então nenhuma delas induz o analista a interpretar um recorte de página como resultado global.

## 6. Verificação em massa

A Analisadora API não possui endpoint de lote e serializa cada escrita com um lock por processo. A operação é, portanto, uma sequência de `PATCH` individuais — paralelizar apenas disputaria o mesmo lock.

Regras de seleção, implementadas em `bulkVerifyTargets`:

- entram apenas requisitos ainda não verificados;
- entram apenas requisitos com veredito efetivo (`reviewStatus ?? aiStatus`);
- "Sem parecer" nunca é alvo, nem dentro de "Todos", porque a API recusa verificar requisito sem veredito;
- o lote é restrito à área aberta, coerente com o progresso, que também é por área.

Cada opção exibe sua contagem antes da execução, e a opção sem itens elegíveis fica desabilitada. Durante o lote os controles individuais ficam bloqueados.

Uma falha interrompe o lote. O que já foi gravado permanece, porque cada item é uma transação independente na API, e a mensagem informa quantos requisitos foram verificados antes da interrupção — o analista nunca fica sem saber o que está persistido.

A verificação em massa herda a proteção da TSD 008: cada gravação envia a tripla completa, então um lote nunca apaga pareceres humanos já registrados.

## 7. Arquivos principais

| Arquivo/Módulo | Responsabilidade |
|---|---|
| `src/app/api/analyses/route.ts` | Allowlist e validação de `status` repetível |
| `src/features/analyses/data/analysisQueries.ts` | Envio de `status` repetido ao gateway |
| `src/features/analyses/list/AnalysisList.tsx` | Controle de filtro e estado vazio filtrado |
| `src/features/analyses/list/AnalysisListLoader.tsx` | Estado do filtro e retorno à primeira página |
| `src/features/analyses/workspace/reviewModel.ts` | `matchesVerification`, `isVisible` e `bulkVerifyTargets` |
| `src/features/analyses/workspace/ReviewPanel.tsx` | Segunda camada de filtro e menu de verificação em massa |
| `src/features/analyses/detail/AnalysisOpinionsLoader.tsx` | `reviewMany` sequencial e falha parcial |
| `src/features/analyses/types.ts` | `VerificationFilter`, `BulkVerifyTarget` e rótulos de estado |

## 8. Critérios de aceite

- [x] Filtro por estado é aplicado pelo backend e o total reflete o conjunto filtrado.
- [x] Estado desconhecido, vazio ou chave desconhecida são recusados com 400 sem alcançar a API.
- [x] Estados repetidos são deduplicados.
- [x] Trocar o filtro volta para a primeira página.
- [x] Lista vazia com filtro ativo oferece limpar os filtros.
- [x] As duas camadas de filtro do painel se aplicam em conjunto.
- [x] Verificação em massa atinge somente o veredito escolhido.
- [x] Requisitos sem parecer e já verificados ficam fora do lote.
- [x] Cada opção exibe sua contagem e desabilita quando não há elegíveis.
- [x] Falha parcial informa quantos itens foram gravados.
- [x] Análise concluída não apresenta verificação em massa.
- [x] Nenhuma busca ou ordenação foi apresentada como funcional.

## 9. Validação executada

Executada em 16/08/2026 contra a stack local real, com um analista logado pela Users API e seis processos próprios distribuídos entre `pending`, `processing`, `processed` e `error`.

- [x] `npm run lint`, `npm run typecheck` e `npm run build`.
- [x] Sem filtro retornou os 6 processos.
- [x] `status=error` retornou 2, `status=processed` retornou 2 e `status=pending` retornou 1.
- [x] `status=pending&status=error` retornou os 3 correspondentes.
- [x] Os cinco estados juntos retornaram os 6, equivalente a sem filtro.
- [x] `status=error&status=error` deduplicou e retornou 2.
- [x] Estado desconhecido, estado vazio, chave `statuses` e repetição excessiva retornaram 400 `invalid-query`.
- [x] Lote "Conforme" selecionou exatamente os 8 requisitos conformes e gravou os 8; nenhum outro veredito foi tocado.
- [x] Lote "Todos" selecionou os 15 restantes com veredito e excluiu os 2 sem parecer.
- [x] Os 2 requisitos sem parecer, se enviados, são recusados pela API com 400 — a exclusão é necessária, não cosmética.
- [x] Conclusão permaneceu bloqueada com 409 enquanto os 2 requisitos sem parecer não foram verificados.

### Não executado

- [ ] Execução da interface em navegador. Não há navegador headless no ambiente; os controles novos foram validados na fronteira HTTP e pela lógica de seleção, que foi exercitada com os mesmos dados que a interface consome.

## 10. Limitações e decisões

- **"Selecionar todos" era uma sugestão não aprovada.** O checkpoint registrava a seleção em massa como sugestão que não deveria ser tratada como decisão de produto. Esta slice a implementa por pedido explícito, ampliada para os quatro vereditos. A decisão precisa ser confirmada no PRD.
- O lote é por área. Uma análise com requisitos nas duas áreas exige um lote em cada, e a conclusão continua exigindo todas as áreas verificadas.
- Não há desfazimento em massa: desverificar continua sendo item a item, deliberadamente, porque desfazer trabalho em lote é mais arriscado do que fazê-lo.
- Lotes grandes são sequenciais e proporcionais ao número de itens; com 25 requisitos são até 25 requisições. Um endpoint de lote na API resolveria, e não existe.
- O filtro por estado não se combina com busca ou ordenação, que continuam sem contrato.
- A área Técnica continua com semântica provisória, o que também afeta o alcance de um lote "Todos" restrito à área.

## 11. Rollback

O rollback remove o parâmetro `status` do BFF e da camada de dados, o controle de filtro da lista, a segunda camada de filtro e o menu de verificação em massa. Listagem, paginação, revisão item a item e conclusão permanecem funcionais e inalteradas.
