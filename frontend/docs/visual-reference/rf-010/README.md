# Comparação visual — RF-010 (tela de análise: abas Checklist/Técnica)

Evidência da validação visual do ciclo RF-010 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 01/09/2026, viewport 1440×900, via Chrome (playwright-core), contra
`npm run build && npm run start` do frontend e `npm run dev` do protótipo.

| Arquivo                | O que é                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `checklist.png`        | `/analise/1` — aba Checklist, com um item expandido (descrição + norma + comentário + página) |
| `tecnica.png`          | Aba Técnica (navegação livre) — itens com badge de `statusFinal` (fiel ao backend)            |
| `processando.png`      | `/analise/2` (PROCESSANDO) — mensagem de processamento + polling ativo, sem lista/progresso   |
| `nao-encontrada.png`   | `/analise/zzz` — `not-found.tsx` ("Análise não encontrada" + voltar)                          |
| `prototipo-painel.png` | Referência REF-06 (`AnalysisPanel` do protótipo, rota `/analise/1`)                           |

## Resultado da comparação (REF-06 / REF-07)

**Enquadramento:** ✓ igual — painel de revisão 596px à direita (cantos esquerdos arredondados,
sem borda direita), barra de abas 44px com a ativa sublinhada na cor de marca, barra de
progresso ("X/Y verificados"), grupos por área (rótulo em maiúsculas + badge de contagem) e
itens em acordeão com faixa de accent à esquerda pela cor do status, checkbox, título e
chevron que rotaciona.

**Divergências intencionais** (TSD-013 §10.2):

- **Aba Técnica com badge de `statusFinal`** (protótipo: "observações" neutras sem status) —
  decisão validada; o backend entrega status para todo requisito.
- **Sem os chips de filtro** ("Não-conforme / Conforme / Não se aplica / Todos") → **RF-009**.
- **Checkbox desabilitado** (placeholder visual) → interativo no **RF-011**.
- **Sem "Alterar parecer"** no detalhe → **RF-008**; **sem "Ver p." clicável** ("Página N" é
  texto) → **RF-014**.
- Status renderizado como **badge pílula** (fundo colorido) em vez do texto colorido do
  protótipo — consistente com o `StatusBadge` da listagem.
- **Cabeçalho da análise** (NUP, objeto, status, responsável, datas) numa barra própria **acima**
  dos dois painéis; no protótipo o NUP fica no header do painel de PDF (que aqui é placeholder).
- Abas **Legislação / Outros** aparecem desabilitadas (indisponíveis no MVP — glossário).
- Badge das abas = **total de itens da aba** (protótipo: nº de não-conformes no Checklist);
  priorização de não conformes é **RF-009**.
- Progresso = `resumo.verificados / resumo.total` (global) para as duas abas.

Sem gaps de enquadramento remanescentes para o escopo da slice.
