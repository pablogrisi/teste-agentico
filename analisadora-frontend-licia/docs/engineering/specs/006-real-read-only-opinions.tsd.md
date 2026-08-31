---
title: TSD - Real Read-Only Analysis Opinions
type: tsd
status: completed
created: 05/08/2026 - 19:30 // Rolf Matela
updated: 05/08/2026 - 20:19 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md
---

# TSD — Real Read-Only Analysis Opinions

## 1. Resumo

Esta slice integra opiniões reais em modo exclusivamente read-only para processos `processed` e `partially_processed`. O painel preserva separadamente sugestão da IA, decisão humana, comentários, verificação e evidência textual, sem reutilizar o workspace mock nem introduzir mutações de revisão.

## 2. Objetivo técnico

Expor resultados reais pelo BFF com validação integral do DTO upstream e estados isolados de carregamento/erro, mantendo metadados do processo visíveis e impedindo que dados não verificados sejam apresentados como parecer atual ou final.

## 3. Escopo

### Incluído

- `GET /api/analyses/[id]/opinions` GET-only e allowlisted.
- ID inteiro positivo, ausência de query arbitrária e ownership no backend.
- Validação runtime do array completo, requisitos, enums, evidência, tentativas e timestamps.
- Normalização para um modelo browser-facing mínimo.
- Carregamento somente em `processed` e `partially_processed`.
- Estados individuais `pending`, `ok` e `failed`.
- Sugestão/comentário da IA e decisão/comentário humano separados.
- Estado de verificação read-only.
- Parecer derivado apresentado somente quando `verified` é verdadeiro.
- Evidência como página única, intervalo ou ausência, sem link.
- Requisito inativo mantido visível.
- Loading, erro, inconsistência vazia e retry restritos ao painel.
- Respostas privadas, `no-store` e `Vary: Cookie`.

### Não incluído

- Worker, claim ou write-back.
- PDF, MinIO, visualizador ou páginas clicáveis.
- Checklist/Técnica, filtros, busca, ordenação ou agrupamento por tipo.
- Edição, verificação, comentários mutáveis ou conclusão.
- Retry de processamento.
- Relatório ou exportação.
- Mudanças no gateway, Users API ou Analisadora API.

## 4. Fronteira

```text
Browser
└── GET /api/analyses/{id}/opinions
    └── Next.js BFF
        └── GET /analisadora-api-licia/processes/{id}/opinions
            └── Gateway → Analisadora API
```

O BFF usa a política já validada de um refresh e um retry para GET. Processo ausente e processo de outro usuário permanecem indistinguíveis por 404. Nenhum header de identidade, token ou URL downstream alcança o navegador.

## 5. Contrato normalizado

```ts
interface AnalysisOpinion {
  id: string;
  requirement: {
    id: string;
    code: string | null;
    type: string;
    text: string;
    active: boolean;
  };
  aiProcessingStatus: "pending" | "ok" | "failed";
  errorDetail: string | null;
  aiStatus: "compliant" | "non_compliant" | "not_applicable" | null;
  aiComment: string | null;
  evidence: { startPage: number; endPage: number } | null;
  reviewStatus: "compliant" | "non_compliant" | "not_applicable" | null;
  reviewComment: string | null;
  verified: boolean;
}
```

O BFF também valida campos upstream não expostos, como `attempts`, `legalReference`, `createdAt` e `updatedAt`. IDs duplicados, requisitos duplicados, ordem regressiva, evidência inválida, enum desconhecido, combinação incoerente entre processamento e campos da IA, timestamp inválido ou item malformado invalidam o array inteiro com 502.

## 6. Respostas do BFF

| Situação | Status | Código |
|---|---:|---|
| Array válido | 200 | Opiniões normalizadas |
| ID/query inválida | 400 | `invalid-id` / `invalid-query` |
| Sessão inválida | 401 | `unauthorized` |
| Processo ausente/estrangeiro | 404 | `not-found` |
| DTO incompatível | 502 | `invalid-upstream-response` |
| Gateway/API indisponível | 503 | `unavailable` |

## 7. Regras de apresentação

- `aiStatus` é sempre “Sugestão da IA”.
- `reviewStatus` é sempre “Decisão do analista”.
- `aiComment` e `reviewComment` nunca substituem um ao outro.
- “Parecer verificado” usa `reviewStatus ?? aiStatus` somente quando `verified` é verdadeiro.
- Um requisito não verificado não recebe rótulo de parecer atual, efetivo ou final.
- `failed` apresenta erro individual; `pending` não reapresenta `errorDetail` potencialmente histórico.
- `active: false` recebe badge de requisito inativo, mas continua no resultado.
- Evidência é texto informativo e nunca controle clicável.
- `type` é metadata livre e não cria agrupamento Checklist/Técnica.
- Comentários longos permanecem completos em conteúdo expansível e são renderizados como texto.

## 8. Elegibilidade e estados do painel

| Processo | Comportamento |
|---|---|
| `pending` | Não consulta opiniões |
| `processing` | Não consulta opiniões |
| `processed` | Consulta e apresenta opiniões |
| `partially_processed` | Consulta e apresenta itens `ok`, `failed` e `pending` |
| `error` | Mantém somente o erro process-level do detalhe |

Array vazio em processo elegível é uma inconsistência recuperável: os metadados permanecem, a UI informa ausência de resultados e oferece nova consulta.

## 9. Arquivos principais

| Arquivo/Módulo | Responsabilidade |
|---|---|
| `src/app/api/analyses/[id]/opinions/route.ts` | BFF, allowlist, cache e erros |
| `src/features/analyses/data/analysisOpinionQueries.ts` | Validação integral e normalização |
| `src/features/analyses/detail/AnalysisOpinionsLoader.tsx` | Fetch, sessão, inconsistência e retry |
| `src/features/analyses/detail/AnalysisOpinions.tsx` | Painel e cards read-only |
| `src/features/analyses/detail/AnalysisDetail.tsx` | Montagem somente nos estados elegíveis |

## 10. Critérios de aceite

- [x] Browser chama somente o BFF.
- [x] BFF rejeita ID/query e DTOs inválidos.
- [x] Opiniões carregam apenas em `processed` e `partially_processed`.
- [x] IA e humano permanecem separados.
- [x] Item não verificado não apresenta parecer atual/final.
- [x] Parecer verificado aparece somente com `verified: true`.
- [x] Evidência não possui link ou botão.
- [x] `pending`, `ok` e `failed` são distintos.
- [x] Erro e retry do painel preservam metadados do processo.
- [x] Array vazio terminal é inconsistência recuperável.
- [x] Nenhum controle de revisão, PDF, agrupamento ou retry foi introduzido.

## 11. Validação executada

- [x] `npm run lint`.
- [x] `npm run typecheck`.
- [x] `npm run build`.
- [x] `git diff --check`.
- [x] Stack real retornou array vazio legítimo para processo `pending` sem montar o painel.
- [x] Refresh de sessão, ownership 404, indisponibilidade 503 e cache privado validados na stack real.
- [x] Gateway controlado validou resultados `processed` e `partially_processed`.
- [x] Sugestão IA, decisão humana, comentários e verificação foram apresentados separadamente.
- [x] Itens não verificados não exibiram parecer verificado; itens verificados exibiram a origem efetiva correta.
- [x] Evidência única, intervalo, ausência e requisito inativo foram validados sem controles clicáveis.
- [x] Estados individuais `ok`, `failed` e `pending` foram validados.
- [x] Processos `pending`, `processing` e `error` não solicitaram opiniões.
- [x] Array vazio terminal exibiu inconsistência recuperável.
- [x] Erro do painel preservou metadados e retry recuperou os resultados.
- [x] Evidência inválida e combinação incoerente entre status/campos da IA retornaram 502.
- [x] Falha de transporte durante leitura do body retornou 503; 404 e 502 operacional foram normalizados corretamente.

O worker não foi iniciado. Resultados terminais foram exercitados com gateway controlado para validar a fronteira frontend sem acionar processamento ou write-back.

## 12. Limitações externas

- A API não garante que o array contenha todo o catálogo originalmente enviado ao worker; a UI não afirma completude.
- Status do processo e opiniões são leituras separadas, sem snapshot atômico.
- O schema OpenAPI de `legalReference` diverge do formato runtime; a informação é validada, mas não exposta nesta slice.
- Não existe contrato público owner-scoped para PDF; referências permanecem não clicáveis.
- Tipos de requisito são livres e não autorizam agrupamento de produto.
- Comentários não possuem limite pequeno no contrato; a UI aplica contenção visual sem truncar o conteúdo normalizado.

## 13. Rollback

O rollback remove o BFF e o painel de opiniões. O detalhe e status da TSD 005 permanecem funcionais e não devem voltar a usar resultados mockados.
