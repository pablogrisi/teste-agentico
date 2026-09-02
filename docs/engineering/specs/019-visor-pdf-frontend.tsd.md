# TSD — Visor de PDF + referência de página clicável + correção de página (RF-014, frontend)

---
title: TSD - Visor de PDF e referência de página (RF-014, frontend)
type: tsd
status: em aprovação
created: 01/09/2026 // Vinicius
updated: 01/09/2026 // Vinicius
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/009-pdf-por-pagina.tsd.md
- docs/engineering/specs/013-tela-analise-frontend.tsd.md
- docs/engineering/specs/016-alterar-parecer-frontend.tsd.md
- docs/engineering/specs/017-verificado-interativo-frontend.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

A tela de análise ganha o **visor de PDF real** no lugar do `AnaliseVisorPlaceholder`: um
`<iframe>` com o PDF inteiro servido por `GET /analises/:id/pdf` (backend `19f308b`) e
navegação por `#page=N` — a decisão do ciclo RF-014 (nada de extração de página no servidor).
Clicar na **referência de página** de um requisito move o visor para aquela página; `null`
segue como "não informada". E o analista pode **corrigir/definir** a página pelo `PATCH
/analises/:id/requisitos/:requisitoId` com `{ paginaReferencia }` — sem disparar a R-06.

Vínculo com o backend do Pablo: o visor carrega o PDF real via `GET /analises/:id/pdf` quando
`NEXT_PUBLIC_API_BASE_URL` está definida (CORS já habilitado — `35ee46d`); a correção de
página usa o `PATCH` da TSD-008/009. Sem backend, o visor mostra um aviso + o total de páginas.

**User Story de origem:** `docs/product/roadmap.md`, RF-014 — bloco "User Story (frontend — RF-014)".

## 2. Objetivo técnico

- Camada de dados:
  - `AnalisesGateway.urlPdf(analiseId): string | null` — `Http` devolve `${base}/analises/${id}/pdf`;
    `Fixtures` devolve `null` (não há PDF real).
  - `AnalisesGateway.corrigirPaginaReferencia(analiseId, requisitoId, pagina: number | null): Promise<RevisaoRequisitoResultado>`
    — `PATCH` com `{ paginaReferencia: pagina }` (reusa `patchRevisao`). Fixtures aplica e
    recalcula `resumo`; **não persiste**.
  - `validarPaginaReferencia(valor: string, totalPaginas: number | null): { pagina: number | null; erro?: string }`
    puro — espelha o backend: inteiro `1..totalPaginas` (quando conhecido), `≥ 1` (quando
    `null`), ou string vazia → `null` (limpar); senão erro.
- `AnaliseVisor` (client) — visor controlado (`pagina` + `onPagina`); com `urlPdf` → toolbar
  (anterior / campo de página / próxima / "N de total") + `<iframe key={pagina}>`; sem
  `urlPdf` → aviso + total de páginas.
- `TelaAnalise` (client) — dono do estado `pagina` compartilhado; renderiza `AnaliseVisor` +
  `PainelRevisao` lado a lado. `page.tsx` passa a renderizar `<TelaAnalise detalhe={...} />`.
- `PainelRevisao` → `onIrParaPagina?` e `onCorrigirPagina?` descem até o `RequisitoItem`
  (junto de `onAlterarParecer`/`onToggleVerificado`), só quando `podeEditar`.
- `RequisitoItem` — a linha "Referência de página" vira clicável (vai pro visor) + ganha um
  **editor inline** de página (campo numérico + salvar), com `salvando`/`erro` local.
- Testes: unit (`validarPaginaReferencia`, `Fixtures.urlPdf`/`corrigirPaginaReferencia`,
  contrato de `Http.urlPdf`/`corrigirPaginaReferencia`); componentes (`AnaliseVisor` com/sem
  `urlPdf`; `RequisitoItem` — clique na página chama `onIrParaPagina`, editor inline chama
  `onCorrigirPagina`, `422` mostra a mensagem do backend; `TelaAnalise` — clique no requisito
  move o visor).
- `npm run ci` verde; screenshots (visor com aviso de fixtures; referência clicável; editor de
  página).

## 3. Escopo

### Incluído

#### Camada de dados (`src/lib/data/`)

- **`analises-gateway.ts`**:
  - `AnalisesGateway.urlPdf(analiseId: string): string | null`.
  - `AnalisesGateway.corrigirPaginaReferencia(analiseId: string, requisitoId: string, pagina: number | null): Promise<RevisaoRequisitoResultado>`.
  - (Reusa `RevisaoRequisitoResultado`, `AnaliseConflitoError`, `AnaliseNaoEncontradaError`, `AnaliseValidacaoError`.)
- **`pagina-referencia.ts`** (novo):
  - `PAGINA_REFERENCIA_VAZIO = ""`.
  - `validarPaginaReferencia(valor: string, totalPaginas: number | null): { pagina: number | null; erro?: string }`:
    - `valor.trim() === ""` → `{ pagina: null }` (limpar).
    - não-inteiro ou `< 1` → `{ pagina: null, erro: "Informe um número de página válido." }` (não envia).
    - `totalPaginas !== null && n > totalPaginas` → `{ pagina: null, erro: "O documento tem <total> páginas." }`.
    - senão → `{ pagina: n }`.
- **`http-analises-gateway.ts`**:
  - `urlPdf(id)` → `${this.baseUrl.replace(/\/+$/,"")}/analises/${encodeURIComponent(id)}/pdf`.
  - `corrigirPaginaReferencia(id, requisitoId, pagina)` → `this.patchRevisao(id, requisitoId, { paginaReferencia: pagina })` (o `patchRevisao` já existe do RF-011; mapeia 422/409/404 e valida `{ item, resumo }`).
- **`fixtures-analises-gateway.ts`**:
  - `urlPdf()` → `null`.
  - `corrigirPaginaReferencia(id, requisitoId, pagina)` → `localizarAvaliacao` (409/404) →
    `resultadoComItem(grupos, { ...atual, paginaReferencia: pagina })`. **Não grava.**
- **`index.ts`**: exporta `validarPaginaReferencia`, `PAGINA_REFERENCIA_VAZIO`.

#### Componentes (`src/components/analise/`)

- **`AnaliseVisor.tsx`** (+ `.module.css`, client) — substitui `AnaliseVisorPlaceholder`:
  - Props: `{ analiseId: string; totalPaginas: number | null; pagina: number; onPagina: (n: number) => void }`.
  - `const url = getAnalisesGateway().urlPdf(analiseId)`.
  - **Com `url`:** cabeçalho/toolbar `flex-shrink:0` — botão ‹ (`onPagina(pagina - 1)`, desabilitado em 1), `<input type="number" min=1 max={totalPaginas ?? undefined}>` controlado por `pagina` (commit no `blur`/`Enter` via `onPagina`), "N de {totalPaginas ?? "?"}", botão › (desabilitado em `totalPaginas`). Abaixo, `<iframe key={pagina} title="PDF do processo" src={`${url}#page=${pagina}&view=FitH`} className={styles.frame} />` (o `key` força o reload no fragmento).
  - **Sem `url`:** o mesmo frame do placeholder de hoje — título "Visor de PDF", texto "O visor abre o PDF do processo quando a tela está conectada ao backend." + "{totalPaginas} páginas no documento." quando não-nulo.
  - `clamp` de `pagina` em `[1, totalPaginas]` quando `totalPaginas` é conhecido.
- **`TelaAnalise.tsx`** (client) — orquestra o estado compartilhado:
  - Props: `{ detalhe: AnaliseDetalhe }`.
  - `const [pagina, setPagina] = useState(1)`.
  - Renderiza `<AnaliseVisor analiseId={detalhe.id} totalPaginas={detalhe.totalPaginasPdf} pagina={pagina} onPagina={setPagina} />` + `<Suspense fallback={null}><PainelRevisao detalhe={detalhe} onIrParaPagina={setPagina} /></Suspense>` no `div.paineis`.
  - O `<Suspense>` (que hoje está no `page.tsx`) vem para cá porque `PainelRevisao` usa `useSearchParams`.
- **`page.tsx`**:
  - Deixa de importar `AnaliseVisorPlaceholder`/`PainelRevisao`/`Suspense`; passa a renderizar
    `<AnaliseHeader detalhe={detalhe} />` + `<TelaAnalise detalhe={detalhe} />` dentro do `div.coluna`.
- **`PainelRevisao.tsx`**:
  - Novas props opcionais `onIrParaPagina?: (n: number) => void` e — internamente — o painel
    ganha `corrigirPagina(item, pagina)` (só quando `podeEditar`) análogo a `alternarVerificado`:
    `const { item: it, resumo: rs } = await getAnalisesGateway().corrigirPaginaReferencia(detalhe.id, item.requisitoId, pagina); aplicarRevisao(it, rs);`
  - `onIrParaPagina` e `onCorrigirPagina` descem por `ConteudoAba`/`ListaAba` até o `RequisitoItem`.
- **`RequisitoItem.tsx`**:
  - Props novas: `onIrParaPagina?: (n: number) => void`, `onCorrigirPagina?: (pagina: number | null) => Promise<void>`, `totalPaginas?: number | null`.
  - Linha "Referência de página": quando `paginaReferencia !== null` e `onIrParaPagina` →
    `<button className={styles.paginaLink} onClick={() => onIrParaPagina(item.paginaReferencia!)}>Página {n}</button>`; sem callback, texto como hoje. `null` → "não informada" (nunca clicável).
  - Quando `onCorrigirPagina`: um botão "Editar" ao lado → alterna um mini-form: `<input type="number">` (valor inicial = `paginaReferencia ?? ""`), "Salvar" / "Cancelar". No "Salvar": `validarPaginaReferencia(valor, totalPaginas)` → erro inline OU `await onCorrigirPagina(pagina)` (com `salvando`; no `catch` `AnaliseValidacaoError` → `motivos[0]`, senão genérica).
  - Estado local: `editandoPagina` (bool), `salvandoPagina` (bool), `erroPagina` (string | null).

#### Testes (`frontend/test/unit/`)

Ver §7.1.

### Fora do escopo

- Destaque/anotação de trecho no PDF; miniaturas; busca dentro do PDF; zoom além do que o
  visor nativo do browser dá.
- Baixar o PDF de entrada (não é RF); relatório final (RF-016).
- Sugestão automática de página pela IA (A-02, fora do MVP).
- Campo de página **dentro** do modal "Alterar parecer" — fica só o editor inline no requisito
  (decisão herdada do RF-008, que adiou o campo do protótipo para cá; ver §9).
- Renderização de PDF por biblioteca (`pdf.js` etc.) — usa o visor nativo do browser via `<iframe>`.
- Conclusão da análise / botão global (RF-012).

## 4. Contexto consultado

- `docs/product/prd.md` — RF-014 (abrir a página que sustenta o parecer; ausência explícita)
- `docs/product/questoes-abertas.md` — **P-05** (parcialmente fechada: analista corrige/limpa
  `paginaReferencia`; a *sugestão* automática e "quando a ausência é válida" seguem abertas — A-02)
- `docs/architecture/sdd.md` — §7 (Criar → `total_paginas_pdf`; Revisar → `paginaReferencia`;
  `GET /analises/:id/pdf` sem param de página), §9 (decisão RF-014)
- `docs/engineering/specs/009-pdf-por-pagina.tsd.md` — `totalPaginasPdf`; `PATCH` aceita
  `paginaReferencia` (`1..total` \| `≥1` \| `null` → senão `422`), **sem** disparar a R-06;
  navegação por `#page=N`; `lerPagina` fica como seam não implementado
- `docs/engineering/specs/016/017` — `patchRevisao`, `overrides`/`resumo`, `aplicarRevisao`,
  `podeEditar`, `localizarAvaliacao`/`resultadoComItem` (fixtures), padrão de estado local
  `salvando`/`erro` no `RequisitoItem`
- `backend/src/analises/analises.controller.ts` (`@Get(':id/pdf')` → `StreamableFile`
  `application/pdf` `inline`) + `revisao-requisito.ts` (`erroPaginaReferencia`) — conferido no `main`
- `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/PdfPanel.tsx` — o painel
  esquerdo: toolbar com ‹ [nº] / total › e a área do documento. (O protótipo desenha um
  documento **falso**; aqui é o `<iframe>` do PDF real.) `ChangeOpinionModal` tem o campo
  "Página no documento" — movido para o editor inline (ver §9).

## 5. Impacto esperado

- **Produto:** o analista confere a evidência de cada parecer na hora, e conserta a página
  quando a IA errou — o "por que" do parecer fica rastreável ao documento.
- **Arquitetura:** primeiro consumo de um endpoint de **binário** (`GET /analises/:id/pdf`) —
  não via `fetch` parseado, mas como `src` de `<iframe>`; o seam expõe a URL
  (`urlPdf`) para nenhum componente montar a base sozinho. O estado `pagina` sobe para um
  wrapper client (`TelaAnalise`) porque o visor e o painel são irmãos.
- **Implementação:** `pagina-referencia.ts` + 2 métodos no gateway (2 impls + contrato) +
  `AnaliseVisor` + `TelaAnalise` + props no `PainelRevisao`/`RequisitoItem` + editor inline.
- **Testes:** unit dos puros/gateway; componentes do visor, do item e da coordenação.
- **Documentação:** roadmap, checkpoint, `.ai-dev/audit.md`, `frontend/README.md`, evidência
  visual; `questoes-abertas.md` P-05 (a parte frontend da correção fica coberta).
- **Operação:** sem deploy; num deploy real, CSP/`frame-src` precisa permitir o backend (nota).

## 6. Plano de implementação

1. `pagina-referencia.ts` + `analises-gateway.ts` (assinaturas) + export.
2. `http-analises-gateway.ts` (`urlPdf`, `corrigirPaginaReferencia`) + contrato.
3. `fixtures-analises-gateway.ts` (`urlPdf` → null, `corrigirPaginaReferencia`) + unit.
4. `AnaliseVisor.tsx` (+ CSS) — com/sem `urlPdf`, toolbar, `<iframe>`.
5. `TelaAnalise.tsx` — estado `pagina`, monta visor + painel; `page.tsx` passa a usá-lo.
6. `PainelRevisao.tsx` — fio de `onIrParaPagina` + `corrigirPagina` (só `podeEditar`).
7. `RequisitoItem.tsx` — página clicável + editor inline + estado local.
8. Testes (unit + componentes).
9. `npm run ci`; screenshots (aviso de fixtures / referência clicável / editor de página) vs protótipo.
10. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, `frontend/README.md`, evidência visual.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `validarPaginaReferencia` (vazio → `null`; não-inteiro/`<1` → erro; `> total` → erro; ok → número). `FixturesAnalisesGateway.urlPdf` → `null`; `corrigirPaginaReferencia` (aplica `paginaReferencia`, recalcula `resumo`, não persiste; `409` fora de `PRONTA_PARA_REVISAO`; `404`). Componentes: `AnaliseVisor` (sem `urlPdf` → aviso + total; com `urlPdf` mockado → `<iframe>` com `#page=` no `src`, ‹ desabilitado em 1, › desabilitado no total, editar o campo chama `onPagina`); `RequisitoItem` (`paginaReferencia` com `onIrParaPagina` → botão que chama com o número; `null` → "não informada", sem botão; editor inline chama `onCorrigirPagina` com o número validado; `422` → mensagem do backend); `TelaAnalise` (clicar na página de um requisito muda o `#page=` do `<iframe>`); `PainelRevisao` (repassa os callbacks só quando `PRONTA_PARA_REVISAO`). |
| Contrato (formato entre serviços) | Sim | `HttpAnalisesGateway.urlPdf` monta `${base}/analises/${id}/pdf` (id encodado, sem barra dupla). `HttpAnalisesGateway.corrigirPaginaReferencia` faz `PATCH` na URL de revisão com corpo **exatamente** `{ paginaReferencia }`, parseia `{ item, resumo }`, mapeia `422 → AnaliseValidacaoError`, `409/404`, malformado/rede → `AnalisesGatewayError`. Espelha `GET /analises/:id/pdf` e `PATCH …/requisitos/:requisitoId` (TSD-009). |
| Integração (módulos/camadas reais) | Não nesta slice | Sem backend; o `<iframe>` aponta para uma URL, não há cadeia a montar; costuras testadas isoladamente. |
| Smoke/validação manual contra dependência externa real | **Recomendado** (agora possível) | Com o CORS habilitado no backend (`35ee46d`), subir os dois processos (`frontend/README.md` > "Rodar contra o backend real"), abrir uma análise e conferir que o `<iframe>` carrega o PDF e que a referência de página pula a folha. Registrar o resultado no ciclo. |

Slice de interface: **screenshots** do visor no modo "sem backend" (aviso + total), da
referência de página clicável no requisito, e do editor inline de página aberto.

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run ci
```

## 8. Critérios de aceite

- [ ] A tela de análise mostra o visor à esquerda: com `NEXT_PUBLIC_API_BASE_URL`, um `<iframe>` cujo `src` é `…/analises/:id/pdf#page=<n>`; sem ela, um aviso + "{totalPaginasPdf} páginas no documento".
- [ ] A toolbar do visor navega: ‹ / campo de página / › atualizam a página; ‹ desabilita em 1, › desabilita no total (quando conhecido); o `<iframe>` recarrega no `#page=` novo.
- [ ] Na linha "Referência de página" de um requisito: `paginaReferencia !== null` → botão "Página N" que manda o visor para N; `null` → "não informada", não clicável.
- [ ] O editor inline de página envia `PATCH /analises/:id/requisitos/:requisitoId` com `{ paginaReferencia }` via `AnalisesGateway.corrigirPaginaReferencia` (nenhum componente fala HTTP direto); no sucesso o requisito reflete a nova página e o `resumo` é aplicado sem reload; `422` mostra a mensagem do backend, `409`/`404`/rede mensagens claras.
- [ ] `validarPaginaReferencia` barra client-side: vazio → limpar (`null`); não-inteiro/`< 1` → erro; `> totalPaginasPdf` (quando conhecido) → erro; senão envia o número.
- [ ] Página só é editável quando a análise está `PRONTA_PARA_REVISAO`.
- [ ] Nenhuma mudança de contrato; `npm run ci` verde; sem regressão em RF-008/011/017.
- [ ] §10 revisada; screenshots em `frontend/docs/visual-reference/rf-014/`; smoke conjunto (frontend+backend) registrado ou justificado.

## 9. Riscos e decisões abertas

### Decisões da slice (a validar)

- **Visor nativo do browser via `<iframe src="…/pdf#page=N">`**, não `pdf.js`. É o que a
  decisão do ciclo pede (`#page=N` contra o PDF inteiro) e evita uma dependência pesada. O
  controle de zoom/rotação é o do visor nativo. `key={pagina}` força o reload no fragmento
  (alguns browsers não repuxam o `#page` só trocando o `src`).
- **Editor de página inline no requisito**, não no modal "Alterar parecer". O RF-008 adiou o
  campo "Página no documento" do protótipo para cá; um editor no requisito permite corrigir a
  página **sem** mexer no parecer (o `PATCH` aceita `paginaReferencia` sozinho e não dispara a
  R-06). Se você preferir o campo no modal, dá para mover — mas aí só edita junto com o parecer.
- **Estado `pagina` num wrapper client `TelaAnalise`**. O visor e o painel são irmãos e
  precisam de estado comum; `page.tsx` (server component) não pode segurar. O `<Suspense>` do
  `PainelRevisao` migra para o `TelaAnalise`.
- **`urlPdf` no gateway** (não um `fetch`): é composição de URL, mas mantém o conhecimento da
  base no data layer — nenhum componente monta `${base}/analises/...` sozinho.
- **Sem backend (fixtures) o visor não mostra documento** — só o aviso + total. As fixtures
  não têm PDF real e não vale forjar um; a referência clicável e o editor de página funcionam
  mesmo assim (mudam o número/estado; só não há folha para exibir). Andaime coerente com
  RF-001/008/011.
- **Slice de 2 partes** (visor + navegação; correção de página). Se ficar grande demais no
  Dev, corta-se a correção de página para um TSD-020 e RF-014 entrega só o visor + clique.

### Riscos remanescentes

- **CSP / `frame-src`**: num deploy com Content-Security-Policy, o `<iframe>` para o backend
  precisa de `frame-src <backend>`. Em dev não há CSP. Anotar como nota de ops.
- **Browser sem visor de PDF nativo** (raro hoje): o `<iframe>` cai para "baixar" — aceitável
  no MVP; um fallback com link "abrir o PDF" pode entrar depois.
- **`#page=` e `view=FitH`**: suporte varia entre Chrome/Firefox/pdf.js embutido; o número da
  página funciona em todos os alvos relevantes; `view` é best-effort.
- **`totalPaginasPdf: null`** (PDF não parseável no backend): a toolbar mostra "N de ?", o ›
  não desabilita, e `validarPaginaReferencia` só exige `≥ 1`. Coberto por teste.
- **Polling (`AutoRefreshAnalise`)**: só roda em `PENDENTE`/`PROCESSANDO`; numa análise
  `PRONTA_PARA_REVISAO` o `detalhe` não muda sozinho e o `pagina`/overrides sobrevivem.
- **`pagina` vs `paginaReferencia` corrigida**: se o usuário corrige a página de um requisito,
  o visor **não** pula automaticamente — só quando ele clica na referência. Intencional (menos
  susto); dá para ligar depois.

## 10. Referências visuais

Referência: `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/PdfPanel.{tsx,module.css}`.

| ID | Papel na aplicação | Link/localização | Nome na origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| REF-09 | Painel esquerdo — visor de PDF + toolbar de página | `.../components/PdfPanel.{tsx,module.css}` | `PdfPanel` | toolbar ‹ [nº] / total ›; área do documento | A inspecionar nesta slice |

Do protótipo: `.panel` ocupa `flex:1`, fundo `--color-bg-viewer`, borda; `.viewer` com uma
`.toolbar` (`flex-shrink:0`) — nome do arquivo à esquerda, navegação ‹ [input] / total › à
direita — e a `.documentArea` rolável. Reaproveitar a **anatomia** da toolbar; a
`.documentArea` do protótipo (um documento desenhado à mão) é substituída pelo `<iframe>` do
PDF real (ou pelo aviso quando não há backend).

**Divergências intencionais a registrar:** o protótipo desenha um documento falso com alerta
de inconsistência embutido; aqui é o PDF real via `<iframe>` nativo (sem alerta sintético). O
protótipo põe o NUP/objeto e um "voltar" no header do painel de PDF; no nosso layout isso já
está no `AnaliseHeader` acima dos dois painéis (divergência herdada do RF-010). O editor de
página fica no **requisito** (inline), não numa toolbar global nem no modal.

Screenshots obrigatórios: visor sem backend (aviso + total); requisito com "Página N"
clicável; editor inline de página aberto. Com ambiente conjunto, incluir uma captura do
`<iframe>` carregando o PDF real. Evidência em `frontend/docs/visual-reference/rf-014/`.

## 11. Rollback

Só `frontend/`. Rollback = voltar `page.tsx` a renderizar `AnaliseVisorPlaceholder` +
`PainelRevisao` sob `<Suspense>`; remover `AnaliseVisor`, `TelaAnalise`, `pagina-referencia.ts`,
os métodos `urlPdf`/`corrigirPaginaReferencia` das duas implementações do gateway, as props
`onIrParaPagina`/`onCorrigirPagina`/`totalPaginas` do `PainelRevisao`/`RequisitoItem` e o
editor inline; apagar os testes desta slice. Nenhum contrato/tipo de backend muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (019), a TSD-009 (backend) e a
TSD-013/016/017 (frontend) e o checkpoint. Implemente só o escopo, em frontend/, na branch
frontend/rf-014-visor. Não faça merge sem instrução.

Camada de dados: AnalisesGateway.urlPdf(analiseId) → string|null (Http: {base}/analises/{id}/pdf;
Fixtures: null); AnalisesGateway.corrigirPaginaReferencia(analiseId, requisitoId, pagina) →
{ item, resumo } (Http via patchRevisao com { paginaReferencia }; Fixtures aplica, não
persiste; 409/404). pagina-referencia.ts: validarPaginaReferencia puro (vazio→null;
não-inteiro/<1→erro; >total→erro; senão número).

UI: AnaliseVisor (client) — com urlPdf: toolbar ‹ [input] / total › + <iframe key={pagina}
src={`${url}#page=${pagina}&view=FitH`}>; sem urlPdf: aviso + total. TelaAnalise (client) —
estado pagina compartilhado, monta AnaliseVisor + <Suspense><PainelRevisao onIrParaPagina=
{setPagina}/></Suspense>. page.tsx renderiza <AnaliseHeader/> + <TelaAnalise/>. PainelRevisao
repassa onIrParaPagina + um corrigirPagina(item,pagina) (gateway + aplicarRevisao) só quando
podeEditar. RequisitoItem: "Referência de página" clicável quando paginaReferencia!=null +
onIrParaPagina; editor inline (input number + salvar) chamando onCorrigirPagina com o número
validado; estado local salvando/erro; 422 → mensagem do backend.

Escreva os testes previstos (§7.1). Rode npm run ci e registre a saída real. Se der, rode o
smoke conjunto (frontend + backend do Pablo, CORS já habilitado) e registre. Screenshots
(sem backend / referência clicável / editor de página) vs protótipo. Rode o Agente Crítico.
Atualize roadmap, checkpoint, .ai-dev/audit.md, frontend/README.md. Push da branch + merge na
main + push da main.
```
