# Roadmap - <nome do produto>

---
title: Roadmap - <nome do produto>
type: roadmap
status: living
created: <data> // <autor>
updated: <data> // <autor>
related (internal files):
- docs/product/prd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md (ou equivalente do projeto)
---

Este arquivo combina duas coisas de propósito, e a diferença entre elas é a regra mais importante do arquivo:

- **A tabela abaixo** é o roadmap leve — sequência e status de todas as features do PRD. É gerada de uma vez, ao final da Etapa 6 do bootstrap, e reordenada sempre que o Agente PM reabrir um ciclo e confirmar (ou corrigir) a sequência.
- **As seções de Feature**, abaixo da tabela, começam vazias (só o título e o ID). Cada uma só é preenchida com a User Story completa quando chega a vez daquela feature — nunca antes. Preencher a seção de uma feature futura antes da hora é o mesmo erro que motivou este método a não escrever TSDs completas de tudo na fundação: decisão detalhada demais, cedo demais, com alta chance de precisar ser refeita.

## Tabela de sequenciamento

| Sequência | ID | Feature | Prioridade | Status |
|---|---|---|---|---|
| 1 | RF-XXX | | Must/Should/Could | não iniciada / user story em aprovação / TSD em aprovação / em construção / em validação / implementada |

Status possíveis, nessa ordem de progresso dentro de um ciclo: `não iniciada` → `user story em aprovação` → `user story aprovada` → `TSD em aprovação` → `TSD aprovada` → `em construção` → `em validação` → `implementada`.

## Seções de Feature

Uma seção por linha da tabela acima. Preenchida pelo Agente PM quando a feature entra em ciclo; nunca antes.

### RF-XXX — <título da feature>

**Status:** não iniciada

<!-- Quando o Agente PM abrir o ciclo desta feature, preencher abaixo e mudar o status acima. -->

<!--
**User Story**

Como <persona>, quero <ação>, para <benefício>.

**Critérios de aceite**

-

**Perguntas em aberto (se houver)**

-

**TSD associada:** docs/engineering/specs/<NNN>-<slug>.tsd.md (preenchido pelo Agente Engenheiro, depois de aprovação da User Story)
-->
