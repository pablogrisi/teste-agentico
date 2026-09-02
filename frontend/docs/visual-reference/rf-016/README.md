# Comparação visual — RF-016 (baixar o relatório PDF da análise concluída)

Evidência da validação visual do ciclo RF-016 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 02/09/2026, viewport 1440×900, via Chrome (playwright-core).

| Arquivo                      | O que é                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rf016-botao-concluida.png`  | Análise `CONCLUIDA` (contra o **backend real**): o cabeçalho mostra o botão verde **"Baixar relatório"** ao lado do badge "Concluída" (mesmo slot do "Concluir análise" do RF-012, que aqui não aparece)                      |
| `rf016-relatorio-aberto.png` | Clicar no botão abre `GET /analises/:id/relatorio` **numa nova aba** — o visor nativo do browser renderiza o PDF ("Relatório de Análise de Conformidade": NUP, objeto, responsável, datas, resumo, requisitos por área/norma) |
| `rf016-sem-backend.png`      | Sem `NEXT_PUBLIC_API_BASE_URL` (fixtures): o botão "Baixar relatório" fica **desabilitado** (cinza) + o aviso "Disponível com a tela conectada ao backend." — mesmo tratamento do visor de PDF sem backend (RF-014)           |

Referência: **REF-11** — sem origem no protótipo (a tela do protótipo termina no checklist).
O botão reaproveita o vocabulário visual do botão "Concluir análise" do RF-012 (REF-10):
retângulo `--color-brand-default` / texto `--color-text-inverse` / `radius-8` / `hover`
`--color-brand-hover`; desabilitado em `--color-icon-disabled` + aviso `--color-text-secondary`.

## Resultado da comparação (REF-11)

**Enquadramento:** ✓ Consistente com o RF-012 — um único ponto de ação no cabeçalho, ao lado
do `StatusBadge`. A troca "Concluir análise" → "Baixar relatório" acontece na hora ao concluir
(o `TelaAnalise` já segura o `detalheEfetivo` do RF-012).

**Divergências intencionais** (TSD-021 §9 / §10):

- Afordância **inexistente no protótipo** — acréscimo desta slice, como o "Concluir análise"
  do RF-012.
- **Abre em nova aba** (`<a target="_blank" rel="noopener noreferrer">`), **não** força um
  "download" (blob + `<a download>`). O backend entrega `Content-Disposition: inline` de
  propósito (decisão do ciclo backend — abre no visor, o usuário salva de lá), igual ao
  `GET /analises/:id/pdf` do RF-014.
- **Sem backend → botão desabilitado + aviso** (não escondido): o usuário vê que a função
  existe e por que não está disponível. As fixtures não têm relatório real.
- **`urlRelatorio` no gateway** (não `fetch`): composição de URL no data layer, ao lado do
  `urlPdf` do RF-014 — nenhum componente monta `${base}/analises/...`.

**Smoke conjunto — feito contra o backend real (02/09/2026).** Backend NestJS + PostgreSQL 17
em `:3000`, frontend buildado com `NEXT_PUBLIC_API_BASE_URL` em `:3201`. Verificado:

- Análise `CONCLUIDA` → o cabeçalho mostra "Baixar relatório" (`href =
http://localhost:3000/analises/<id>/relatorio`, `target="_blank"`, `rel` com `noopener`); a
  análise `PRONTA_PARA_REVISAO` mostra "Concluir análise" e **não** "Baixar relatório".
- Clicar abre uma nova aba em `GET /analises/:id/relatorio` → `200`,
  `Content-Type: application/pdf`, `Content-Disposition: inline; filename="relatorio-analise-<id>.pdf"`,
  corpo `%PDF-` — o visor nativo renderiza o relatório.
- `GET /analises/:id/relatorio` numa análise não `CONCLUIDA` → `409` (confirmado direto na
  API; a UI nem oferece o botão nesse estado).

Sem mudança de contrato. Sem gaps de enquadramento remanescentes para o escopo da slice.

---

**Marco:** com RF-016 o **MVP frontend está completo** — `/` (listagem + "Nova análise") e
`/analise/[id]` (visor de PDF, revisão de requisitos, alterar parecer, verificado, referência
de página, concluir, baixar relatório) cobrem todos os RFs de frontend do roadmap.
