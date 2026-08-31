# Definições de agente — fonte única, três adaptadores

Cada arquivo nesta pasta (`pm.md`, `engenheiro.md`, `dev.md`, `executor-testes.md`, `critico.md`, `documentador.md`) é a fonte única da verdade do papel — prosa, em português, sem sintaxe de nenhuma ferramenta específica. É o que `.ai-dev/agent-roles.md` descreve de fora; aqui é o prompt de fato, escrito na segunda pessoa, pronto para virar o corpo de um subagente.

Estes arquivos **não são lidos automaticamente** por nenhuma ferramenta. Cada ferramenta agêntica exige seu próprio formato e localização de arquivo de subagente:

| Ferramenta | Onde | Formato |
|---|---|---|
| Claude Code | `.claude/agents/<papel>.md` | Markdown + frontmatter YAML |
| Gemini CLI | `.gemini/agents/<papel>.md` | Markdown + frontmatter YAML |
| Codex CLI | `.codex/agents/<papel>.toml` | TOML |

Os arquivos dentro de `.claude/agents/`, `.gemini/agents/` e `.codex/agents/` são adaptadores — cada um pega o corpo do arquivo correspondente aqui e o embrulha no formato exigido pela ferramenta. Isso é a mesma regra de sincronia que já existe entre `AGENTS.md`, `CLAUDE.md` e `GEMINI.md` (arquivos de entrada), só que um nível mais fundo: **ao editar o comportamento de um papel, edite os quatro arquivos** — o deste diretório e os três adaptadores — para não deixar as ferramentas divergindo sobre o que cada papel faz.

## Status por ferramenta (17/08/2026)

- **Claude Code**: mecanismo estável, bem documentado.
- **Gemini CLI**: mecanismo lançado em abril de 2026 — recente, mas com documentação sólida (`.gemini/agents/*.md`, sintaxe quase idêntica ao Claude Code).
- **Codex CLI**: mecanismo existe (`.codex/agents/*.toml`), mas há relatos abertos no repositório oficial (`openai/codex`, issues #15250, #14579, #26363) de agentes customizados não sendo reconhecidos de forma confiável em algumas versões. Trate o adaptador do Codex como experimental — se ele falhar silenciosamente, o fallback é rodar o papel como persona simulada na sessão principal (ver `.ai-dev/agent-roles.md`, "Observação sobre subagentes"), não como bloqueio do ciclo.

## Quem cabe bem como subagente, e quem não

Todos os seis papéis podem rodar como subagente — a aprovação humana acontece sempre na sessão principal, nunca dentro da execução isolada de um subagente (ver `.ai-dev/agent-roles.md`). Mas dois papéis (PM e Engenheiro) frequentemente precisam de informação que só a pessoa responsável tem; nesses casos, o subagente deve devolver o rascunho junto com a lista de perguntas em aberto, em vez de travar esperando resposta — quem orquestra recolhe as respostas na sessão principal e invoca o mesmo subagente de novo.
