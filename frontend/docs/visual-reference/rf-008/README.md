# Comparação visual — RF-008 (modal "Alterar parecer")

Evidência da validação visual do ciclo RF-008 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 01/09/2026, viewport 1440×900, via Chrome (playwright-core), contra
`npm run build && npx next start -p 3200` do frontend (gateway de fixtures).

| Arquivo                   | O que é                                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rf008-modal.png`         | `/analise/1` — modal aberto a partir do 1º requisito: bloco "Parecer atual" (só leitura, requisito + badge) e "Novo parecer" (select + comentário); "Confirmar" desabilitado                                                 |
| `rf008-modal-diverge.png` | Parecer "Conforme" selecionado — diverge da sugestão da IA ("Não conforme"): dica "A IA sugeriu **Não conforme**; explique a mudança…"; "Confirmar" segue desabilitado sem comentário                                        |
| `rf008-apos-alterar.png`  | Depois de confirmar (comentário preenchido) e voltar ao filtro "Todos": o requisito aparece **verificado**, badge **Conforme**, chip âmbar **IA: Não conforme** (RF-007) e o progresso subiu de 2/6 para **3/6 verificados** |

Referência: **REF-08** — `ChangeOpinionModal` do protótipo
(`Prototipo Licia Analisadora/src/routes/AnalysisPage/components/ChangeOpinionModal.{tsx,module.css}`).

## Resultado da comparação (REF-08)

**Enquadramento:** ✓ Mesmo esqueleto do protótipo — overlay escuro central, card com header
("Alterar parecer" + X), corpo com as duas seções ("Parecer atual" read-only + "Novo parecer"
com select `Parecer *` e textarea `Comentário *`), footer "Cancelar" / "Confirmar" (primário,
desabilitado até válido). O select de parecer **exclui o status atual** (idem protótipo).

**Divergências intencionais** (TSD-016 §9 / §10 — decisões da slice):

- **Sem o campo "Página no documento"** e sem os modos "uma página / intervalo" — isso é RF-014.
- **Sem `Toast` de sucesso** — o fechamento do modal + a lista/progresso mexendo já sinalizam
  (um toast pode entrar com o RF-012).
- **Comentário sempre obrigatório** neste modal (não só quando diverge da IA); a mensagem/dica
  fica específica quando o novo parecer difere da sugestão — **acréscimo** que liga a regra R-06
  (backend) ao RF-007, não existe no protótipo.
- Badge do "parecer atual" usa o `StatusBadgeRequisito` do projeto (3 status; sem
  "warning"/"com ressalva").
- **Aplicação imediata sem reload** via estado de sessão (`overrides` no `PainelRevisao`): o
  `PATCH` devolve `{ item, resumo }` e a tela reavalia lista, badges de IA, filtros (RF-009) e
  progresso. Um refetch por troca de filtro **não** descarta o override (só trocar de análise
  zera). Com fixtures a alteração **não persiste** entre reloads (andaime — igual a "criar
  análise" no RF-001).

**Ponto de atenção:** como "Confirmar" fica desabilitado enquanto o formulário é inválido, não
há mensagens de erro inline por campo (o botão desabilitado é o sinal, como no protótipo); os
erros do backend (`422`/`409`/`404`) aparecem como faixa no topo do modal.

Sem gaps de enquadramento remanescentes para o escopo da slice.
