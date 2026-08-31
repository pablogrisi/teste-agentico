# Roteiro de fundação — perguntas que a IA faz num projeto novo

Este roteiro existe porque, na fundação de um projeto (quando `docs/engineering/checkpoint.md` ainda não existe), não há nenhum documento de onde inferir respostas — perguntar é a única opção correta. Sem um roteiro fixo, cada sessão perguntaria de um jeito diferente, o que quebra a promessa de método consistente entre ferramentas. Este arquivo fixa a ordem e o conteúdo das perguntas, para que qualquer agente (Claude, Codex, Gemini ou outro) conduza a mesma entrevista e produza os mesmos documentos a partir das mesmas respostas.

Quem preenche os documentos é a IA, não o usuário. O usuário só responde perguntas e aprova ou corrige rascunhos.

## Regras gerais

- Pergunte em etapas, uma seção de cada vez — nunca uma lista longa de uma vez só.
- Depois de cada etapa, rascunhe o documento correspondente e mostre para o usuário antes de seguir para a próxima etapa.
- Só avance depois de confirmação explícita (ou correção) do rascunho anterior.
- Se uma resposta já ficar clara a partir de uma etapa anterior, não pergunte de novo — infira, declare o que foi inferido em uma linha, e confirme, em vez de reabrir a pergunta.
- Não implemente nenhum código de produto antes da Etapa 6 estar concluída e aprovada.

## Etapa 0 — nome do projeto

Pergunta: "Qual o nome do projeto?"

Ação: substitua `{{NOME_DO_PROJETO}}` em `START_HERE.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.ai-dev/workflow.md`, `.ai-dev/quality-gates.md`, `.ai-dev/audit.md` pelo nome informado.

## Etapa 1 — produto (alimenta o PRD)

Perguntas, em ordem:

1. Qual problema esse projeto resolve, e para quem?
2. Quem são os usuários/personas, e o que cada um precisa?
3. Qual a jornada principal, do início ao fim, na primeira versão?
4. O que o projeto NÃO vai fazer nesta primeira versão? (tão importante quanto o que vai fazer)
5. Quais requisitos funcionais sustentam essa jornada, e qual a prioridade de cada um (Must/Should/Could)?
6. Que regras de negócio já são conhecidas?
7. Como o sistema deve se comportar em erro, estado vazio, sem permissão?

Ação: rascunhar `docs/product/prd.md` a partir de `.ai-dev/templates/prd.md`, mostrar para o usuário, aguardar confirmação ou correção antes de seguir.

## Etapa 2 — arquitetura e stack (alimenta o SDD e o quality-gates)

Perguntas, em ordem:

1. Qual stack técnica (linguagem, framework, banco de dados, infraestrutura)?
2. O projeto depende de outros sistemas/serviços já existentes? Quais, e como se relaciona com eles?
3. Existe alguma limitação técnica já conhecida (processamento demorado, dado sensível, integração externa instável)?
4. Existe alguma decisão de arquitetura já tomada antes desta conversa que precisa ser preservada?

Ação: rascunhar `docs/architecture/sdd.md` a partir de `.ai-dev/templates/sdd.md`, usando o PRD já confirmado como insumo — não repita perguntas cuja resposta já esteja implícita nele. Mostrar para o usuário, aguardar confirmação ou correção. Preencher `.ai-dev/quality-gates.md` com os comandos reais do stack informado (lint, typecheck, test, build, cobertura).

## Etapa 3 — testes e validação

Pergunta: "Que framework de teste, lint e build o projeto vai usar? Já existe configuração, ou é preciso propor uma?"

Ação: preencher a seção de testes/cobertura de `.ai-dev/quality-gates.md` (se ainda não coberta na Etapa 2) e a seção "quando a demanda afetar testes" de `.ai-dev/context-map.md`.

## Etapa 4 — referência visual (só se o projeto tiver interface)

Pergunta: "Existe protótipo, design ou referência visual (Figma, imagem, outro sistema) para essa interface? Onde está?"

Ação: se sim, preencher a seção "contexto visual e discovery" de `.ai-dev/context-map.md` com a referência, e avisar que toda TSD futura que altere interface deve seguir `.ai-dev/visual-reference-workflow.md`. Se não houver interface ou referência visual, pule esta etapa sem criar seção vazia.

## Etapa 5 — linguagem do domínio (só se necessário)

Pergunta: "Esse domínio tem termos que podem ser ambíguos, ou que já têm significado diferente em outro sistema relacionado?"

Ação: se sim, rascunhar `docs/product/glossario.md` a partir de `.ai-dev/templates/glossario.md` com os termos levantados, mostrar para o usuário. Se não, pule — não crie o arquivo até a primeira ambiguidade real aparecer durante o desenvolvimento.

## Etapa 6 — checkpoint inicial, roadmap e TSD-001

Depois que PRD e SDD estiverem confirmados:

1. Criar `docs/engineering/checkpoint.md` a partir de `.ai-dev/templates/checkpoint.md`, com estado inicial = "fundação concluída, nenhuma feature de produto implementada ainda".
2. Criar `docs/product/roadmap.md` a partir de `.ai-dev/templates/roadmap.md`: preencher a tabela de sequenciamento com todas as features da seção 7 do PRD (uma linha por RF, com uma sequência sugerida), e criar uma seção de Feature vazia (só título e ID) para cada uma. **Não preencher a User Story de nenhuma feature nesta etapa** — isso é trabalho do Agente PM, feature por feature, quando o ciclo dela começar (ver `.ai-dev/workflow.md`, seção 1.2). Mostrar o roadmap para o usuário, aguardar confirmação ou correção da sequência antes de seguir.
3. Propor a TSD-001 — a fundação técnica mínima (ex.: bootstrap do projeto, estrutura de pastas, ferramentas de lint/test configuradas, nenhuma feature de produto) — a partir de `.ai-dev/templates/technical-slice.md`. TSD-001 é sempre fundação técnica pura, nunca a primeira feature do roadmap.
4. Mostrar a TSD-001 para o usuário e aguardar aprovação explícita antes de implementar qualquer código.
5. Depois de TSD-001 implementada e fechada, a primeira feature real do roadmap entra no ciclo normal (`.ai-dev/workflow.md`, seção 1), começando pelo Agente PM.

## O que nunca fazer neste roteiro

- Nunca pular direto para implementação de código antes da Etapa 6 estar concluída e aprovada.
- Nunca assumir a resposta de uma etapa sem perguntar, mesmo que pareça óbvia — a única exceção é reaproveitar algo já confirmado em etapa anterior.
- Nunca escrever PRD, SDD, checkpoint, roadmap ou glossário como versão definitiva sem antes mostrar o rascunho para o usuário.
- Nunca prosseguir para a etapa seguinte sem confirmação explícita da etapa atual.
- Nunca escrever a User Story completa de mais de uma feature do roadmap de uma vez — é o mesmo erro, um nível acima, de escrever TSDs completas de tudo na fundação.
