---
title: TSD - Frontend Foundation
type: tsd
status: completed
created: 09/07/2026 - 10:36 // Rolf Matela
updated: 10/07/2026 - 11:31 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
related (external files):
- decisoes-analisadora-api.md
---

# TSD — Frontend Foundation

## 1. Resumo

Esta slice define a fundação técnica do repositório frontend da LicIA Analisadora. O objetivo é preparar a base de projeto, estrutura, convenções e validações mínimas para que as próximas slices implementem funcionalidades de produto sem depender do protótipo atual nem da prontidão da API.

A fundação deve ser criada seguindo o setup oficial do Next.js por meio de `create-next-app`, evitando configuração manual desnecessária e reduzindo risco de estrutura inicial incompleta ou desatualizada.

## 2. Objetivo técnico

Esta alteração precisa resolver tecnicamente a preparação do frontend, com base suficiente para evolução incremental. Isso inclui criar a fundação do app React/Next, estabelecer uma estrutura inicial de diretórios, configurar baseline de TypeScript e validação de qualidade, definir convenções iniciais de roteamento.

Nota de execução: a fundação foi concluída com bootstrap baseado em `create-next-app`, app shell placeholder em `src/app/` e validações registradas no checkpoint por meio de `npm install`, `npm run lint`, `npm run typecheck`, `npm run build` e `timeout 20s npm run dev`.

## 3. Escopo

### Incluído

- Bootstrap do novo projeto frontend em React/Next usando `create-next-app`.
- Definição da estrutura inicial de repositório e módulos principais.
- Inclusão da documentação central de produto/arquitetura necessária nesse repositório.
- Configuração de baseline de TypeScript.
- Configuração da estratégia inicial de lint/build/checagens mínimas.
- Criação de um app shell placeholder inicial.
- Definição da convenção inicial de roteamento.
- Registro de que mock API adapter e contratos de domínio ficarão para uma slice futura.
- Criação do checkpoint inicial de engenharia.

### Não incluído

- Telas de funcionalidade de produto.
- Lista de análises.
- Fluxo de criação de análise.
- Tela de detalhe da análise.
- Workflow de revisão de requisitos.
- Implementação do mock API adapter.
- Integração com backend/API.
- Implementação de autenticação.
- Implementação de visualizador de PDF.
- Geração de relatório final.

## 4. Arquivos / módulos afetados

| Arquivo/Módulo | Mudança esperada |
|---|---|
| `package.json` | Criar via bootstrap do Next.js e validar scripts mínimos |
| `.gitignore` | Criar via bootstrap e revisar |
| `next.config.*` | Criar via bootstrap, mantendo configuração mínima |
| `tsconfig.json` | Criar com TypeScript e alias `@/*` |
| `eslint.config.*` ou equivalente | Criar configuração inicial de lint |
| `.env.example` ou `app/` | Criar com placeholders, sem segredos reais |
| `src/app/` | Criar via bootstrap do Next.js |
| `src/shared/` ou equivalente | Criar estrutura inicial compartilhada, se necessário |
| `src/styles/` ou equivalente | Criar estrutura inicial de estilos/tokens, se necessário |
| `docs/product/licia-analisadora-prd.md` | Validar presença |
| `docs/architecture/licia-analisadora-sdd.md` | Validar presença |
| `docs/engineering/specs/001-frontend-foundation.tsd.md` | Atualizar |
| `docs/engineering/licia-analisadora-engineering-checkpoint.md` | Atualizar |

## 5. Plano de implementação

1. Inicializar o projeto com `create-next-app`, seguindo o setup oficial do Next.js e as opções definidas nesta TSD.

2. Usar as seguintes opções de bootstrap:
- TypeScript: sim.
- App Router: sim.
- Diretório `src/`: sim.
- ESLint: sim.
- Import alias: `@/*`.
- Tailwind: não, salvo decisão posterior.
- Package manager: usar o padrão definido para o projeto. Se não houver decisão, usar `npm`.

3. Confirmar que os arquivos básicos de projeto foram criados ou ajustados.

4. Adicionar `.env.example` sem segredos reais.

5. Garantir que `.gitignore` não permita versionar arquivos sensíveis ou gerados.

6. Criar ou ajustar app shell placeholder sem implementar funcionalidades de produto.

7. Configurar scripts mínimos em `package.json`.

8. Validar a fundação com os comandos obrigatórios definidos nesta TSD.

9. Atualizar `docs/engineering/licia-analisadora-engineering-checkpoint.md` com alterações, validações, riscos e próximo passo recomendado.

10. Atualizar critérios de aceite e validação obrigatória do `docs/engineering/specs/001-frontend-foundation.tsd.md`.

## 6. Contratos / interfaces

Nesta slice, não haverá contrato de integração com backend nem implementação de mock API adapter.

Devem ficar apenas registradas as seguintes decisões de fronteira para o frontend futuro:

- a UI não deve consumir fixtures diretamente;
- a comunicação de dados deve passar por uma camada de adapter/serviço a ser criada em slice posterior;
- os contratos de domínio do frontend serão definidos junto com o mock API adapter em uma slice futura, com base no PRD e no SDD;
- nenhuma tela de produto deve depender de contrato HTTP real nesta etapa;
- autenticação real e sessão de usuário ficam fora desta slice.

## 7. Critérios de aceite

- [x] Este repositório frontend pode ser iniciado sem dependência direta do protótipo de alta fidelidade.
- [x] O projeto foi inicializado com Next.js, TypeScript, App Router e diretório `src/`.
- [x] Existe estrutura inicial de projeto, roteamento e app shell sem implementação de features de produto.
- [x] TypeScript, lint e build mínimo estão definidos como baseline do novo repositório.
- [x] `.gitignore` existe e cobre arquivos gerados.
- [x] A documentação central necessária para continuidade do trabalho está disponível no novo repositório.
- [x] Está documentado que mock API adapter e contratos de domínio ficam para uma slice futura.
- [x] Não há consumo direto de fixtures ou mocks espalhados na UI.
- [x] Não há implementação de telas de produto além de placeholder/app shell.

## 8. Validação obrigatória

- [x] Validar que a fundação não implementa telas de produto além de placeholder/app shell.
- [x] Validar que o projeto instala dependências corretamente.
- [x] Validar que o projeto sobe em modo desenvolvimento.
- [x] Validar que o projeto sobe e compila com configuração mínima.
- [x] Validar que lint e build possuem comandos definidos.
- [x] Validar que a convenção de roteamento inicial está registrada.
- [x] Validar que a documentação central foi incorporada ao repositório.
- [x] Validar que não há acoplamento direto da UI a dados mockados fixos nesta slice.
- [x] Validar se a implementação da slice impacta o PRD ou o SDD.
- [x] Validar os critérios de aceite desta TSD ao final da implementação.
- [x] Se houver impacto em comportamento de produto, atualizar ou sinalizar necessidade de atualização em `docs/product/licia-analisadora-prd.md`.
- [x] Se houver impacto em arquitetura, estrutura técnica ou fronteiras de sistema, atualizar ou sinalizar necessidade de atualização em `docs/architecture/licia-analisadora-sdd.md`.
- [x] Marcar nesta TSD os critérios de aceite concluídos, com base nas evidências de implementação e validação.
- [x] Marcar nesta TSD as validações obrigatórias concluídas, sem marcar itens que não foram executados.
- [x] Atualizar o status desta TSD para `completed` somente se todos os critérios obrigatórios tiverem sido atendidos.
- [x] Registrar no checkpoint se PRD/SDD foram atualizados, não impactados ou ficaram pendentes de revisão.
- [x] Registrar no checkpoint a conclusão da TSD, os comandos executados, pendências, riscos e próximo passo recomendado.

## 9. Riscos e cuidados

| Risco | Mitigação |
|---|---|
| Inicializar o projeto com configuração manual incompleta ou desatualizada | Usar `create-next-app` como base e ajustar apenas o necessário |
| Iniciar o frontend antes da prontidão da API gerar bloqueio ou retrabalho | Isolar esta slice como fundação e deixar adapter/mock e integração para slices posteriores |
| Acoplamento precoce da UI a fixtures locais | Proibir consumo direto de fixtures na UI e reservar uma camada de adapter para a próxima slice |
| Antecipar detalhes de integração cedo demais | Manter integração, autenticação real e contratos HTTP fora desta slice |
| Estrutura inicial ficar genérica demais ou inconsistente | Registrar convenções mínimas de estrutura, roteamento e validação já nesta primeira slice |

## 10. Rollback

Como esta slice cria apenas a fundação do novo frontend, o rollback pode ser feito isolando ou revertendo a inicialização do repositório e sua configuração base, sem impacto em funcionalidades de produto, já que nenhuma feature de negócio deve ser implementada aqui.

## 11. Prompt de execução para agente

Read docs/engineering/specs/001-frontend-foundation.tsd.md and the central checkpoint before making changes.

Use create-next-app as the base for the frontend foundation.

Implement only the scope described in this spec. Do not expand scope.

Preserve existing behavior unless explicitly stated.

Run the validation checklist.

Update docs/engineering/licia-analisadora-engineering-checkpoint.md with:

- what changed
- validation results
- risks
- next recommended step

Before finishing:

- validate the acceptance criteria in this TSD;
- mark completed acceptance criteria in this TSD only when there is evidence they were satisfied;
- mark completed mandatory validations in this TSD only when they were actually executed;
- do not mark unchecked items as completed if they were not validated;
- if all required criteria and validations passed, update this TSD status to `completed`;
- if something remains pending, keep this TSD as `draft` and document the pending items;
- check whether this slice changed or invalidated any assumption in the PRD or SDD;
- update PRD/SDD only if the slice actually affects product behavior or architecture;
- if no PRD/SDD update is needed, explicitly record that in the checkpoint;
- update the checkpoint with implementation summary, validation results, documentation impact, risks and next recommended step.
