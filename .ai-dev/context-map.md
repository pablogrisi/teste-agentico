# Mapa de contexto obrigatório

Este arquivo define o caminho de leitura antes de qualquer mudança relevante em {{NOME_DO_PROJETO}}. A estrutura abaixo já vem pronta; preencha o conteúdo específico do projeto onde houver `<preencher>`.

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

Leia também:

- a TSD ativa em `docs/engineering/specs/`, se existir;
- a TSD-001, quando precisar entender a fundação já entregue;
- os arquivos de configuração/manifesto do projeto (ex.: `package.json`, `pyproject.toml`), para comandos e scripts disponíveis.

## Quando a demanda afetar testes

<preencher com os arquivos de configuração de teste do projeto (ex.: `vitest.config.ts`, `pytest.ini`) e eventuais docs de estratégia de testes>

## Contexto visual e discovery

<preencher, se o projeto tiver protótipo visual, Figma ou documento de discovery de produto — indicar onde estão e como devem ser usados como referência, nunca como fonte de cópia direta de código>

Se houver referência visual formal, leia também `.ai-dev/visual-reference-workflow.md` antes de qualquer TSD que altere interface — ele define o fluxo obrigatório de inspeção, preenchimento da seção "Referências visuais" da TSD, e comparação por screenshot.

## Linguagem do domínio

Se o projeto tiver termos ambíguos ou compartilhados com outros sistemas da suíte, use `docs/product/glossario.md` como referência de nomenclatura antes de nomear entidades, campos ou eventos novos.

## Fonte de verdade do estado atual

O checkpoint de engenharia é a fonte de verdade do estado atual. Se houver divergência entre lembrança da sessão e checkpoint, atualize a investigação pelo checkpoint.
