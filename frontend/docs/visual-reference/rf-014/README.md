# Comparação visual — RF-014 (visor de PDF + referência de página)

Evidência da validação visual do ciclo RF-014 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 01–02/09/2026, viewport 1440×900, via Chrome (playwright-core).

| Arquivo                         | O que é                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rf014-visor-sem-backend.png`   | `/analise/1` **sem** `NEXT_PUBLIC_API_BASE_URL` (fixtures): no lugar do visor, um aviso "O visor abre o PDF do processo quando a tela está conectada ao backend" + "24 páginas no documento"                                                                                                                                                    |
| `rf014-referencia-clicavel.png` | Requisito expandido — "Referência de página: **Página N**" como link (leva ao visor) + botão "Editar"                                                                                                                                                                                                                                           |
| `rf014-editor-pagina.png`       | Editor inline de página aberto: campo numérico + "Salvar" / "Cancelar"                                                                                                                                                                                                                                                                          |
| `rf014-smoke-page2.png`         | **Smoke conjunto**: frontend buildado com `NEXT_PUBLIC_API_BASE_URL` apontando para um backend stub (que fala o contrato do Pablo, com um PDF real de 3 páginas). O `<iframe>` carrega o PDF via `GET /analises/:id/pdf`; clicar em "Página 2" no requisito navegou o visor para `#page=2` (URL do iframe: `…/analises/1/pdf#page=2&view=FitH`) |

Referência: **REF-09** — `PdfPanel` do protótipo (painel esquerdo + toolbar ‹ [nº] / total ›).

## Resultado da comparação (REF-09)

**Enquadramento:** ✓ Mesma anatomia do protótipo — painel esquerdo `flex:1` com fundo de
visor, uma toolbar `flex-shrink:0` no topo (nome do documento à esquerda, ‹ [campo] de total ›
à direita) e a área do documento abaixo. A área desenhada à mão do protótipo (documento
falso + alerta sintético) é substituída pelo **`<iframe>` do PDF real** navegado por `#page=N`.

**Divergências intencionais** (TSD-019 §9 / §10):

- Visor **nativo do browser via `<iframe>`**, não `pdf.js` — a decisão do ciclo (`#page=N`
  contra o PDF inteiro; nada de extração no servidor). O leitor nativo traz sua própria barra
  (thumbnails, zoom, download) além da toolbar do app.
- **Sem backend real** o visor não mostra documento — só um aviso + o total de páginas (as
  fixtures não têm PDF; forjar um enganaria). A referência clicável e o editor de página
  funcionam mesmo assim.
- **Editor de página inline no requisito**, não numa toolbar global nem no modal "Alterar
  parecer" (o RF-008 adiou o campo do protótipo para cá; inline permite corrigir a página sem
  mexer no parecer — o `PATCH { paginaReferencia }` não dispara a R-06).
- O NUP/objeto e o "voltar" ficam no `AnaliseHeader` acima dos dois painéis (divergência
  herdada do RF-010), não no header do painel de PDF.

**Nota de ambiente:** o smoke usa um backend **stub** (Node http de ~90 linhas que responde
`/analises`, `/analises/:id` e `/analises/:id/pdf` no formato do backend, com um PDF de 3
páginas gerado na hora) porque esta máquina não sobe PostgreSQL (o `@embedded-postgres`
recusa iniciar sob usuário administrador; sem Docker). O contrato consumido é o mesmo do
`backend/` do Pablo — o teste ponta-a-ponta contra o NestJS real fica com o responsável.

Sem gaps de enquadramento remanescentes para o escopo da slice.
