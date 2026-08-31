# Continuidade de sessão

Use este arquivo quando outra pessoa, outra sessão ou outra LLM for continuar o trabalho.

## Prompt universal

```text
Leia START_HERE.md e siga o fluxo de desenvolvimento por IA deste repositório antes de propor ou alterar código.
```

## Prompt para retomar uma tarefa em andamento

```text
Leia START_HERE.md, .ai-dev/context-map.md, docs/engineering/checkpoint.md e docs/product/roadmap.md (se existir).
Depois identifique a TSD ativa, a feature em ciclo e em que papel do ciclo (PM/Engenheiro/Dev/Agente de Testes/Crítico/Documentador) o trabalho parou, resuma o estado atual, confira alterações locais e proponha o menor próximo passo seguro.
Não altere arquivos até confirmar o escopo.
```

## O que precisa estar atualizado ao final de uma sessão

- Checkpoint de engenharia.
- `.ai-dev/audit.md`.
- `docs/product/roadmap.md`, se o status de alguma feature mudou.
- TSD ativa, se a sessão tiver alterado seu estado.
- Relatório de sessão, quando houver handoff relevante.

## Troca de LLM

Ao migrar entre Codex/GPT, Claude, Gemini ou outra LLM:

1. informe o prompt universal;
2. peça para a nova LLM resumir o estado atual antes de agir;
3. compare o resumo com o checkpoint;
4. só então peça implementação ou revisão.

## Troca de usuário

Ao passar o projeto para outro usuário:

- compartilhe a branch atual;
- indique `START_HERE.md`;
- indique o checkpoint;
- indique a TSD ativa;
- informe quais validações foram executadas e quais ficaram pendentes.

## Troca de máquina

Ao continuar o projeto em outra máquina:

- confirme os repositórios e branches corretos (registre isso no checkpoint, numa seção de mapa de repositórios, se o projeto tiver mais de um repositório);
- confirme que o clone novo está na branch de trabalho, não na branch principal;
- nunca faça push direto na branch principal ao sincronizar.
