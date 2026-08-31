# TSD — Fundação técnica do frontend LicIA Analisadora

---
title: TSD - Fundação técnica do frontend LicIA Analisadora
type: tsd
status: aprovada — não implementada
created: 31/08/2026 // Pablo Grisi (rascunho); implementação: Vinicius
updated: 31/08/2026 // Pablo Grisi
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/001-fundacao-tecnica.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

Esta slice cria o esqueleto do **app frontend** da LicIA Analisadora em `frontend/`: um projeto Next.js + TypeScript que sobe, tem as duas rotas do produto como telas-casca (`/` e `/analise/:id`), um tema/tokens adaptados do protótipo, uma camada de dados isolada atrás de um seam (com fixtures, sem backend real) e os quality gates rodando (`lint`, `typecheck`, `test`, `build`). **Não entrega nenhuma feature de produto**: as telas são cascas com layout e navegação, sem a lógica de listagem, criação, revisão ou conclusão.

É a fundação paralela à TSD-001 (backend). As duas são independentes: Vinicius implementa esta numa branch, Pablo implementa a TSD-001; o merge junta `backend/` e `frontend/` no monorepo.

**User Story de origem:** nenhuma — TSD-002 é fundação técnica, não vem do ciclo de uma feature de produto.

## 2. Objetivo técnico

Ao final desta slice (comandos rodados de `frontend/`):

- `npm install && npm run dev` sobe o app localmente (Next.js).
- `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` rodam e passam.
- Existem as rotas `/` (lista de análises) e `/analise/[id]` (tela de análise) renderizando um layout base (Topbar + área de conteúdo) com conteúdo placeholder — sem dados reais de produto.
- Há um tema (tokens de cor, tipografia, espaçamento, raio, elevação) adaptado do protótipo `Prototipo Licia Analisadora/src/theme/`, aplicado ao layout base.
- Há uma **camada de dados** (`lib/api/` ou equivalente) atrás de uma interface, com uma implementação de **fixtures** e um ponto único onde, no futuro, entra o cliente HTTP real contra o backend. Nenhum componente de tela fala com `fetch` direto.
- Setup de teste de componente (Vitest + React Testing Library) com 1 teste trivial provando que a infra funciona.
- `README.md` do frontend: como rodar, testar, e onde fica o seam de dados.
- `.env.example` com as variáveis previstas (ex.: `NEXT_PUBLIC_API_BASE_URL`, ainda não usada de fato).

## 3. Escopo

### Incluído

- `frontend/` com projeto Next.js + TypeScript (App Router), ESLint + Prettier, `tsconfig` estrito.
- Scripts no `package.json` do frontend: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (Vitest), `test:watch`, `ci` (encadeia `lint && typecheck && test && build`).
- Layout base: componente de Topbar e shell de página, a partir da referência visual (ver §10). Marca/logo tratada como asset, não copiada de código.
- Tema: tokens adaptados de `Prototipo Licia Analisadora/src/theme/` (`primitiveColors`, `semanticColors`, `typography`, `spacing`, `borderRadius`, `elevation`) para a convenção do projeto real (CSS variables / solução de styling escolhida na implementação e registrada).
- Rotas:
  - `/` — tela-casca "Lista de análises" com o layout base e um estado placeholder.
  - `/analise/[id]` — tela-casca "Análise" com o layout base, um espaço para o visor de PDF e um espaço para o painel de revisão, ambos placeholder.
- Camada de dados: interface (ex.: `AnalisesGateway`) + `FixturesAnalisesGateway` com dados de exemplo derivados do protótipo (`src/data/`). Um único módulo de composição escolhe a implementação por env/config.
- Setup de teste de componente: Vitest + React Testing Library + jsdom; config e um teste do layout base.
- `README.md` do frontend e `.env.example`.
- Ajuste do `.gitignore` para artefatos do Next (`.next/`, etc.) se ainda não coberto pela raiz.

### Fora do escopo

- Qualquer feature de produto (RF-001…RF-018): nada de listar/criar/revisar/concluir de verdade, nada de filtros, modais funcionais, upload real, visor de PDF real.
- Integração HTTP real com o backend — só o seam fica pronto; a implementação real entra nos ciclos de cada RF.
- Autenticação / tela de login (não há identidade no MVP).
- Fidelidade pixel a pixel das telas — isso é trabalho dos ciclos por RF, com o `visual-reference-workflow`. Aqui só o frame/layout base.
- Backend (`backend/`) e qualquer coisa da TSD-001.
- SSR/ISR avançado, i18n, PWA, análise de performance.

## 4. Contexto consultado

- `START_HERE.md`
- `.ai-dev/context-map.md` (seções "testes" e "Contexto visual e discovery")
- `docs/engineering/checkpoint.md`
- `docs/product/prd.md` (§6 jornada, §7 RFs — para nomear rotas e telas)
- `docs/architecture/sdd.md` (§2 — monorepo, frentes; §7 — formato geral dos fluxos que o frontend vai consumir)
- `docs/product/glossario.md` (nomes de domínio nas telas)
- `.ai-dev/visual-reference-workflow.md`
- `Prototipo Licia Analisadora/` (referência visual — `src/theme/`, `src/components/Topbar/`, `src/routes/`)
- `docs/engineering/specs/001-fundacao-tecnica.tsd.md` (alinhar versão de Node / gerenciador de pacotes)

## 5. Impacto esperado

- **Produto:** nenhum comportamento de produto novo — telas-casca.
- **Arquitetura:** materializa a frente `frontend/` do monorepo e o seam de dados que isola a UI do transporte HTTP.
- **Implementação:** cria o app frontend do zero.
- **Testes:** estabelece a infraestrutura de teste de componente que o Agente de Testes do frontend vai usar.
- **Documentação:** `README.md` do frontend; atualização de checkpoint e `.ai-dev/audit.md` ao final.
- **Operação:** nenhum deploy nesta slice.

## 6. Plano de implementação

1. Criar `frontend/` e inicializar Next.js + TypeScript (App Router). Alinhar Node/npm com a TSD-001.
2. Configurar ESLint + Prettier + `tsconfig` estrito; scripts `lint`, `typecheck`.
3. Configurar Vitest + React Testing Library + jsdom; script `test`; criar `test/` (ou `__tests__/`).
4. Inspecionar a referência visual (protótipo) e preencher/rever a §10 desta TSD **antes** de ativar a slice no checkpoint.
5. Portar os tokens de tema do protótipo para a convenção do projeto real (sem copiar CSS bruto).
6. Construir o layout base (Topbar + shell) a partir da referência.
7. Criar as rotas `/` e `/analise/[id]` como telas-casca usando o layout base.
8. Criar a camada de dados: interface + `FixturesAnalisesGateway` + módulo de composição por env. Fixtures derivados de `Prototipo Licia Analisadora/src/data/`.
9. Escrever 1 teste de componente do layout base.
10. Escrever `README.md` do frontend e `.env.example`.
11. Rodar `lint`, `typecheck`, `test`, `build` e registrar a saída real.
12. Capturar screenshots das telas-casca e comparar o frame com a referência (§10).

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário (lógica isolada, dependências mockadas) | Sim | Provar a infra de teste de componente: 1 teste do layout base (renderiza Topbar, renderiza children). O `FixturesAnalisesGateway` ganha um teste simples de que devolve a fixture esperada. Volume pequeno de propósito — não há lógica de produto. |
| Integração (módulos/camadas reais) | Não nesta slice | Não há backend real nem integração entre camadas além de render + gateway de fixture (coberto no unitário). O seam de dados real entra nos ciclos por RF. |
| Contrato (formato entre serviços que não sobem juntos) | Não nesta slice | O contrato REST com o backend ainda não existe (definido por RF na TSD de backend). Quando existir, o frontend valida o formato que consome via teste de contrato contra um schema/exemplo compartilhado. |
| Smoke/validação manual contra dependência externa real | Não | Sem dependência externa real nesta slice. |

Além disso, por ser slice de interface: **screenshots antes/depois** do frame das telas-casca e comparação visual com a referência do protótipo (`visual-reference-workflow.md`).

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

## 8. Critérios de aceite

- [ ] `npm install` a partir de um clone limpo + `npm run dev` sobe o app sem erro.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` terminam com sucesso, com a saída real registrada no checkpoint/relatório de sessão.
- [ ] `/` e `/analise/[id]` renderizam o layout base (Topbar + conteúdo) com placeholder; navegação entre elas funciona.
- [ ] Os tokens de tema do protótipo estão portados e aplicados ao layout base (cores, tipografia, espaçamento).
- [ ] Nenhum componente de tela chama `fetch`/HTTP diretamente; todo acesso a dados passa pela interface da camada de dados, hoje servida por fixtures.
- [ ] Há 1 teste de componente do layout base e 1 do gateway de fixtures, ambos passando.
- [ ] Nenhuma feature de produto implementada (sem listagem real, criação, revisão, conclusão, filtros, upload, visor de PDF real).
- [ ] §10 preenchida e revisada antes da ativação; screenshots do frame capturados e comparados com a referência.
- [ ] `README.md` do frontend e `.env.example` presentes.

## 9. Riscos e decisões abertas

- **Solução de styling** (CSS Modules como no protótipo, CSS-in-JS, Tailwind, etc.): decidir na implementação e registrar; não copiar a estrutura de CSS do protótipo cru.
- **Runner de teste** (Vitest recomendado; Jest é alternativa): decidir e alinhar com o Agente de Testes do frontend.
- **Contrato de API inexistente:** o frontend avança com fixtures até cada RF de backend publicar seu contrato. Risco de retrabalho no gateway quando os contratos chegarem — mitigado por manter a UI atrás da interface e os fixtures espelhando o glossário.
- **Divergências protótipo × PRD** já registradas em `.ai-dev/context-map.md` (4 vs. 3 status, área Técnica, "responsável" por linha): não reproduzir as do protótipo que contrariam o PRD.
- **Versão de Node / gerenciador de pacotes:** deve bater com a TSD-001.

## 10. Referências visuais

Referência: protótipo navegável `Prototipo Licia Analisadora/` (React + Vite). Esta slice implementa **apenas o frame/layout base e as cascas de rota** — não as telas completas.

| ID | Papel na aplicação | Link/localização | Nome na ferramenta de origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| REF-01 | Tema / tokens visuais (cor, tipografia, espaçamento, raio, elevação) | `Prototipo Licia Analisadora/src/theme/` | `theme/*` | tokens base (claro) | Pendente |
| REF-02 | Topbar / cabeçalho global | `Prototipo Licia Analisadora/src/components/Topbar/` | `Topbar` | padrão | Pendente |
| REF-03 | Shell da tela de lista de análises (frame, sem a tabela/dados) | `Prototipo Licia Analisadora/src/routes/HomePage/` | `HomePage` | com conteúdo (frame); estado vazio é de RF-002, fora desta slice | Pendente |
| REF-04 | Shell da tela de análise (frame: espaço do visor + espaço do painel) | `Prototipo Licia Analisadora/src/routes/AnalysisPage/` | `AnalysisPage` | frame; abas/filtros/modais são de RFs próprios, fora desta slice | Pendente |

Screenshots obrigatórios: `/` (casca) e `/analise/[id]` (casca), antes (não há — telas novas) e depois; comparação do frame (Topbar, grid de layout, tokens) com REF-02/03/04.

Gaps conhecidos entre implementação atual e referência: telas-casca não têm tabela, filtros, modais, visor de PDF nem dados — todos previstos para os ciclos por RF, não para esta slice. Divergências protótipo × PRD listadas em `.ai-dev/context-map.md` valem aqui.

Esta TSD não deve ser ativada nem implementada enquanto os `Status de inspeção` acima estiverem `Pendente`.

## 11. Rollback

A slice cria `frontend/` isolado. Rollback = remover `frontend/` e reverter os ajustes de `.gitignore` da raiz, sem impacto em `.ai-dev/`, `docs/`, `backend/` ou no protótipo.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD, o checkpoint de engenharia e
.ai-dev/visual-reference-workflow.md.
Implemente apenas o escopo desta TSD (fundação técnica do frontend, em frontend/). Não crie
nenhuma feature de produto: as telas são cascas com layout e navegação, sem dados reais nem
lógica de listagem/criação/revisão/conclusão. Não toque em backend/.
Inspecione a referência visual e preencha/reveja a seção 10 antes de ativar a slice no checkpoint.
Nenhum componente deve chamar HTTP direto — todo acesso a dados passa pela camada de dados (fixtures).
Execute lint, typecheck, test e build de dentro de frontend/, e registre a saída real de cada um.
Capture screenshots das cascas e compare o frame com a referência.
Marque um critério de aceite ou validação como concluído somente com evidência real de execução.
Atualize checkpoint e .ai-dev/audit.md ao final, com pendências e próximo passo recomendado.
```
