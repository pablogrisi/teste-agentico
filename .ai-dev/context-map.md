# Mapa de contexto obrigatório

Este arquivo define o caminho de leitura antes de qualquer mudança relevante em LicIA Analisadora. A estrutura abaixo já vem pronta; preencha o conteúdo específico do projeto onde houver `<preencher>`.

## Leitura mínima em toda nova sessão

1. `START_HERE.md`
2. `.ai-dev/workflow.md`
3. `docs/engineering/checkpoint.md`, se existir

## Quando a demanda afetar produto

Leia também:

- `docs/product/prd.md`
- `docs/product/roadmap.md`, se existir
- `docs/product/questoes-abertas.md`, se existir

Use o PRD para entender escopo do MVP, personas, requisitos funcionais, não objetivos e pontos ainda em aberto. Use o roadmap para saber a sequência das features, o status de cada uma, e a User Story já aprovada da feature em ciclo — nunca escreva ou reescreva a User Story de uma feature fora do seu ciclo (ver `.ai-dev/agent-roles.md`, Agente PM). Use `questoes-abertas.md` como índice consolidado de decisões de produto/arquitetura ainda pendentes — confira lá antes de assumir que um ponto em aberto já foi resolvido.

## Quando a demanda envolver qual papel de agente age agora

Leia `.ai-dev/agent-roles.md` (definição de cada papel) e `.ai-dev/workflow.md`, seção "Ciclo por feature" (a ordem e os pontos de aprovação entre eles). Se for rodar como subagente nativo da ferramenta, veja `.ai-dev/agents/README.md` para onde está o adaptador de cada papel.

## Quando a demanda afetar arquitetura

Leia também:

- `docs/architecture/sdd.md`

Use o SDD para entender fronteiras técnicas, componentes, fluxos de dados e decisões abertas.

## Quando a demanda afetar implementação

O repositório é um **monorepo** com duas frentes independentes, cada uma com seu ciclo e suas TSDs:

- `backend/` — serviço NestJS (responsável: Pablo). Fundação: TSD-001.
- `frontend/` — app Next.js (responsável: Vinicius). Fundação: TSD-002.
- Raiz — método (`.ai-dev/`), docs (`docs/`), protótipo (`Prototipo Licia Analisadora/`), compartilhados.

Leia também:

- a TSD ativa da sua frente em `docs/engineering/specs/`;
- a TSD de fundação da sua frente (001 backend, 002 frontend), para entender o que já foi entregue;
- o `package.json` da frente (`backend/package.json` ou `frontend/package.json`) para comandos e scripts;
- quando um RF envolve as duas frentes, o contrato de API é definido na TSD de backend do RF e consumido pela de frontend.

## Quando a demanda afetar testes

- `.ai-dev/quality-gates.md` — comandos reais por frente e o que cada tipo de teste prova/não prova neste projeto.
- **Backend** (`backend/`): runner **Jest** (seção `jest` no `package.json` para unit; `test/jest-e2e.json` para e2e/integração), **Supertest** para a API real. `test:e2e` sobe um **PostgreSQL embutido** via `test/embedded-postgres.globalSetup.ts` (sem Docker); `E2E_EXTERNAL_DB=true` + `DATABASE_URL` usa um banco externo. Passa a existir com a TSD-001; a integração real do importador (RF-006) roda desde a TSD-003.
- **Frontend** (`frontend/`): **Vitest + React Testing Library + jsdom** para teste de componente; slices de interface exigem também screenshots antes/depois vs. referência visual (`.ai-dev/visual-reference-workflow.md`). Passa a existir com a TSD-002.
- Dependência externa cara/instável: a capacidade de análise por IA. Todo teste automatizado do backend usa o `StubAdapter` da `AnaliseIaPort`; o comportamento real só via smoke manual. O frontend trabalha com fixtures atrás da camada de dados até os contratos por RF existirem.

## Contexto visual e discovery

- **Protótipo navegável:** `Prototipo Licia Analisadora/` (React + Vite + React Router; rodar com `npm install && npm run dev`). Telas: `/` (lista de análises + modal "Nova análise") e `/analise/:id` (visor de PDF + painel com abas Checklist e Técnica, filtros por parecer, modal de alteração de parecer, modal de conclusão). É **referência de UX** — layout, hierarquia, estados visuais, textos e padrões de interação —, **nunca fonte de cópia de código, de contrato de dados ou de arquitetura**. Backend, upload e dados do protótipo são fake.
- **Discovery de produto:** `docs/licia-analisadora-product-discovery.md` (citado no frontmatter do PRD; confirmar se está versionado neste repo).
- **Divergências conhecidas protótipo × PRD/SDD** (o PRD/SDD vence; registrar na TSD que tocar o tema):
  - O protótipo tem **4 situações** de item (`Conforme`, `Com ressalva`, `Não-conforme`, `Não se aplica`). O PRD define **3** (`Conforme`, `Não conforme`, `Não se aplica`) — "Com ressalva" **não** existe no MVP.
  - No protótipo, a aba **Técnica** são "observações" neutras sem situação; a semântica definitiva de Checklist × Técnica é questão aberta (`questoes-abertas.md` P-04).
  - O protótipo mostra "responsável pela adição" por linha; no MVP há analista único fixo (RF-003 adiado).
- O frontend real é uma aplicação **Next.js separada**, não este protótipo.

Referência visual formal existe: leia `.ai-dev/visual-reference-workflow.md` antes de qualquer TSD que altere interface — ele define o fluxo obrigatório de inspeção, preenchimento da seção "Referências visuais" da TSD, e comparação por screenshot.

## Linguagem do domínio

Se o projeto tiver termos ambíguos ou compartilhados com outros sistemas da suíte, use `docs/product/glossario.md` como referência de nomenclatura antes de nomear entidades, campos ou eventos novos.

## Fonte de verdade do estado atual

O checkpoint de engenharia é a fonte de verdade do estado atual. Se houver divergência entre lembrança da sessão e checkpoint, atualize a investigação pelo checkpoint.
