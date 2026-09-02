# Comparação visual — RF-011 (checkbox de "verificado" interativo)

Evidência da validação visual do ciclo RF-011 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 01/09/2026, viewport 1440×900, via Chrome (playwright-core), contra
`npm run build && npx next start -p 3200` do frontend (gateway de fixtures).

| Arquivo                            | O que é                                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rf011-checkboxes.png`             | `/analise/1` (filtro "Todos") — checkboxes **operáveis**: dois requisitos já verificados (check verde), dois não                                         |
| `rf011-apos-marcar.png`            | Depois de marcar "O processo contém a solicitação (CI)…": o item fica verificado e o progresso sobe de **2/6** para **3/6 verificados** — sem recarregar |
| `rf011-concluida-desabilitado.png` | `/analise/4` (status **Concluída**) — todos os checkboxes ficam **desabilitados** (a revisão está fechada); sem "Alterar parecer"                        |

Referência: **REF-05** — `ChecklistItem` do protótipo (o checkbox à esquerda do título),
já inspecionada no RF-010 / TSD-013 §10.

## Resultado da comparação (REF-05)

**Enquadramento:** ✓ O checkbox mantém a posição e o visual do RF-010 (quadrado, check branco
sobre fundo da cor da marca quando ativo). O que muda: agora ele **funciona** — clicar dispara
`PATCH /analises/:id/requisitos/:requisitoId` com `{ verificado }` e o `{ item, resumo }`
devolvido é aplicado na hora (mesmo mecanismo de `overrides`/`resumo` do RF-008). A barra de
progresso e o texto `X/Y verificados` acompanham.

**Divergências intencionais** (TSD-017 §9 / §10):

- O protótipo não faz chamada de rede — aqui há um `PATCH` real; enquanto ele corre o checkbox
  fica **`disabled`** (estado que o protótipo não tem).
- **Mensagem de erro no item** (`role="alert"`, "Não foi possível salvar. Tente de novo.") +
  reversão do checkbox ao valor anterior — acréscimo (o protótipo nunca falha). Esse caminho
  **não é fotografável com as fixtures** (elas não falham num requisito válido); está coberto
  pelos testes de unidade (`requisito-item.test.tsx`).
- Em análise `CONCLUIDA` o checkbox fica desabilitado (o protótipo não distingue).
- Sem "verificar tudo" em massa.

Com fixtures a marcação **não persiste** entre reloads (mesmo andaime do RF-001/RF-008).

Sem gaps de enquadramento remanescentes para o escopo da slice.
