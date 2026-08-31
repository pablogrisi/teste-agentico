# Workflow de desenvolvimento por IA

Este fluxo deve ser seguido por pessoas e LLMs ao evoluir {{NOME_DO_PROJETO}}.

## 0. Fundação (só na primeira vez)

Se `docs/engineering/checkpoint.md` ainda não existir, este não é um passo de retomada — é fundação do projeto. Nenhum documento existe ainda pra inferir contexto, então esta é a única etapa do método em que perguntar é obrigatório, não exceção.

Siga `.ai-dev/bootstrap.md` — o roteiro fixo de perguntas, em etapas, que leva a PRD, SDD, checkpoint inicial, roadmap inicial e TSD-001 confirmados pelo usuário. Não invente uma ordem própria de perguntas nem pule para implementação antes de todas as etapas do roteiro estarem concluídas e aprovadas.

Só depois de concluído esse roteiro, siga o fluxo normal abaixo — o ciclo por feature — para as próximas slices.

## 1. Ciclo por feature

A partir da v2, toda feature de produto (funcional, visual, que altere contrato ou comportamento observável) passa pelo mesmo ciclo de seis papéis, amarrado a `docs/product/roadmap.md`. Ver `.ai-dev/agent-roles.md` para a definição completa de cada papel; aqui está o fluxo entre eles.

```
PM ──(rascunho: Feature + User Story)──> APROVAÇÃO
                                              │
                                              ▼
Engenheiro ──(rascunho: TSD)──> APROVAÇÃO
                                              │
                                              ▼
Dev (implementa + escreve testes)
                                              │
                                              ▼
Agente de Testes (roda lint/typecheck/test/build/cobertura, reporta fato)
                                              │
                                              ▼
Crítico (julga se a entrega realmente atende TSD + User Story)
        │                                    │
        │ reprovado, volta pro Dev           │ aprovado
        └────────────────────────────────────┘
                                              ▼
Documentador (checkpoint, audit, roadmap, próximos passos)
                                              │
                                              ▼
                                   volta pro PM (próxima feature)
```

Cada "APROVAÇÃO" é um ponto de parada real — a pessoa responsável pelo projeto confirma ou corrige o rascunho antes de o próximo papel agir. Nenhum agente pula essa parada, mesmo rodando como subagente automático (ver `.ai-dev/agent-roles.md`, seção "Observação sobre subagentes", para como isso funciona na prática com subagentes que não pausam sozinhos no meio da própria execução).

### 1.1 Retomada de contexto (início de qualquer ciclo ou sessão)

- Leia `START_HERE.md`.
- Leia `.ai-dev/context-map.md`.
- Leia o checkpoint de engenharia (`docs/engineering/checkpoint.md`).
- Leia `docs/product/roadmap.md` — identifique a próxima feature não iniciada e o status da feature em andamento, se houver.
- Verifique alterações locais antes de editar arquivos.

### 1.2 PM — Feature e User Story

O Agente PM confirma (não presume) se a próxima linha do roadmap ainda é a certa, dado o que o Documentador registrou no fechamento do ciclo anterior. Elabora a Feature + User Story(s) usando `.ai-dev/templates/roadmap.md`, preenchendo a seção correspondente. Se precisar de informação que não está em nenhum documento, pergunta — nunca presume.

### 1.3 Engenheiro — TSD

Só começa depois da User Story aprovada. Usa `.ai-dev/templates/technical-slice.md` para definir objetivo, escopo, fora do escopo, impacto, plano de validação, critérios de aceite, rollback e prompt de execução.

### 1.4 Dev — construção

- Implementa apenas o escopo autorizado pela TSD.
- Não mistura feature, refatoração e testes não relacionados.
- Preserva decisões de PRD, SDD e da própria TSD.
- Usa referências visuais (protótipo, Figma) como direção de UX, não como fonte de cópia direta — ver `.ai-dev/visual-reference-workflow.md` quando a TSD alterar interface.
- Escreve os testes que a TSD exige.

### 1.5 Agente de Testes — validação mecânica

Executa os comandos e critérios definidos em `.ai-dev/quality-gates.md`, proporcionais ao risco da mudança. Se algum comando falhar, registra: comando executado; erro observado; hipótese; correção feita ou pendência aberta. Não marca uma validação como concluída sem tê-la executado de fato. Não julga se o resultado é suficiente — isso é do Crítico.

### 1.6 Crítico — revisão

Revisa se a entrega atende à TSD e à User Story de origem, não só se os comandos passaram. Se encontrar problema, devolve para o Dev com o que falta, em vez de aprovar por proximidade.

### 1.7 Documentador — fechamento

- Atualiza `docs/engineering/checkpoint.md`.
- Atualiza `.ai-dev/audit.md`.
- Atualiza `docs/product/roadmap.md` — muda o status da feature para `implementada` e registra o que foi aprendido, inclusive se isso deveria mudar a sequência das próximas features.
- Registra próximo passo recomendado.
- Gera relatório de sessão quando útil (`.ai-dev/templates/session-report.md`).

## Ajustes pequenos

Correções pequenas de documentação, links, typos ou ajustes sem impacto funcional podem ser feitas sem passar pelo ciclo completo, desde que sejam registradas quando relevantes.
