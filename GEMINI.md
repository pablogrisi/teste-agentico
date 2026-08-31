# Gemini — LicIA Analisadora

Este arquivo é a ponte deste agente para o método comum do repositório. Ele não substitui o método completo — apenas aponta para a entrada universal.

## Antes de agir

1. Leia `START_HERE.md`.
2. Leia `.ai-dev/context-map.md`.
3. Leia `docs/engineering/checkpoint.md`, se existir.
4. Leia `docs/product/roadmap.md`, se existir, para saber qual feature está em ciclo e em que papel o ciclo está.
5. Verifique se existe TSD ativa em `docs/engineering/specs/`.
6. Siga `.ai-dev/workflow.md`.
7. Use os templates em `.ai-dev/templates/` quando precisar criar PRD, SDD, checkpoint, roadmap, specs, decisões, questões em aberto, glossário ou relatório de sessão.

## Se `docs/engineering/checkpoint.md` não existir

Não é retomada, é fundação. Siga `.ai-dev/bootstrap.md` — o roteiro fixo de perguntas que leva a PRD, SDD, checkpoint inicial, roadmap inicial e TSD-001. Não implemente nada antes de todas as etapas do roteiro estarem concluídas e aprovadas pelo usuário.

## Papéis de agente (v2)

Toda feature de produto passa por um ciclo de seis papéis — PM, Engenheiro, Dev, Agente de Testes, Crítico, Documentador —, cada um com um ponto de aprovação humana antes do próximo agir. Ver `.ai-dev/agent-roles.md` e `.ai-dev/workflow.md` para o ciclo completo. Se esta sessão suportar subagentes do Gemini CLI, as definições de cada papel estão em `.gemini/agents/*.md`, invocáveis também via `@nome-do-papel` (ver `.ai-dev/agents/README.md`).

## Conduta esperada

- Preserve alterações locais de outros usuários.
- Não implemente escopo sem confirmar contexto e spec aplicável.
- Não altere PRD/SDD/roadmap silenciosamente; registre impacto quando houver.
- Para mudanças relevantes, crie ou atualize uma TSD antes da implementação.
- Não pule o ponto de aprovação humana entre papéis do ciclo (PM → Engenheiro → Dev → Agente de Testes → Crítico → Documentador), mesmo rodando como subagente automático.
- Execute validações proporcionais ao risco e registre resultados.
- Não marque critério de aceite ou validação como concluído sem evidência real de que foi executado.
- Atualize checkpoint, auditoria e roadmap ao final de uma entrega.

## Se a sessão não carregar este arquivo automaticamente

Peça explicitamente, no início da conversa:

```text
Leia START_HERE.md e siga o fluxo de desenvolvimento por IA deste repositório antes de propor ou alterar código.
```

## Sincronia entre agentes

Este arquivo é idêntico a `AGENTS.md`, `CLAUDE.md` e `GEMINI.md`, exceto a primeira linha e a frase sobre subagentes específicos desta ferramenta. O método do projeto é independente da ferramenta — as mesmas regras valem para Codex/GPT, Claude, Gemini ou outro agente compatível. Ao editar este arquivo, edite os outros dois também.
