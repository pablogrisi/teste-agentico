# Comparação visual — RF-014 (visor de PDF + referência de página)

Evidência da validação visual do ciclo RF-014 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 01–02/09/2026, viewport 1440×900, via Chrome (playwright-core).

| Arquivo                         | O que é                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rf014-visor-sem-backend.png`   | `/analise/1` **sem** `NEXT_PUBLIC_API_BASE_URL` (fixtures): no lugar do visor, um aviso "O visor abre o PDF do processo quando a tela está conectada ao backend" + "24 páginas no documento"                                                                                                                                                                                                 |
| `rf014-referencia-clicavel.png` | Requisito expandido — "Referência de página: **Página N**" como link (leva ao visor) + botão "Editar"                                                                                                                                                                                                                                                                                        |
| `rf014-editor-pagina.png`       | Editor inline de página aberto: campo numérico + "Salvar" / "Cancelar"                                                                                                                                                                                                                                                                                                                       |
| `rf014-smoke-page2.png`         | Smoke inicial contra um backend **stub** (mock do contrato) — mantido como registro                                                                                                                                                                                                                                                                                                          |
| `rf014-real-visor.png`          | **Smoke conjunto real** (02/09/2026): backend NestJS + PostgreSQL 17 no ar (`:3000`), frontend buildado com `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` (`:3201`). Análise criada por `POST /analises` com um PDF de 4 páginas, processada (`PRONTA_PARA_REVISAO`, `totalPaginasPdf=4`); o `<iframe>` carrega `GET /analises/:id/pdf` (`Content-Disposition: inline`) e renderiza o PDF |
| `rf014-real-editou-pagina.png`  | O editor inline salvou a página **3** → `PATCH /analises/:id/requisitos/:requisitoId` `{ paginaReferencia: 3 }` no backend real; confirmado no banco: `CHK-001 → paginaReferencia = 3` (sem exigir comentário — R-06 não disparou); o requisito re-renderizou com "Página 3" sem reload                                                                                                      |
| `rf014-real-page-nav.png`       | Clicar em "Página 3" no requisito moveu o `<iframe>` para `…/analises/:id/pdf#page=3&view=FitH` — o visor nativo abriu a folha 3 ("Folha 3 - Pesquisa de preços")                                                                                                                                                                                                                            |

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
- **Sem `NEXT_PUBLIC_API_BASE_URL`** (fixtures) o visor não mostra documento — só um aviso +
  o total de páginas (as fixtures não têm PDF; forjar um enganaria). A referência clicável e o
  editor de página funcionam mesmo assim.
- **Editor de página inline no requisito**, não numa toolbar global nem no modal "Alterar
  parecer" (o RF-008 adiou o campo do protótipo para cá; inline permite corrigir a página sem
  mexer no parecer — o `PATCH { paginaReferencia }` não dispara a R-06).
- O NUP/objeto e o "voltar" ficam no `AnaliseHeader` acima dos dois painéis (divergência
  herdada do RF-010), não no header do painel de PDF.

**Smoke conjunto — feito contra o backend real (02/09/2026).** Esta máquina tem um serviço
**PostgreSQL 17** rodando (o `@embedded-postgres` é que recusa sob usuário admin — o
Postgres do sistema roda normal). Criada a base `licia`, aplicadas as migrations, seed dos
12 requisitos, `npm run start` do NestJS em `:3000` e o frontend buildado com
`NEXT_PUBLIC_API_BASE_URL` em `:3201`. Verificado ponta a ponta:

- `POST /analises` (multipart) cria; o worker processa (`stub` da IA) → `PRONTA_PARA_REVISAO`
  com `totalPaginasPdf = 4` (contagem `pdf-lib` do PDF real).
- `GET /analises/:id/pdf` → `200 application/pdf`, `Content-Disposition: inline`, **sem**
  `X-Frame-Options`/CSP → o `<iframe>` renderiza; navegação por `#page=N` funciona no visor nativo.
- `PATCH /analises/:id/requisitos/:requisitoId` `{ paginaReferencia: 3 }` (do editor inline)
  → `{ item, resumo }`, gravado no banco (`CHK-001.paginaReferencia = 3`), **sem** disparar a R-06.
- Preflight `OPTIONS` → `204` com `Access-Control-Allow-Origin` da origem do frontend (CORS `35ee46d`).

O primeiro smoke (contra um stub Node) fica registrado em `rf014-smoke-page2.png`; o
`stub-backend.mjs` foi um andaime, não entrou no repo.

Sem gaps de enquadramento remanescentes para o escopo da slice.
