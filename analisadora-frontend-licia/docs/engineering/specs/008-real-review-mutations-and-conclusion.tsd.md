---
title: TSD - Real Review Mutations and Analysis Conclusion
type: tsd
status: completed
created: 16/08/2026 - 14:10 // Rolf Matela
updated: 16/08/2026 - 22:10 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md
- docs/engineering/specs/005-real-analysis-detail-status.tsd.md
- docs/engineering/specs/006-real-read-only-opinions.tsd.md
- docs/engineering/specs/007-real-analysis-workspace-reconciliation.tsd.md
---

# TSD — Real Review Mutations and Analysis Conclusion

## 1. Resumo

Esta slice encerra o ciclo de revisão: o painel deixa de ser read-only e passa a gravar a decisão humana na Analisadora API. O analista verifica requisitos, altera o parecer sugerido pela IA com comentário obrigatório e conclui a análise por uma confirmação global única. Com a revisão real integrada, os mocks de análise perdem a última razão de existir e são removidos do repositório.

Esta TSD é um **registro retroativo**. A implementação foi entregue no commit `2fd9feb` ("COMMIT URGENTE", 13/08/2026) sem especificação prévia e sem atualização do checkpoint. O documento descreve o que foi efetivamente entregue, não uma intenção anterior.

A validação contra a stack real foi executada em 16/08/2026 e está registrada na seção 13. A fronteira do frontend passou em toda a matriz, e a validação revelou um defeito na Analisadora API que causava perda silenciosa da decisão do analista pela própria interface. O defeito, sua causa raiz e a mitigação aplicada neste repositório estão na seção 14. A correção definitiva permanece pendente na Analisadora API.

## 2. Objetivo técnico

Expor duas mutações reais pelo BFF — revisão por opinião e conclusão do processo — com superfície de escrita mínima e explicitamente allowlisted, mantendo o servidor como única autoridade sobre o estado exibido: nenhuma alteração aparece na tela antes de a API confirmá-la.

## 3. Escopo

### Incluído

- `PATCH /api/analyses/[id]/opinions/[opinionId]`, allowlisted e restrito a três campos graváveis.
- `POST /api/analyses/[id]/finish`, sem corpo.
- Verificação individual de requisito por checkbox.
- Alteração de parecer com veredito e comentário obrigatórios.
- Alteração de parecer registrando o requisito como verificado na mesma gravação.
- Conclusão global única, bloqueada enquanto houver requisito não verificado.
- Estado concluído como somente-leitura, derivado de `finishedAt`.
- Agrupamento Checklist/Técnica por tipo de requisito e filtros por veredito.
- Progresso de verificação por área.
- Substituição pontual da opinião pelo objeto devolvido pela API após cada gravação.
- Remoção integral de `src/features/analyses/mocks/`.

### Não incluído

- PDF, MinIO, visualizador ou referências de página clicáveis.
- Busca, ordenação ou filtro por status na lista de análises.
- `POST /processes/:id/retry` e `DELETE /processes/:id`.
- Reabertura ou desfazimento de uma análise concluída.
- Edição de evidência, `legalReference` ou qualquer campo produzido pela IA.
- Gravação otimista, fila de gravações ou reconciliação offline.
- Mudanças no gateway, na Users API, na Analisadora API ou no worker.

## 4. Fronteira

```text
Browser
├── PATCH /api/analyses/{id}/opinions/{opinionId}
│   └── Next.js BFF
│       └── PATCH /analisadora-api-licia/processes/{id}/opinions/{opinionId}
└── POST  /api/analyses/{id}/finish
    └── Next.js BFF
        └── POST  /analisadora-api-licia/processes/{id}/finish
                └── Gateway → Analisadora API
```

As duas rotas usam `authenticatedGatewayFetch`, herdando a política já validada de um refresh e um retry. Ownership permanece no backend; processo ausente e processo de outro usuário continuam indistinguíveis por 404.

## 5. Superfície de escrita

O BFF aceita exclusivamente os três campos de `ReviewOpinionDto`:

```ts
interface OpinionReviewPatch {
  reviewStatus?: "compliant" | "non_compliant" | "not_applicable" | null;
  reviewComment?: string | null;
  verified?: boolean;
}
```

`parsePatch` percorre as chaves recebidas e devolve `null` diante de qualquer chave desconhecida, valor de tipo incorreto, enum fora do contrato ou objeto vazio. Um corpo com um único campo extra é recusado por inteiro: a rota nunca amplia a superfície de escrita da Analisadora API, mesmo que a API viesse a aceitar mais campos no futuro.

`null` limpa o campo correspondente. `verified: true` só é aceito pela API quando existe veredito efetivo (`reviewStatus ?? aiStatus`); a UI antecipa essa regra desabilitando o checkbox de itens sem parecer.

## 6. Respostas do BFF

### `PATCH .../opinions/[opinionId]`

| Situação | Status | Código |
|---|---:|---|
| Gravação aceita | 200 | Opinião normalizada e revalidada |
| ID/query inválida | 400 | `invalid-id` / `invalid-query` |
| Corpo fora do contrato | 400 | `invalid-body` |
| Sessão inválida | 401 | `unauthorized` |
| Processo/opinião ausente ou estrangeira | 404 | `not-found` |
| Processamento ativo ou análise concluída | 409 | `conflict` |
| DTO upstream incompatível | 502 | `invalid-upstream-response` |
| Gateway/API indisponível | 503 | `unavailable` |

A resposta da API passa novamente por `parseOpinionPayload`, o mesmo validador da TSD 006: uma gravação aceita cujo retorno não satisfaça o contrato vira 502 em vez de contaminar a tela.

### `POST .../finish`

| Situação | Status | Código |
|---|---:|---|
| Conclusão aceita | 204 | Sem corpo |
| ID/query inválida | 400 | `invalid-id` / `invalid-query` |
| Sessão inválida | 401 | `unauthorized` |
| Processo ausente ou estrangeiro | 404 | `not-found` |
| Requisito não verificado, processamento ativo ou já concluída | 409 | `conflict` |
| Gateway/API indisponível | 503 | `unavailable` |

A API responde 200 com `ProcessDetail`. O BFF descarta esse corpo e responde 204: a conclusão não altera pareceres, apenas congela o processo, e o cliente já recarrega o detalhe pelo owner do polling para obter `finishedAt`. Isso mantém uma única fonte para os metadados do processo.

## 7. Elegibilidade e imutabilidade

A API só aceita mutações com a máquina parada — `QUIET_STATES` são exatamente `processed` e `partially_processed` — e recusa qualquer alteração após `finishedAt`. O frontend espelha as duas regras sem duplicar autoridade:

| Situação | Painel |
|---|---|
| `pending`, `processing`, `error` | Painel de revisão não monta |
| `processed`, `partially_processed`, não concluída | Revisão e conclusão habilitadas |
| `finishedAt` presente | Pareceres visíveis, todos os controles de escrita removidos |

O estado concluído chega ao painel como a prop `concluded`, derivada de `detail.finishedAt !== null` em `AnalysisDetail.tsx`. Não existe estado local de conclusão: após o `finish`, o painel só vira somente-leitura quando o detalhe recarregado confirma `finishedAt`.

## 8. Modelo de revisão

`reviewModel.ts` converte `AnalysisOpinion` em `ReviewItem` e é a única camada que conhece as duas áreas:

- **Área** — `AREA_BY_TYPE` mapeia o tipo do requisito para Checklist (conformidade formal e procedimental) ou Técnica (mérito do conteúdo). O `type` é texto livre na Analisadora API e o conjunto pertence à PGE, então **um tipo desconhecido cai no Checklist** em vez de desaparecer da tela.
- **Veredito exibido** — `reviewStatus ?? aiStatus`; sem nenhum dos dois, o item fica `pending` ("Sem parecer"), que não é veredito e nunca é gravado.
- **Comentário exibido** — `reviewComment ?? aiComment ?? fallbackDetail(...)`, onde o fallback distingue falha individual, resultado ainda não produzido e ausência legítima de comentário.
- **Sobreposição** — `overridden` é verdadeiro quando `reviewStatus` existe e difere de `aiStatus`; o item passa a exibir a sugestão original da IA no detalhe, preservando a separação exigida pelo PRD.
- **Ordem** — os grupos seguem a ordem de aparição dos tipos e a API já devolve as opiniões ordenadas por requisito, o que mantém a lista estável entre recargas e após cada gravação.

## 9. Regras de revisão aplicadas

- Todo requisito precisa de verificação, inclusive os "Não se aplica".
- Alterar o parecer também registra o requisito como verificado, em uma única requisição.
- Alterar o parecer exige comentário não vazio; alternar apenas a verificação não exige.
- O seletor de parecer omite o veredito que o item já possui; um item sem parecer recebe as três opções.
- Um item sem veredito efetivo não pode ser verificado, porque a API recusaria.
- A conclusão exige que **todos** os requisitos das duas áreas estejam verificados, não apenas os da aba visível.
- A barra de progresso é por área; o bloqueio da conclusão é global.
- Após alterar o parecer, o card é colapsado e o feedback aparece em toast.
- Falha de gravação preserva o estado anterior e exibe a causa sem fechar o fluxo.

## 10. Arquivos principais

| Arquivo/Módulo | Responsabilidade |
|---|---|
| `src/app/api/analyses/[id]/opinions/[opinionId]/route.ts` | BFF de revisão, allowlist do corpo e mapa de erros |
| `src/app/api/analyses/[id]/finish/route.ts` | BFF de conclusão |
| `src/features/analyses/data/analysisOpinionMutations.ts` | Chamadas server-only ao gateway e revalidação da resposta |
| `src/features/analyses/workspace/reviewModel.ts` | Opinião real → item de revisão, áreas, grupos e filtros |
| `src/features/analyses/detail/AnalysisOpinionsLoader.tsx` | Gravação, substituição pontual e erros de sessão |
| `src/features/analyses/workspace/ReviewPanel.tsx` | Abas, progresso, filtros, conclusão e feedback |
| `src/features/analyses/workspace/ChecklistItem.tsx` | Acordeão, verificação e acesso à alteração de parecer |
| `src/features/analyses/workspace/ChangeOpinionModal.tsx` | Veredito e comentário obrigatório |
| `src/features/analyses/workspace/CompletionModal.tsx` | Confirmação global única |
| `src/features/analyses/types.ts` | `OpinionReviewPatch` e vocabulário de status do MVP |

## 11. Remoção dos mocks

`src/features/analyses/mocks/` foi removido por completo — `analyses.ts`, `analysisDetail.ts`, `checklist.ts` e `tecnica.ts`. A remoção é consequência desta slice, não uma limpeza independente: com revisão e conclusão reais, nenhum fluxo de análise permanece sem fonte de backend, e a regra do `AGENTS.md` de preservar mocks para fluxos não integrados deixa de se aplicar. `ObservationItem.tsx`, que só existia para o modelo mock, também foi removido.

O vocabulário do MVP foi consolidado na mesma passagem: `ChecklistStatus` reconhece apenas Conforme, Não-conforme, Não se aplica e a ausência de parecer. O status `warning`/"Com ressalva" do protótipo não existe mais no código, conforme decisão já registrada no PRD.

## 12. Critérios de aceite

- [x] Browser chama somente os BFFs; nenhuma chamada direta ao gateway.
- [x] O BFF de revisão recusa chave desconhecida, tipo incorreto, enum inválido e corpo vazio.
- [x] A resposta da API é revalidada antes de alcançar a tela.
- [x] A tela nunca exibe estado não confirmado pelo servidor.
- [x] Item sem veredito efetivo não pode ser verificado.
- [x] Alterar parecer exige comentário e marca o item como verificado.
- [x] Sugestão da IA permanece visível após a sobreposição humana.
- [x] Conclusão bloqueada enquanto houver requisito não verificado em qualquer área.
- [x] Análise concluída não apresenta nenhum controle de escrita.
- [x] Tipo de requisito desconhecido permanece visível no Checklist.
- [x] Nenhum mock de análise permanece no repositório.
- [x] Nenhum controle de PDF, busca, ordenação ou retry foi introduzido.

## 13. Validação executada

Executada em 16/08/2026 contra a stack local real (Traefik, Users API, MongoDB, PostgreSQL, MinIO e Analisadora API). O worker Python não foi iniciado; os resultados da IA usados no teste são saída genuína de execuções anteriores do worker, já persistidas no banco. A atribuição de processos a dois usuários distintos e a marcação de três requisitos sem resultado da IA foram preparadas diretamente no banco, como setup controlado do cenário.

### Superfície do BFF

- [x] `npm run lint`, `npm run typecheck` e `npm run build`.
- [x] ID não numérico, zero e negativo retornam 400 `invalid-id` nas duas rotas.
- [x] Query string arbitrária retorna 400 `invalid-query` nas duas rotas.
- [x] Corpo vazio, chave desconhecida, enum inválido, `verified` não booleano, comentário não string, array e JSON malformado retornam 400 `invalid-body`.
- [x] Nenhuma dessas requisições alcança a Analisadora API.
- [x] Requisição sem sessão retorna 401 `unauthorized`, e não 503.
- [x] `GET` na rota de revisão e `DELETE` na de conclusão retornam 405.
- [x] `private, no-store, max-age=0`, `Pragma: no-cache` e `Vary: Cookie` presentes em 200, 400, 401 e 204.

### Revisão e conclusão

- [x] Verificação e desverificação individuais persistidas e confirmadas no banco.
- [x] Alteração de parecer gravando `reviewStatus`, `reviewComment` e `verified` em uma única requisição.
- [x] Verificação de requisito sem veredito efetivo recusada com 400.
- [x] Conclusão recusada com 409 faltando um requisito verificado (24 de 25).
- [x] Conclusão aceita com 25 de 25 verificados: 204 e `finished_at` persistido.
- [x] Análise concluída congelada: desverificar, alterar parecer e concluir de novo retornam 409.
- [x] Leitura de detalhe e opiniões continua disponível após a conclusão.
- [x] Mutação e conclusão recusadas com 409 enquanto o processo está `processing`.
- [x] Processo `partially_processed` concluído após parecer humano nos três requisitos sem resultado da IA.

### Sessão, ownership e falhas

- [x] Login real de dois analistas distintos pela Users API; listas isoladas (2 processos e 1 processo).
- [x] Revisão de opinião de processo alheio retorna 404.
- [x] Opinião de outro processo pelo ID de um processo próprio retorna 404.
- [x] Conclusão de processo alheio retorna 404.
- [x] Processo inexistente retorna 404, indistinguível do processo alheio.
- [x] Refresh inválido retorna 401 e remove os três cookies de sessão na resposta.
- [x] Analisadora API parada produz 503 `unavailable` nas duas rotas, com recuperação após religar.

### Não executado

- [ ] 502 `invalid-upstream-response` por DTO incompatível na resposta da mutação; exigiria um gateway controlado, não exercitado nesta rodada.
- [ ] Verificação visual dos estados do painel em navegador; a validação desta rodada foi feita na fronteira HTTP.

## 14. Defeito encontrado: `reviewStatus` e `reviewComment` são apagados por PATCH parcial

A validação encontrou um defeito real, reproduzível e com perda silenciosa de trabalho do analista.

**Comportamento observado.** Qualquer `PATCH` que omita `reviewStatus` apaga o veredito humano já gravado; o mesmo vale para `reviewComment`. Sequência confirmada no banco:

```text
1. PATCH {reviewStatus: non_compliant, reviewComment: "...", verified: true}
   -> review_status=non_compliant  review_comment="Ausencia de justificativa..."
2. PATCH {verified: false}
   -> review_status=NULL           review_comment=NULL
```

**Causa raiz.** Está na Analisadora API, em `src/modules/opinion/opinion.service.ts`. O método `review` decide o update parcial com `Object.prototype.hasOwnProperty.call(dto, 'reviewStatus')`, mas o `ValidationPipe` roda com `transform: true`, e o `class-transformer` materializa toda propriedade declarada no DTO — inclusive as ausentes, como `undefined`. `hasOwnProperty` é sempre verdadeiro, e `dto.reviewStatus ? ... : null` transforma o campo ausente em `null` explícito. O guarda de update parcial nunca funciona.

**Impacto na interface.** O checkbox de verificação envia apenas `{ verified: ... }`. Um analista que altere o parecer de um requisito e depois desmarque e remarque a verificação **perde o veredito e a justificativa sem qualquer aviso**, e o card volta a exibir a sugestão e o comentário da IA. Quando o veredito humano diverge do da IA — exatamente o caso que o PRD trata como central —, o parecer exibido também reverte.

A API é ainda inconsistente consigo mesma: em requisitos sem `aiStatus`, apagar `reviewStatus` remove o veredito efetivo e a própria API recusa a operação com 400, enquanto em requisitos com `aiStatus` a mesma operação retorna 200 e perde a decisão humana em silêncio.

**Onde corrigir.** O lugar correto é a Analisadora API: distinguir campo ausente de `null` explícito, por exemplo lendo o corpo cru ou usando `@ValidateIf` com um sentinela. **Essa correção continua pendente e não pertence a este repositório.**

### Mitigação aplicada no frontend

`AnalysisOpinionsLoader` passou a completar todo patch antes de enviá-lo, usando o estado da opinião já confirmado pelo servidor. Nenhuma gravação de revisão é parcial: as três chaves viajam sempre. `undefined` no patch significa "manter o valor atual" e `null` continua significando "limpar o campo" — a distinção é feita com `!== undefined`, nunca com `??`, que trataria um `null` explícito como ausência.

A mitigação está contida em `completePatch` e em `review`, dentro de `AnalysisOpinionsLoader.tsx`. `ReviewPanel` e `ChecklistItem` seguem emitindo patches mínimos, e a superfície do BFF não mudou.

**Efeito colateral aceito.** Toda gravação passa a sobrescrever os três campos, ou seja, last-write-wins. Como o processo pertence a um único analista e `ReviewPanel` bloqueia o item enquanto grava, não há escrita concorrente no fluxo real.

**Verificação da mitigação.** Contraste executado na stack real, no mesmo requisito e a partir do mesmo estado inicial:

```text
A) patch parcial     {verified:false}                    -> review_status=NULL, review_comment=NULL
B) tripla completa   {reviewStatus, reviewComment, ...}  -> review_status e review_comment preservados
```

Confirmado também que o bundle cliente publicado contém a mescla (`void 0 !== ...`), que o corpo enviado continua restrito aos três campos permitidos — chave extra segue recusada com 400 —, e que análise concluída segue respondendo 409. A execução da interface em navegador não foi realizada: não há navegador headless neste ambiente, e a verificação foi feita na fronteira HTTP mais a inspeção do artefato publicado.

## 15. Limitações e decisões a confirmar

- A obrigatoriedade de comentário na alteração de parecer é uma decisão tomada por esta implementação; o checkpoint registra que "quais ações de revisão exigem comentário" ainda não está fechado com produto.
- O seletor omite o veredito atual, então não há caminho para corrigir apenas o comentário mantendo o parecer. O contrato da API permite; a UI não expõe.
- A divisão Checklist/Técnica é uma convenção do frontend sobre um campo de texto livre. Um tipo novo criado pela PGE aparecerá no Checklist até que o mapa seja atualizado.
- Não há desfazimento: uma análise concluída é congelada pela API e nenhuma tela oferece reabertura.
- Gravações são sequenciais e sem otimismo. Cada clique aguarda a resposta, o que é seguro e perceptivelmente mais lento em conexões ruins.
- A conclusão descarta o `ProcessDetail` devolvido pela API e recarrega o detalhe; é uma requisição a mais em troca de uma única fonte de metadados.
- Requisitos sem parecer da IA em processos `partially_processed` exigem parecer humano antes da conclusão. `POST /processes/:id/retry` resolveria parte desses casos e não está integrado.
- A entrega ocorreu em um único commit sem TSD prévia, contrariando o fluxo do `AGENTS.md`. Este documento regulariza o registro, mas não recupera a rastreabilidade por etapa.

## 16. Rollback

O rollback remove as duas rotas de mutação, `analysisOpinionMutations.ts` e os controles de escrita do painel, retornando ao comportamento read-only da TSD 007. Os mocks removidos **não** devem ser restaurados: o detalhe, o status e as opiniões reais permanecem funcionais sem eles.
