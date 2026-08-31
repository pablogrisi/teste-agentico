# TSD — <nome da slice>

---
title: TSD - <nome da slice>
type: tsd
status: draft
created: <data> // <autor>
updated: <data> // <autor>
related:
- docs/product/prd.md
- docs/architecture/sdd.md
---

## 1. Resumo

Explique em poucas linhas o que esta slice entrega e por que ela existe.

**User Story de origem:** `docs/product/roadmap.md`, feature <ID> (preencher apenas quando esta TSD vier do ciclo de uma feature de produto — TSD-001 de fundação não tem User Story de origem).

## 2. Objetivo técnico

Descreva o resultado técnico esperado.

## 3. Escopo

### Incluído

- 

### Fora do escopo

- 

## 4. Contexto consultado

- `START_HERE.md`
- `.ai-dev/context-map.md`
- `docs/engineering/checkpoint.md`

Adicione PRD, SDD, protótipo/referência visual ou outros documentos conforme aplicável.

## 5. Impacto esperado

Descreva impacto em produto, arquitetura, implementação, testes, documentação e operação.

## 6. Plano de implementação

1. 
2. 
3. 

## 7. Validação

### 7.1 Estratégia de testes

Preencha quais tipos de teste esta slice exige, e por quê — ver `.ai-dev/quality-gates.md` para o que cada tipo significa neste projeto e os comandos reais. Não marque um tipo como "não se aplica" sem justificar; o Agente Crítico usa esta tabela como régua para aprovar ou devolver a entrega.

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário (lógica isolada, dependências mockadas) | | |
| Integração (módulos/camadas reais conversando entre si, ex.: contra um banco de teste) | | |
| Contrato (formato de entrada/saída entre serviços que não sobem juntos no mesmo teste) | | |
| Smoke/validação manual contra dependência externa real (custosa, instável, ou que mock não substitui com confiança) | | |

Se algum tipo aplicável não puder ser escrito nesta slice (ex.: falta de ambiente), registre isso como pendência em aberto na seção 9, não como "não se aplica".

### 7.2 Comandos previstos

Comandos previstos (ver `.ai-dev/quality-gates.md` para os comandos reais do projeto):

```text
<lint>
<typecheck>
<test>
<build>
```

Adapte conforme o escopo e a estratégia de testes definida em 7.1.

## 8. Critérios de aceite

- 

## 9. Riscos e decisões abertas

- 

## 10. Referências visuais (preencher apenas se esta slice alterar interface visível)

Se o projeto tiver uma referência visual formal (ver `.ai-dev/visual-reference-workflow.md`), preencha por elemento de referência:

| ID | Papel na aplicação | Link/localização | Nome na ferramenta de origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| | | | | | Pendente / Inspecionado |

Screenshots obrigatórios: <preencher>

Gaps conhecidos entre implementação atual e referência: <preencher>

Esta TSD não deve ser ativada nem implementada enquanto esta seção estiver com campos pendentes, se ela alterar interface visível.

## 11. Rollback

Descreva como reverter esta slice caso seja necessário — o que remover, isolar ou desativar sem quebrar o que já estava funcionando antes dela.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD e o checkpoint de engenharia.
Implemente apenas o escopo desta TSD. Não expanda escopo silenciosamente.
Execute as validações previstas e registre o resultado real de cada uma.
Marque um critério de aceite ou validação como concluído somente quando houver evidência real de que foi cumprido — não marque itens não executados.
Atualize checkpoint e auditoria ao final, incluindo pendências e próximo passo recomendado.
```
