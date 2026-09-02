# Comparação visual — RF-012 (concluir análise + modal de confirmação)

Evidência da validação visual do ciclo RF-012 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 02/09/2026, viewport 1440×900, via Chrome (playwright-core), **contra o backend
NestJS real** (PostgreSQL 17 em `:3000`, frontend buildado com
`NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` em `:3201`).

| Arquivo                        | O que é                                                                                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rf012-botao-bloqueado.png`    | Análise `PRONTA_PARA_REVISAO` com 11 obrigatórios sem verificar: botão **"Concluir análise" desabilitado** no cabeçalho + o motivo à vista ("Faltam 11 requisitos obrigatórios não verificados.")                        |
| `rf012-botao-habilitado.png`   | Após verificar o último obrigatório **pela UI** (checkbox do RF-011), o `onResumoChange` destrava o botão **sem reload** — "Concluir análise" fica verde/ativo, progresso 11/12                                          |
| `rf012-modal-confirmacao.png`  | Modal de confirmação (enquadramento do `CompletionModal` do protótipo): card central, círculo `--color-brand-muted` com o check, "Concluir análise?", texto "…fica **somente leitura**…", botões "Cancelar" / "Concluir" |
| `rf012-422-pendentes.png`      | Corrida real: o backend perdeu um obrigatório sem a tela recarregar → "Concluir" → **`422`** → o modal lista os `requisitosPendentes` do backend ("• **TEC-003** — Habilitação técnica proporcional") e continua aberto  |
| `rf012-concluida-readonly.png` | Após "Concluir" → **`200`**: badge **"Concluída"**, "Concluída em 02/09/2026, 10:34" no cabeçalho, o botão some e os checkboxes / "Alterar parecer" / editor de página ficam **read-only** (via `podeEditar`)            |

Referência: **REF-10** — `CompletionModal` do protótipo
(`Prototipo Licia Analisadora/src/routes/AnalysisPage/components/CompletionModal.{tsx,module.css}`).

## Resultado da comparação (REF-10)

**Enquadramento:** ✓ O modal reaproveita a anatomia do `CompletionModal`: overlay escuro
centralizado, card `max-width` ~440 com `padding` 32/40 e `text-align: center`, um **círculo
56×56** `--color-brand-muted` com o ícone de check `--color-brand-default`, `<h2>` de título,
`<p>` de texto e a linha de ações. O botão "Concluir análise" no cabeçalho (ao lado do
`StatusBadge`) é acréscimo desta slice.

**Divergências intencionais** (TSD-020 §9 / §10):

- **Conclusão única**, não a cadeia de modais por etapa do protótipo ("Não-conformes
  verificados!", "Checklist concluído!"). Aqui há **um** modal, no fim.
- **Botão explícito no cabeçalho** com trava pelos obrigatórios + o texto do motivo — o
  protótipo não tem um "Concluir" fixo (a conclusão é implícita ao marcar tudo).
- **Duas ações** no modal (Cancelar / Concluir), não o botão único do protótipo — é uma
  confirmação de ação irreversível.
- **Lista de `requisitosPendentes` no `422`** é acréscimo (o protótipo não falha); degrada
  para a mensagem genérica se o backend não trouxer a lista.
- Sem toast de sucesso: a troca do badge + o read-only já sinalizam (padrão das slices
  anteriores). "Baixar relatório" fica **inteiramente** para o RF-016.

**Smoke conjunto — feito contra o backend real (02/09/2026).** Backend NestJS + PostgreSQL 17
em `:3000`, frontend buildado com `NEXT_PUBLIC_API_BASE_URL` em `:3201`. Verificado ponta a
ponta numa análise criada por `POST /analises` (12 requisitos, 11 obrigatórios):

- Botão **desabilitado** enquanto `resumo.obrigatoriosPendentes > 0`; verificar 10/11 via
  `PATCH …/requisitos/:id` `{ verificado: true }` + reload → ainda desabilitado (falta 1).
- Marcar o 11º **pela UI** (checkbox RF-011) → `onResumoChange` propaga o `resumo` novo →
  botão **habilita na hora**, sem reload.
- `POST /analises/:id/concluir` numa corrida (backend com 1 obrigatório a menos, tela não
  recarregada) → **`422`** com `{ requisitosPendentes: [{ requisitoId, codigo, titulo, area }] }`
  → o modal lista "TEC-003 — Habilitação técnica proporcional" e permanece aberto; a análise
  segue `PRONTA_PARA_REVISAO`.
- Re-verificado o 11º → "Concluir" → **`200`** com o `AnaliseDetalhe` `CONCLUIDA` → a tela
  troca para `CONCLUIDA` **sem reload**: badge, "Concluída em" e tudo read-only. Confirmado no
  backend: `status = CONCLUIDA`, `concluidaEm` gravado.
- Preflight CORS `OPTIONS` → `204` (habilitado no backend, `35ee46d`).

Sem mudança de contrato. Sem gaps de enquadramento remanescentes para o escopo da slice.
