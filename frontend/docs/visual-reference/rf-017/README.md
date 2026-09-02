# Comparação visual — RF-017 (justificativa da alteração visível)

Evidência da validação visual do ciclo RF-017 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 01/09/2026, viewport 1440×900, via Chrome (playwright-core), contra
`npm run build && npx next start -p 3200` do frontend (gateway de fixtures).

| Arquivo                   | O que é                                                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rf017-justificativa.png` | `/analise/1` (filtro "Todos", aba Técnica) — requisito **divergente** ("A especificação técnica…") expandido: o bloco âmbar `StatusIaResumo` mostra Sugestão da IA / Parecer atual / **Justificativa da alteração** com o texto; a linha genérica "Comentário:" **não** aparece nesse item |

Referência: **REF-07** — `StatusIaResumo` (bloco "Sugestão da IA / Parecer atual" do RF-007),
inspecionado no RF-007 / TSD-014 §10. Esta slice **acrescenta uma linha** a esse bloco.

## Resultado da comparação (REF-07)

**Enquadramento:** ✓ Mesmo bloco âmbar do RF-007 (borda esquerda `warning`, "alterado na
revisão" em itálico). RF-017 adiciona a linha **"Justificativa da alteração: …"** logo abaixo
de "Parecer atual", amarrando o texto do comentário à divergência que ele explica.

**Comportamento (TSD-018):**

- Item com `statusFinal ≠ statusSugeridoIa` **e** `comentario` → a justificativa aparece no
  `StatusIaResumo`; a linha "Comentário:" do corpo do item **some** (para não repetir o texto).
- Item **não** divergente com `comentario` → continua com a linha "Comentário:" de hoje.
- Ação de "marcar verificado" (RF-011) recusada com `422`/`AnaliseValidacaoError` → o item
  mostra **a mensagem do backend** no `role="alert"` em vez do genérico "Não foi possível
  salvar." Esse caminho **não sai com fixtures** (elas não deixam um item divergente sem
  comentário — o RF-008 sempre grava um) → coberto por teste de unidade do `RequisitoItem`.

**Divergências intencionais** (§10): a linha "Justificativa da alteração" não existe no
protótipo (é a materialização da R-06 na tela; o protótipo tem um só status por item). Para o
item divergente o comentário aparece **uma vez** (na justificativa), não duas.

Sem gaps de enquadramento remanescentes para o escopo da slice.
