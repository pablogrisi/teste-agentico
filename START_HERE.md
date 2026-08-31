# Comece aqui — desenvolvimento por IA de {{NOME_DO_PROJETO}}

Este arquivo é a entrada universal do projeto para pessoas e LLMs. Use-o quando estiver começando uma nova sessão no Codex/GPT, Claude, Gemini ou qualquer outra ferramenta.

## Prompt padrão de retomada

Se a ferramenta não carregar automaticamente as instruções do repositório, comece a conversa com:

```text
Leia START_HERE.md e siga o fluxo de desenvolvimento por IA deste repositório antes de propor ou alterar código.
```

## O que este repositório está tentando garantir

{{NOME_DO_PROJETO}} deve evoluir com contexto preservado, decisões rastreáveis e validações repetíveis. O objetivo não é apenas acelerar código com IA, mas criar uma prática de engenharia que possa ser continuada por outras pessoas e outras LLMs.

Antes de implementar qualquer mudança relevante:

1. leia o mapa de contexto em `.ai-dev/context-map.md`;
2. leia o checkpoint atual em `docs/engineering/checkpoint.md`;
3. leia `docs/product/roadmap.md` para saber qual feature está em ciclo e em que papel (PM/Engenheiro/Dev/Agente de Testes/Crítico/Documentador) o ciclo está;
4. identifique se existe uma TSD ativa em `docs/engineering/specs/`;
5. confirme se a demanda afeta produto, arquitetura, implementação, documentação, testes ou processo;
6. siga o fluxo de `.ai-dev/workflow.md`.

## Se este é o primeiro dia do projeto

Se `docs/engineering/checkpoint.md` ainda não existir, isto não é uma retomada — é fundação. Não implemente nada antes de seguir `.ai-dev/bootstrap.md`, o roteiro de perguntas que leva a PRD, SDD, checkpoint inicial, roadmap inicial e TSD-001. É quem pede o projeto que responde; é a IA que pergunta, rascunha os documentos e só implementa depois de cada etapa aprovada.

## Papéis de agente (v2)

Toda feature de produto passa por um ciclo de seis papéis — PM, Engenheiro, Dev, Agente de Testes, Crítico, Documentador — descrito em `.ai-dev/agent-roles.md` e `.ai-dev/workflow.md`. Se a ferramenta que você está usando suportar subagentes nativos (Claude Code, Gemini CLI, Codex CLI), as definições prontas para cada uma estão em `.claude/agents/`, `.gemini/agents/` e `.codex/agents/` — ver `.ai-dev/agents/README.md`. Se não, simule os papéis em sequência dentro da mesma conversa, respeitando os pontos de aprovação humana entre eles.

## Fontes de verdade

- Produto: `docs/product/prd.md`
- Roadmap e features em ciclo: `docs/product/roadmap.md`
- Arquitetura: `docs/architecture/sdd.md`
- Estado atual: `docs/engineering/checkpoint.md`
- Specs técnicas: `docs/engineering/specs/`
- Decisões pontuais: `docs/engineering/decisions/`
- Questões em aberto: `docs/product/questoes-abertas.md`
- Linguagem do domínio: `docs/product/glossario.md` (se existir)
- Método de desenvolvimento por IA: `.ai-dev/`
- Papéis de agente e subagentes: `.ai-dev/agent-roles.md`, `.ai-dev/agents/`

## Regras rápidas

- Não comece codando antes de entender o contexto e a spec ativa.
- Mudanças funcionais, visuais, arquiteturais ou estruturais devem ter TSD.
- Referência visual (protótipo, Figma) é referência de UX, não fonte de cópia direta.
- Registre validações, decisões e próximos passos.
- Não marque um critério de aceite ou validação como concluído sem tê-lo executado de fato.
- Ao encerrar uma sessão, deixe o projeto retomável por outra pessoa ou LLM.
