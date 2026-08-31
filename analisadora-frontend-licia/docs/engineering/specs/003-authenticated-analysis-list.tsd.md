---
title: TSD - Authenticated Analysis List
type: tsd
status: completed
created: 05/08/2026 - 14:48 // Rolf Matela
updated: 05/08/2026 - 15:51 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md
---

# TSD — Authenticated Analysis List

## 1. Resumo

Esta slice substitui a autenticação mock e a listagem mock por uma integração vertical read-only através do gateway público. O Next.js atua como BFF: tokens permanecem em cookies server-only e o navegador acessa somente uma rota allowlisted da própria aplicação.

## 2. Objetivo técnico

Validar de ponta a ponta login, renovação de sessão, logout, identidade, ownership e listagem paginada sem expor tokens ao JavaScript e sem integrar criação, detalhe, PDF, processamento ou revisão.

## 3. Escopo

### Incluído

- Login e refresh pela Users API através do gateway público.
- Access e refresh tokens somente em cookies `HttpOnly`.
- BFF `GET /api/analyses` com query allowlist.
- Uma tentativa de refresh e uma repetição da requisição original.
- Listagem real com paginação e mapeamento para a UI atual.
- Estados de carregamento, vazio, sessão expirada, indisponibilidade e retry.
- Busca, ordenação e filtro genérico visivelmente desabilitados.
- Validação de ownership com dois usuários.

### Não incluído

- Criação ou upload de análise.
- Detalhe real, PDF, processamento, retry de job ou revisão.
- Mudanças nas decisões de produto.
- Chamadas diretas do navegador ao gateway.
- Alterações no PRD ou nas TSDs 001 e 002 concluídas.

## 4. Fronteiras e contratos

```text
Browser → Next.js BFF → Gateway público → Users API / Analisadora API
```

- `POST /users-api-licia/auth/login`
- `POST /users-api-licia/auth/refresh`
- `GET /analisadora-api-licia/processes?page&pageSize`

O gateway é a única entrada downstream. O BFF não aceita path arbitrário, não retorna tokens e não compartilha cache entre usuários.

## 5. Arquivos principais

| Arquivo/Módulo | Responsabilidade |
|---|---|
| `src/features/auth/session.ts` | Cookies e metadados mínimos da sessão |
| `src/features/auth/gateway.ts` | Login, refresh e chamada autenticada centralizada |
| `src/app/api/analyses/route.ts` | BFF allowlisted da listagem |
| `src/features/analyses/data/analysisQueries.ts` | Consulta, validação do DTO e mapeamento da lista |
| `src/features/analyses/list/AnalysisListLoader.tsx` | Estados e carregamento client-side |
| `src/features/analyses/list/AnalysisList.tsx` | Apresentação e paginação |

## 6. Critérios de aceite

- [x] Login e refresh usam somente os paths públicos do gateway.
- [x] Access e refresh tokens ficam somente em cookies `HttpOnly`.
- [x] Nenhum token é retornado pelo BFF ou armazenado no runtime cliente.
- [x] `GET /api/analyses` rejeita parâmetros desconhecidos ou inválidos.
- [x] Requisição autenticada executa no máximo um refresh e um retry.
- [x] A listagem mostra somente processos do usuário autenticado.
- [x] Paginação e tamanhos 10, 20 e 50 funcionam.
- [x] Loading, vazio, indisponibilidade, retry e sessão expirada estão cobertos.
- [x] Busca, sort e filtros não suportados permanecem desabilitados.
- [x] Detalhe, criação, PDF e revisão continuam mockados.
- [x] PRD e TSDs concluídas permanecem inalterados.

## 7. Validação obrigatória

- [x] Executar `npm run lint`.
- [x] Executar `npm run typecheck`.
- [x] Executar `npm run build`.
- [x] Validar login válido e inválido.
- [x] Validar refresh e expiração da sessão.
- [x] Validar logout.
- [x] Validar ownership com dois usuários.
- [x] Validar lista populada, vazia, indisponível e retry.
- [x] Confirmar headers de não cache e ausência de tokens nas respostas.
- [x] Atualizar SDD e checkpoint com evidências reais.

As validações funcionais foram repetidas contra a stack Docker local real, com Traefik, Users API, MongoDB, PostgreSQL, MinIO e Analisadora API. Foram usados dois usuários reais e processos distintos criados pelo endpoint multipart público. Login, refresh, logout, rewrite, forward-auth, remoção de identidade forjada, ownership, paginação, estados 400/401/5xx, retry, cookies, cache e bloqueio de `/internal` e `/docs` passaram. O worker de IA não foi iniciado por estar fora do escopo desta slice.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Token alcançar JavaScript | Cookies `HttpOnly` e BFF same-origin |
| Loop de refresh | Uma única tentativa e um único retry |
| Cache compartilhar dados | `no-store`, `private` e `Vary: Cookie` |
| BFF virar proxy aberto | Route Handler allowlisted e query estrita |
| Sessão aparentar autorização | Gateway permanece autoridade; perfil local é apenas apresentação |
| Paridade entre Traefik e Istio | Validar o gateway do ambiente antes de Release |

## 9. Rollback

O rollback restaura login e listagem mockados e remove a rota BFF. Não existe migração de dados ou alteração de contrato nos serviços downstream.
