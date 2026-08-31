# Papéis de agentes

Estes papéis podem ser executados por agentes separados (inclusive subagentes configurados nativamente por cada ferramenta — ver `.ai-dev/agents/`) ou por uma única LLM simulando etapas explícitas. O importante é deixar o raciocínio operacional auditável.

A partir da v2, os papéis seguem um ciclo por feature, amarrado ao roadmap (`docs/product/roadmap.md`): **PM → aprovação → Engenheiro → aprovação → Dev → Executor de Testes → Crítico → Documentador → volta pro PM**. Cada seta com "aprovação" é um ponto em que a pessoa responsável pelo projeto precisa confirmar ou corrigir o rascunho antes do próximo papel agir — nenhum desses pontos pode ser pulado ou automatizado silenciosamente.

## Agente PM

Responsável por:

- no início de cada ciclo, retomar contexto: reler `docs/product/roadmap.md`, o checkpoint e o fechamento do ciclo anterior;
- confirmar (não presumir) se a próxima feature do roadmap ainda é a certa, dado o que foi aprendido no ciclo anterior — só então prosseguir;
- elaborar a Feature e sua(s) User Story(s) a partir da linha do roadmap, usando `.ai-dev/templates/roadmap.md`;
- fazer perguntas ao usuário quando a informação necessária não estiver em nenhum documento existente;
- apresentar o rascunho e parar — não segue para o Engenheiro sem aprovação explícita.

Não toma nenhuma decisão técnica (arquivo, dado, arquitetura). Se a pergunta que precisa fazer exige uma resposta que só o usuário tem, o PM deve listar essas perguntas em aberto junto do rascunho, em vez de presumir uma resposta.

## Agente Engenheiro

Responsável por:

- transformar a Feature + User Story(s) aprovadas em uma TSD, usando `.ai-dev/templates/technical-slice.md`;
- definir escopo, fora do escopo, impacto, plano de validação, critérios de aceite e rollback;
- criar o prompt de execução para o Dev;
- apresentar a TSD e parar — não segue para o Dev sem aprovação explícita.

Não implementa código. Se decisões técnicas anteriores (SDD, TSDs passadas) não cobrirem o caso, registra isso como uma questão em aberto em vez de inventar uma decisão de arquitetura não validada.

## Agente Dev (implementador)

Responsável por:

- implementar apenas o que a TSD autoriza;
- preservar alterações locais de outros agentes/usuários;
- evitar expansão silenciosa de escopo;
- escrever os testes que a TSD exige como parte da implementação (o Dev escreve os testes; ele não é quem certifica que passam de forma confiável — ver Agente de Testes).

## Agente de Testes (executor determinístico)

Esta é a camada puramente mecânica de validação — o que ela testa é sempre o que já está definido em `.ai-dev/quality-gates.md` para este projeto, nunca um julgamento próprio sobre se a feature "ficou boa".

Responsável por:

- executar, de fato, os comandos definidos em `.ai-dev/quality-gates.md` (lint, typecheck, testes unitários/integração, cobertura, build), proporcional ao risco da mudança;
- não escrever teste novo, não decidir se o resultado é aceitável, não interpretar se a feature está correta — só rodar e reportar;
- registrar, para cada comando: o comando executado, o resultado (passou/falhou), e se falhou: o erro observado, uma hipótese, e a correção feita ou a pendência aberta;
- nunca marcar uma validação como concluída sem tê-la executado de fato — esse é o gate anti-alucinação central do método.

Ela existe separada do Dev e do Crítico de propósito: quem escreve o código tem incentivo (mesmo sem intenção) a achar que já está pronto, e quem só roda comando não tem esse incentivo — o relato dela precisa ser reproduzível a partir do output real do comando, não de uma alegação.

## Agente Crítico

Responsável por:

- revisar se a entrega atende à TSD e à User Story de origem — não só se os comandos do Agente de Testes passaram;
- detectar testes frágeis, tautológicos, ou que não cobrem os critérios de aceite reais;
- detectar acoplamento indevido ou decisões implícitas não registradas;
- conferir se documentação, checkpoint, roadmap e auditoria foram atualizados;
- aprovar o fechamento do ciclo, ou devolver para o Dev com o que falta.

O Crítico não roda os comandos de novo (isso já é do Agente de Testes) — ele julga se o que foi executado realmente prova que a feature está pronta.

## Agente Documentador

Responsável por:

- atualizar `docs/engineering/checkpoint.md`;
- atualizar `.ai-dev/audit.md`;
- atualizar `docs/product/roadmap.md` — marcar a feature como implementada e registrar o que foi aprendido (inclusive se isso muda a sequência das próximas features);
- registrar próximos passos;
- produzir relatório de sessão quando útil (`.ai-dev/templates/session-report.md`).

É este papel que fecha o ciclo e devolve o controle para o PM reabrir o próximo.

## Observação sobre subagentes

Nem toda tarefa precisa de agentes separados — para tarefas pequenas, uma única LLM pode executar os papéis em sequência, simulando cada etapa. Para quem quiser usar subagentes nativos (Claude Code, Gemini CLI ou Codex CLI), `.ai-dev/agents/` tem a definição de cada papel em prosa, tool-agnostic, e `.claude/agents/`, `.gemini/agents/` e `.codex/agents/` têm os adaptadores específicos de cada ferramenta — ver `.ai-dev/agents/README.md`.

Um ponto de atenção prático: um subagente roda de forma isolada e devolve um resultado final — ele normalmente não pausa no meio da própria execução para fazer uma pergunta à pessoa e esperar resposta. Por isso, quando o PM ou o Engenheiro têm perguntas abertas que só a pessoa responsável pode responder, o padrão é o subagente devolver o rascunho junto com a lista de perguntas em vez de travar esperando resposta; quem orquestra (a sessão principal da ferramenta) mostra as perguntas à pessoa, coleta as respostas, e invoca o mesmo subagente de novo com as respostas anexadas. A aprovação em si (o "sim, pode seguir") sempre acontece na conversa principal, nunca dentro da execução de um subagente.
