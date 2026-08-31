---
title: TSD - Real Analysis Detail and Processing Status
type: tsd
status: completed
created: 05/08/2026 - 18:30 // Rolf Matela
updated: 05/08/2026 - 19:16 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md
---

# TSD — Real Analysis Detail and Processing Status

## 1. Resumo

Esta slice substitui o detalhe demonstrativo por uma leitura autenticada real de metadados e status de processamento. IDs numéricos usam exclusivamente a Analisadora API pelo BFF; IDs não numéricos, incluindo o legado `/analise/nova`, retornam 404 e nunca recebem PDF, checklist, Técnica ou controles de revisão mockados.

## 2. Objetivo técnico

Permitir que o analista abra um processo próprio, acompanhe seu relógio de processamento e atualize o estado com segurança, mantendo tokens e gateway server-only e sem integrar resultados, documento ou mutações de negócio.

## 3. Escopo

### Incluído

- `GET /api/analyses/[id]` GET-only e allowlisted.
- Validação de ID inteiro positivo e sem query arbitrária.
- Consulta a `GET /analisadora-api-licia/processes/{id}` pelo gateway público.
- DTO normalizado com metadados, cinco estados e `errorDetail` opcional.
- Loading, sessão expirada, not-found não revelador e indisponibilidade.
- Polling encadeado a cada 10 segundos somente em `pending` e `processing`.
- Pausa do polling quando a aba fica oculta e atualização imediata ao voltar.
- Retry manual após falha, mantendo os últimos dados válidos quando disponíveis.
- Respostas privadas, `no-store` e `Vary: Cookie`.

### Não incluído

- Worker, claim ou write-back interno.
- PDF, MinIO ou visualizador documental.
- Opiniões, checklist, Técnica ou referências de página.
- Revisão, comentários, conclusão ou retry de processamento.
- Alterações em criação, listagem, busca, filtros ou ordenação.
- Mudanças no gateway, Users API ou Analisadora API.

## 4. Fronteira

```text
Browser
└── GET /api/analyses/{id}
    └── Next.js BFF
        └── GET /analisadora-api-licia/processes/{id}
            └── Gateway → Analisadora API
```

O BFF aceita somente um ID decimal positivo, não encaminha query params e usa a política já validada de no máximo um refresh e um retry para GET. Ownership permanece no backend; processo ausente e processo de outro usuário produzem o mesmo 404.

## 5. Contrato normalizado

```ts
interface AnalysisProcessDetail {
  id: string;
  nup: string;
  subject: string;
  processingStatus:
    | "pending"
    | "processing"
    | "processed"
    | "partially_processed"
    | "error";
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
  errorDetail: string | null;
}
```

Datas precisam ser válidas. `errorDetail` vazio vira `null`, espaços externos são removidos e o texto é limitado a 2.000 caracteres. A renderização React permanece textual e escapa markup.

## 6. Respostas do BFF

| Situação | Status | Código |
|---|---:|---|
| Detalhe válido | 200 | DTO normalizado |
| ID ou query inválida | 400 | `invalid-id` / `invalid-query` |
| Sessão inválida | 401 | `unauthorized` |
| Ausente ou pertencente a outro usuário | 404 | `not-found` |
| DTO incompatível | 502 | `invalid-upstream-response` |
| Gateway/API indisponível | 503 | `unavailable` |

## 7. Política de polling

- A primeira consulta ocorre imediatamente.
- `pending` e `processing` agendam a próxima consulta após 10 segundos.
- Cada nova consulta só é agendada depois que a anterior termina.
- `processed`, `partially_processed` e `error` interrompem o polling.
- `401`, `404`, resposta inválida e indisponibilidade também interrompem o polling.
- Ocultar a aba cancela a requisição atual e o timer pendente.
- Tornar a aba visível novamente atualiza imediatamente somente estados ativos.
- Demora não é convertida em erro; a API não fornece prazo nem timestamp de progresso automático.

## 8. Semântica de apresentação

| Status | Apresentação |
|---|---|
| `pending` | Aguardando processamento |
| `processing` | Processamento em andamento |
| `processed` | Processamento concluído; revisão ainda indisponível |
| `partially_processed` | Processamento parcialmente concluído; revisão ainda indisponível |
| `error` | Processamento terminado com erro, sem retry nesta tela |

`processed` não significa análise concluída pelo analista. `finishedAt` continua sendo o relógio da conclusão humana. `errorDetail`, quando presente, é apresentado em `error` ou `partially_processed` sem inferir o estado de opiniões individuais.

## 9. Arquivos principais

| Arquivo/Módulo | Responsabilidade |
|---|---|
| `src/app/api/analyses/[id]/route.ts` | BFF dinâmico, validação do ID e mapeamento de erros |
| `src/features/analyses/data/analysisQueries.ts` | Consulta, validação do DTO e normalização do detalhe |
| `src/features/analyses/dateTime.ts` | Validação estrita de timestamps RFC 3339 |
| `src/features/analyses/detail/AnalysisDetailLoader.tsx` | Fetch, polling, visibilidade, sessão e retry |
| `src/features/analyses/detail/AnalysisDetail.tsx` | Estados, metadados e status read-only |
| `src/app/(authenticated)/analise/[id]/page.tsx` | 404 para IDs inválidos e entrada do detalhe real |

## 10. Critérios de aceite

- [x] O navegador chama somente o BFF e nunca o gateway diretamente.
- [x] IDs não numéricos retornam 404 na rota de página.
- [x] IDs reais nunca exibem dados ou controles mockados.
- [x] O DTO aceita somente os cinco estados conhecidos.
- [x] Polling ocorre a cada 10 segundos somente em estados ativos.
- [x] Polling pausa com a aba oculta e retoma ao voltar.
- [x] Estados terminais interrompem o polling.
- [x] `401` redireciona para login e `404` não revela ownership.
- [x] Indisponibilidade oferece tentativa manual.
- [x] `errorDetail` é normalizado e renderizado como texto.
- [x] Worker, PDF, opiniões, revisão, conclusão e retry não foram integrados.

## 11. Validação executada

- [x] `npm run lint`.
- [x] `npm run typecheck`.
- [x] `npm run build`.
- [x] `git diff --check`.
- [x] Processo real criado e aberto em `pending` pela stack Traefik/Users API/Analisadora API.
- [x] Polling real após 10 segundos, pausa quando oculto e retomada ao voltar.
- [x] Refresh real de sessão com access cookie removido.
- [x] API parada exibiu indisponibilidade e retry manual recuperou o detalhe.
- [x] Processo ausente e processo de outro usuário retornaram o mesmo `404 not-found`.
- [x] Headers `private, no-store` e `Vary: Cookie` confirmados.
- [x] Ausência de chamadas browser→gateway e de conteúdo mock no detalhe real.
- [x] Gateway controlado validou os cinco estados, sequência ativa e parada terminal.
- [x] Gateway controlado validou `errorDetail` vazio, com espaços, parcialmente processado e markup escapado.
- [x] Falha interrompeu retomada por visibilidade até retry manual.
- [x] DTO com status desconhecido ou timestamp inválido retornou `502 invalid-upstream-response`.
- [x] `502` operacional downstream foi convertido em `503 unavailable`.

O worker não foi iniciado. Estados além de `pending` foram exercitados com gateway controlado para validar a fronteira frontend sem acionar claim, write-back ou efeitos de processamento.

## 12. Riscos e limitações

- A API não expõe progresso percentual, timestamp de claim/processamento ou prazo; a UI não estima avanço nem detecta job travado.
- `errorDetail` é falha process-level e não substitui os erros individuais das opiniões.
- Um processo pode permanecer `pending` ou `processing` indefinidamente; polling não altera estado.
- A paridade entre Traefik e Istio continua pré-requisito de Release.

## 13. Rollback

O rollback remove a rota BFF dinâmica e a tela read-only. O antigo workspace mock não deve ser restaurado para IDs reais, pois isso associa dados fictícios a processos persistidos.
