---
title: TSD - Real Analysis Creation
type: tsd
status: completed
created: 05/08/2026 - 17:45 // Rolf Matela
updated: 05/08/2026 - 18:07 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md
---

# TSD — Real Analysis Creation

## 1. Resumo

Esta slice substitui a criação simulada por uma integração multipart real. O navegador envia NUP, objeto e PDF somente para um Route Handler allowlisted do Next.js; o BFF renova a sessão antes de consumir o body e encaminha o multipart como stream, em uma única tentativa, pelo gateway público.

## 2. Objetivo técnico

Registrar uma análise real com estado inicial `pending`, PDF persistido pela Analisadora API no MinIO e ownership derivado da identidade validada no gateway, sem materializar o arquivo no BFF e sem integrar processamento ou detalhe.

## 3. Escopo

### Incluído

- `POST /api/analyses` same-origin e allowlisted.
- Multipart com os campos exatos `nup`, `contractObject` e `file`.
- Encaminhamento streaming sem `request.formData()`.
- Refresh preventivo quando o access token está ausente ou próximo da expiração.
- Uma única tentativa downstream, sem replay automático do upload.
- Validação client-side de campos obrigatórios, NUP de até 40 caracteres, PDF e 50 MiB.
- Validação autoritativa de campos, conteúdo PDF e limite pela Analisadora API.
- Tratamento de `202`, `400`, `401`, `413`, timeout, indisponibilidade e resposta upstream inválida.
- Prevenção de submissões concorrentes e preservação do formulário após erro recuperável.
- Feedback de sucesso e reload da primeira página após `202`.

### Não incluído

- Worker de IA ou execução do processamento.
- Polling e detalhe real.
- Visualizador PDF.
- Pareceres, revisão, conclusão ou retry de processamento.
- Busca, filtros, ordenação ou nova semântica de paginação.
- Mudanças no gateway, Users API ou Analisadora API.

## 4. Fronteiras e contrato

```text
Browser FormData
└── POST /api/analyses
    └── Next.js BFF, stream one-shot
        └── POST /analisadora-api-licia/processes
            └── Gateway → Analisadora API → MinIO/PostgreSQL
```

O browser não define `Content-Type` manualmente; o boundary é produzido pela plataforma. O BFF valida origem, envelope multipart e tamanho total, encaminha somente headers necessários e nunca expõe access token, refresh token ou URL do gateway.

O retorno `202` é aceito somente com o DTO esperado e `processingStatus: pending`. O BFF normaliza a resposta para `id`, `nup`, `subject`, `processingStatus` e `createdAt`.

## 5. Sessão e retry

- A sessão é verificada antes de o stream ser consumido.
- Access token ausente, expirado ou com menos de 60 segundos de validade provoca no máximo um refresh.
- Falha de refresh retorna `401` sem encaminhar o upload.
- Depois que o stream começa, existe somente uma tentativa downstream.
- `401`, timeout, conexão interrompida e `5xx` não repetem o POST.
- Como criação não possui idempotency key e NUP não é único, resultados ambíguos orientam o usuário a conferir a lista antes de reenviar.

## 6. Respostas do BFF

| Situação | Status | Código |
|---|---:|---|
| Análise aceita | 202 | DTO normalizado |
| Campos ou PDF inválidos | 400 | `invalid-analysis` |
| Sessão inválida | 401 | `unauthorized` |
| Arquivo/body acima do limite | 413 | `file-too-large` |
| Resposta 202 incompatível | 502 | `invalid-upstream-response` |
| Falha downstream | 503 | `upload-outcome-unknown` |
| Timeout do BFF | 504 | `upload-timeout` |

Todas as respostas permanecem `private, no-store` e variam por cookie.

## 7. Arquivos principais

| Arquivo/Módulo | Responsabilidade |
|---|---|
| `src/app/api/analyses/route.ts` | GET e POST allowlisted, limite do stream e mapeamento de erros |
| `src/features/auth/gateway.ts` | Refresh preventivo e upload one-shot |
| `src/features/analyses/data/analysisMutations.ts` | Contrato e normalização da criação |
| `src/features/analyses/list/NewAnalysisModal.tsx` | Validação, envio e preservação do formulário |
| `src/features/analyses/list/NewAnalysisAction.tsx` | Construção do FormData e consumo do BFF |
| `src/features/analyses/list/AnalysisListLoader.tsx` | Feedback e reload da página 1 |

## 8. Critérios de aceite

- [x] O navegador chama somente o BFF same-origin.
- [x] O BFF não usa `request.formData()` nem materializa o PDF.
- [x] Tokens e gateway permanecem server-only.
- [x] O multipart usa somente `nup`, `contractObject` e `file`.
- [x] Há no máximo um refresh antes do stream e uma tentativa de upload.
- [x] NUP, PDF e limite de 50 MiB possuem validação de UX; a API continua autoritativa.
- [x] Submissão duplicada é bloqueada.
- [x] Falhas recuperáveis preservam NUP, objeto e arquivo selecionado; sessão expirada redireciona para novo login.
- [x] `202` fecha o modal, apresenta sucesso e recarrega a página 1.
- [x] O processo criado pertence somente ao usuário autenticado e inicia em `pending`.
- [x] Worker, polling, detalhe, PDF, revisão, conclusão, busca, filtros e ordenação não foram integrados.

## 9. Validação executada

- [x] `npm run lint`.
- [x] `npm run typecheck`.
- [x] `npm run build`.
- [x] `git diff --check`.
- [x] Login e criação real pela interface contra Traefik, Users API e Analisadora API.
- [x] Refresh preventivo com access cookie removido e refresh cookie válido.
- [x] `400` para PDF inválido, `401` sem sessão, `413` acima de 50 MiB e `5xx` real convertido em `503`.
- [x] PDF com exatamente 52.428.800 bytes atravessou o BFF e foi rejeitado com `413` pela API, confirmando a divergência externa de fronteira.
- [x] Uma única requisição após clique duplicado.
- [x] Formulário preservado após rejeição.
- [x] Feedback de sucesso e nova leitura da página 1.
- [x] Registro no PostgreSQL com `pending`, `job_token` e `finished_at` nulos.
- [x] Objeto PDF presente no MinIO com key por usuário e `application/pdf`.
- [x] Processo ausente da lista do segundo usuário.

O worker não foi iniciado. Timeout real e resposta `202` malformada não foram injetados na stack compartilhada; seus branches foram cobertos pela implementação e permanecem pendentes de teste controlado automatizado.

## 10. Limitações externas

- A API usa Multer `memoryStorage`; uploads concorrentes próximos de 50 MiB aumentam a memória do serviço por arquivo.
- O contrato declara até 50 MiB, mas a Analisadora API rejeita com `413` o arquivo de exatamente 52.428.800 bytes. A camada externa precisa alinhar implementação e contrato.
- O Traefik local mantém timeout de leitura padrão e o body size/timeout do Istio ainda precisa ser confirmado.
- A criação não possui idempotency key; timeout ou conexão interrompida têm resultado potencialmente ambíguo e não podem ser repetidos automaticamente.
- A listagem ordena somente por `createdAt DESC` com precisão de segundos; a posição do item novo não é determinística em empates. O frontend recarrega a página 1, mas usa o `202` como confirmação de sucesso.

## 11. Rollback

O rollback remove o POST do BFF e restaura a confirmação simulada do modal. Não há migration ou mudança contratual em serviços externos.
