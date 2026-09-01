# Comparação visual — RF-007 (status sugerido pela IA)

Evidência da validação visual do ciclo RF-007 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 01/09/2026, viewport 1440×900, via Chrome (playwright-core), contra
`npm run build && npm run start` do frontend.

| Arquivo                      | O que é                                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `parecer-igual-sugestao.png` | `/analise/1` (Checklist) — item expandido; parecer atual = sugestão da IA → marca "IA" no recolhido + linha "Sugestão da IA" no detalhe; legenda da lista visível                                                                                                        |
| `parecer-diverge-da-ia.png`  | Aba Técnica — item com `statusSugeridoIa = NAO_CONFORME` e `statusFinal = CONFORME` (fixture forjada — só ocorre de verdade com RF-008): chip "IA: Não conforme" no recolhido, realce âmbar no item, e "Sugestão da IA / Parecer atual — alterado na revisão" no detalhe |
| `prototipo-painel.png`       | Referência REF-07 (`AnalysisPanel`/`ChecklistItem` do protótipo)                                                                                                                                                                                                         |

## Resultado da comparação (REF-07)

**Enquadramento:** ✓ o item mantém o layout do RF-010 (accent à esquerda pela cor do
`statusFinal`, checkbox, título, badge, chevron). RF-007 **adiciona** a informação da
sugestão da IA — o protótipo mostra **um só** status por item e não distingue sugestão da
IA de parecer do analista.

**Adições / divergências intencionais** (TSD-014 §10):

- **Marca "IA"** discreta antes do badge quando `statusFinal === statusSugeridoIa` (situação
  atual, antes de qualquer edição — RF-008).
- **Chip "IA: <sugestão>"** (âmbar) + **realce âmbar** no item quando o parecer diverge da
  sugestão.
- **Detalhe:** bloco "Sugestão da IA: X" (sempre) e "Parecer atual: Y — alterado na revisão"
  (só quando diverge).
- **Legenda** no topo da lista: "os status abaixo são sugestões da IA…". Some no estado
  processando/erro.
- Alinhado ao PRD RF-007 ("status inicial sugerido pela IA") e ao glossário ("status
  **sugerido pela IA**" vs "status **final**").

Sem gaps de enquadramento remanescentes para o escopo da slice.
