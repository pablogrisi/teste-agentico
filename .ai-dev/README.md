# Método Agêntico v2 — Base reutilizável para desenvolvimento assistido por IA

Este pacote é a camada de **processo** de um método de desenvolvimento assistido por IA, pensado para ser aplicado em qualquer projeto novo, de qualquer stack, por qualquer equipe.

Ele não contém nenhuma decisão de produto ou arquitetura — só o processo, os papéis, os critérios de qualidade e os templates que cada projeto novo precisa preencher com conteúdo próprio.

## O que mudou nesta v2 (versão de teste, ainda não validada num projeto real)

A v1 tratava toda demanda como um evento isolado — alguém pede, a IA especifica (TSD) e implementa, uma de cada vez, sem visão explícita do conjunto de features previstas. A v2 acrescenta duas coisas por cima disso, sem remover nenhuma proteção que já existia:

1. **Roadmap** (`docs/product/roadmap.md`, `.ai-dev/templates/roadmap.md`) — uma tabela leve com todas as features do PRD, em sequência sugerida e com status, criada de uma vez na fundação. Isto por si só não é uma TSD nem uma User Story — é só ordem e status, o que minimiza o risco de ficar tecnicamente errado antes da hora (ver `docs/engineering/decisions/004-*` do projeto que originou este método, para o exemplo real do problema que isso evita).
2. **Features com User Stories, uma de cada vez** — cada feature do roadmap só ganha sua User Story completa quando entra em ciclo, nunca antes. Isso é trabalho do novo papel de **Agente PM**.
3. **Seis papéis de agente encadeados por feature**, cada um com aprovação humana explícita entre si: **PM → Engenheiro → Dev → Agente de Testes → Crítico → Documentador**, descritos em `.ai-dev/agent-roles.md` e `.ai-dev/workflow.md`. PM e Engenheiro substituem os antigos "Agente de contexto" e "Agente de especificação" da v1, agora separando explicitamente a camada de produto (User Story, sem decisão técnica) da camada técnica (TSD).
4. **Definições de subagente para as três ferramentas** — `.ai-dev/agents/` tem a fonte única de cada papel (prosa, tool-agnostic); `.claude/agents/`, `.gemini/agents/` e `.codex/agents/` têm os adaptadores no formato exigido por Claude Code, Gemini CLI e Codex CLI respectivamente. Ver `.ai-dev/agents/README.md` para o status de maturidade de cada ferramenta (Codex CLI é tratado como experimental nesta data).

Tudo o que já existia na v1 continua valendo: o gate anti-alucinação, o rollback obrigatório em toda TSD, o workflow de referência visual, a regra de sincronia entre arquivos de entrada. A v2 é aditiva, não uma reescrita.

## O que está aqui

**Arquivos de entrada** (`START_HERE.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) — genéricos, prontos pra copiar. Só precisam do nome do projeto preenchido. São a ponte que faz Claude Code, Codex e Gemini CLI carregarem o método automaticamente ao abrir o repositório (cada ferramenta lê o arquivo com seu próprio nome de convenção — `CLAUDE.md`, `AGENTS.md` ou `GEMINI.md` — sem precisar de comando).

**`.ai-dev/`** — o processo em si:

- `workflow.md` — o ciclo de trabalho (fundação → ciclo por feature: PM → Engenheiro → Dev → Agente de Testes → Crítico → Documentador).
- `agent-roles.md` — os seis papéis, o que cada um faz e nunca faz, e como a aprovação humana se encaixa entre eles.
- `agents/` — a definição de cada papel em prosa, pronta para virar o corpo de um subagente em qualquer ferramenta; `agents/README.md` explica a relação com os adaptadores por ferramenta.
- `quality-gates.md` — critérios mínimos de "pronto", com espaço pra preencher os comandos reais do stack escolhido. É o que o Agente de Testes executa.
- `context-map.md` — roteiro de qual documento ler pra qual tipo de demanda, incluindo o roadmap e os papéis de agente.
- `session-continuity.md` — prompts prontos pra retomada, troca de LLM, troca de usuário, troca de máquina.
- `audit.md` — trilha de auditoria cronológica, separada do estado resumido do checkpoint (começa vazio).
- `bootstrap.md` — o roteiro de perguntas que a IA segue pra fundar um projeto novo, incluindo a criação do roadmap inicial.
- `visual-reference-workflow.md` — fluxo obrigatório para TSDs que alteram interface visível, quando o projeto tiver uma referência visual formal (Figma, protótipo, etc.). Opcional — só entra em jogo se o projeto tiver esse tipo de referência.
- `templates/` — um template pra cada documento que o método exige: roadmap, TSD, decisão técnica, relatório de sessão, PRD, SDD, checkpoint, questões em aberto, glossário.

**`.claude/agents/`, `.gemini/agents/`, `.codex/agents/`** — os seis papéis, adaptados para os subagentes nativos de cada ferramenta.

## O que NÃO está aqui

PRD, SDD, checkpoint preenchido, roadmap preenchido, TSDs, decisões e glossário reais — esses são específicos de cada produto e precisam ser escritos do zero por cada equipe, usando os templates em `.ai-dev/templates/`. Não existe um jeito de generalizar o *conteúdo* de um PRD; só a *estrutura* dele.

## Como usar em um projeto novo

1. Copie esta pasta inteira pra raiz do repositório novo.
2. Abra o repositório com Claude Code, Codex ou Gemini CLI e diga algo como "vamos começar este projeto novo".
3. A partir daí, quem preenche os documentos é a IA, não a pessoa — ela segue `.ai-dev/bootstrap.md`, um roteiro fixo de perguntas em etapas (nome do projeto, produto, arquitetura/stack, testes, referência visual, linguagem do domínio). A pessoa só responde e aprova ou corrige cada rascunho antes da IA seguir pra próxima etapa.
4. Ao final do roteiro, PRD, SDD, checkpoint inicial, roadmap inicial, `quality-gates.md`/`context-map.md` preenchidos e a TSD-001 já existem, todos aprovados. Só então a implementação de código começa.
5. Depois de TSD-001, cada feature real do roadmap entra no ciclo de seis papéis — ver `.ai-dev/workflow.md`, seção "Ciclo por feature".

Isso não depende de a pessoa saber, de antemão, o que precisa preencher: `docs/engineering/checkpoint.md` não existindo é, por si só, o sinal de que o projeto está em fundação — os arquivos de entrada, o `workflow.md` e o `bootstrap.md` já tratam esse caso de forma explícita, sem precisar de instrução adicional além de pedir pra começar.

## Como usar num projeto que já está em andamento

Copie `docs/product/roadmap.md` a partir de `.ai-dev/templates/roadmap.md` e preencha a tabela de sequenciamento com as features restantes do PRD já existente (ou, na ausência de PRD formal, com o backlog atual). Não preencha a User Story de nenhuma feature ainda — isso é do Agente PM, uma de cada vez, quando o ciclo dela abrir.

## Convenção de caminhos

Os caminhos citados nos arquivos deste pacote (`docs/product/prd.md`, `docs/product/roadmap.md`, `docs/architecture/sdd.md`, `docs/engineering/checkpoint.md`, `docs/engineering/specs/`, `docs/engineering/decisions/`) são fixos, não um exemplo. A pasta `docs/` já vem criada no pacote, com um `README.md` em cada subpasta explicando o que vai ali — copie a estrutura junto, não só os arquivos de processo.

Isso é proposital: se cada projeto pudesse nomear essa estrutura do seu jeito, os arquivos abaixo que citam esses caminhos teriam que ser editados um por um, por projeto — o mesmo risco de divergência que a regra de sincronia entre `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` já resolve para os arquivos de entrada. Manter fixo custa zero edição.

Se um projeto tiver um motivo real pra usar outra estrutura (ex.: convenção de monorepo já estabelecida), os arquivos que citam esses caminhos e precisariam ser ajustados, todos juntos, são:

- `START_HERE.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`
- `.ai-dev/workflow.md`, `.ai-dev/context-map.md`, `.ai-dev/quality-gates.md`, `.ai-dev/session-continuity.md`, `.ai-dev/bootstrap.md`, `.ai-dev/agent-roles.md`
- `.ai-dev/templates/technical-slice.md`, `.ai-dev/templates/prd.md`, `.ai-dev/templates/sdd.md`, `.ai-dev/templates/roadmap.md`
- `.ai-dev/agents/*.md`, `.claude/agents/*.md`, `.gemini/agents/*.md`, `.codex/agents/*.toml`

## Regra de sincronia

`AGENTS.md`, `CLAUDE.md` e `GEMINI.md` devem ser mantidos idênticos entre si, exceto a primeira linha (o título) e a frase sobre onde ficam os subagentes daquela ferramenta. Ao editar um, edite os outros dois.

O mesmo vale, um nível mais fundo, para cada papel de agente: `.ai-dev/agents/<papel>.md` é a fonte única, e `.claude/agents/<papel>.md`, `.gemini/agents/<papel>.md`, `.codex/agents/<papel>.toml` são os adaptadores — ao mudar o comportamento de um papel, edite os quatro arquivos juntos (ver `.ai-dev/agents/README.md`).

Isso não é redundância — é o que garante que Codex, Claude e Gemini recebam exatamente a mesma instrução ao abrir o mesmo projeto, e que os três joguem o mesmo jogo quando rodando como subagentes.
