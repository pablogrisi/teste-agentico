---
title: TSD - Baixar o relatório PDF da análise concluída (RF-016, frontend)
type: tsd
status: em aprovação
created: 02/09/2026 // Vinicius
updated: 02/09/2026 // Vinicius
related:
  - docs/product/prd.md
  - docs/architecture/sdd.md
  - docs/engineering/specs/011-relatorio-pdf.tsd.md
  - docs/engineering/specs/019-visor-pdf-frontend.tsd.md
  - docs/engineering/specs/020-conclusao-analise-frontend.tsd.md
  - .ai-dev/visual-reference-workflow.md
---

# TSD — Baixar o relatório PDF da análise concluída (RF-016, frontend)

## 1. Resumo

Numa análise **`CONCLUIDA`**, o cabeçalho da tela ganha um botão **"Baixar relatório"** — um
link para `GET /analises/:id/relatorio` (contrato TSD-011: `application/pdf`,
`Content-Disposition: inline`), aberto em nova aba. Ocupa o mesmo lugar do "Concluir análise"
do RF-012: enquanto a análise está `PRONTA_PARA_REVISAO` aparece o "Concluir"; depois de
concluída (na hora, via o `detalheEfetivo` que o `TelaAnalise` já segura), o slot troca para
"Baixar relatório". Sem `NEXT_PUBLIC_API_BASE_URL`, o botão aparece **desabilitado** com um
aviso — igual ao visor de PDF do RF-014 sem backend.

Vínculo com o backend do Pablo: consome `GET /analises/:id/relatorio` (já na `main` — backend
RF-016 / TSD-011), do mesmo jeito que o RF-014 consome `GET /analises/:id/pdf` — como URL de
navegação, não `fetch` parseado. Sem mudança de contrato.

**User Story de origem:** `docs/product/roadmap.md`, RF-016 — bloco "User Story (frontend — RF-016)".

## 2. Objetivo técnico

- Camada de dados:
  - `AnalisesGateway.urlRelatorio(analiseId: string): string | null` — `Http` devolve
    `${base}/analises/${encodeURIComponent(id)}/relatorio`; `Fixtures` devolve `null`
    (não há relatório real). Espelha exatamente o `urlPdf` do RF-014.
- `BaixarRelatorio` (client, novo) — lê `getAnalisesGateway().urlRelatorio(analiseId)`:
  - `string` → `<a>` estilizado como botão, `href` = a URL, `target="_blank"`,
    `rel="noopener noreferrer"`.
  - `null` → `<span>` desabilitado + aviso curto; nenhum link.
- `TelaAnalise` — o `acao` do `AnaliseHeader` passa a ter três casos: `PRONTA_PARA_REVISAO` →
  `<ConcluirAnalise>` (RF-012), `CONCLUIDA` → `<BaixarRelatorio>`, senão `undefined`. Usa o
  `detalheEfetivo` (já existe) para reagir à conclusão sem reload.
- Testes: unit (`Fixtures.urlRelatorio` → `null`; contrato de `Http.urlRelatorio`);
  componente `BaixarRelatorio` (com/sem URL); `TelaAnalise` (análise `CONCLUIDA` mostra
  "Baixar relatório"; concluir pelo modal troca "Concluir análise" → "Baixar relatório").
- `npm run ci` verde; smoke conjunto contra o NestJS real (o backend roda nesta máquina);
  screenshots (botão numa análise concluída; modo sem backend).

## 3. Escopo

### Incluído

#### Camada de dados (`src/lib/data/`)

- **`analises-gateway.ts`**: `AnalisesGateway.urlRelatorio(analiseId: string): string | null`
  na interface (docstring: `GET /analises/:id/relatorio`, TSD-011; `null` sem backend real).
- **`http-analises-gateway.ts`**:
  `urlRelatorio(id)` → `` `${this.baseUrl.replace(/\/+$/, "")}/analises/${encodeURIComponent(id)}/relatorio` ``
  (mesmo padrão do `urlPdf`).
- **`fixtures-analises-gateway.ts`**: `urlRelatorio(_analiseId: string): string | null { return null; }`.
- **`index.ts`**: nada novo a exportar (método só na interface; `getAnalisesGateway` já é o ponto único).

#### Componentes (`src/components/analise/`)

- **`BaixarRelatorio.tsx`** (+ `.module.css`, client):
  - Props: `{ analiseId: string }`.
  - `const url = getAnalisesGateway().urlRelatorio(analiseId)`.
  - **Com `url`** → `<a className={styles.botao} href={url} target="_blank" rel="noopener noreferrer">Baixar relatório</a>`.
  - **`url === null`** → `<span className={styles.raiz}><span className={styles.botaoOff} aria-disabled="true">Baixar relatório</span><span className={styles.aviso} role="note">Disponível com a tela conectada ao backend.</span></span>`.
  - Estilo do `.botao` = o mesmo do botão "Concluir análise" (fundo `--color-brand-default`,
    texto `--color-text-inverse`, `hover` `--color-brand-hover`), reaproveitando os tokens; o
    `.botaoOff` usa `--color-icon-disabled` como o botão travado do `ConcluirAnalise`.
- **`AnaliseHeader.tsx`**: **sem mudança** — a prop `acao?: ReactNode` do RF-012 já serve.
- **`TelaAnalise.tsx`**:
  - `acao` passa de um ternário para:
    ```
    const acao =
      detalheEfetivo.status === "PRONTA_PARA_REVISAO" ? (
        <ConcluirAnalise analiseId={detalheEfetivo.id} obrigatoriosPendentes={resumoAtual.obrigatoriosPendentes} onConcluida={setDetalheEfetivo} />
      ) : detalheEfetivo.status === "CONCLUIDA" ? (
        <BaixarRelatorio analiseId={detalheEfetivo.id} />
      ) : undefined;
    ```
  - Nada mais muda (`detalheEfetivo`/`resumoAtual` e o reset por identidade já existem do RF-012).

#### Testes (`frontend/test/unit/`)

Ver §7.1.

### Fora do escopo

- Pré-visualizar o relatório embutido na própria tela (iframe/modal) — abre em nova aba, só.
- Forçar "download" (blob + `<a download>`): o backend entrega `inline` de propósito
  (decisão do ciclo backend — abre no visor, usuário salva); o frontend segue essa decisão,
  igual ao `GET /analises/:id/pdf` do RF-014. (Alternativa registrada em §9.)
- Baixar o **PDF de entrada** do processo (não é RF; o visor do RF-014 já o mostra).
- Qualquer mudança no **conteúdo/layout** do relatório — é o backend TSD-011 que define.
- Tratamento in-app de `409`/`404` do relatório: o botão só existe quando `status === "CONCLUIDA"`
  (estado terminal no MVP — sem reabertura), então `409` só por corrida e `404` é
  praticamente impossível; ver §9.
- Reabrir uma análise `CONCLUIDA`; histórico de relatórios; e-mail/compartilhamento dentro do app.
- Botão na **lista** de análises (`/`) — o acesso é pela tela da análise.

## 4. Contexto consultado

- `docs/product/prd.md` — RF-016 (relatório PDF final para arquivo/compartilhamento fora do sistema)
- `docs/product/questoes-abertas.md` — **A-04** (relatório sob demanda, não persistido — fechada no ciclo backend)
- `docs/engineering/specs/011-relatorio-pdf.tsd.md` — contrato: `GET /analises/:id/relatorio` →
  `200 application/pdf`, `Content-Disposition: inline; filename="relatorio-analise-<id>.pdf"`;
  `409` se `!= CONCLUIDA`; `404` se não existe para o analista
- `backend/src/relatorio/relatorio.controller.ts` + `relatorio.service.ts` — conferido no `main`
  (`@Get(':id/relatorio')` → `StreamableFile` `application/pdf` `inline`; `ConflictException`
  se `status !== 'CONCLUIDA'`; `404` via `analises.abrir`)
- `docs/engineering/specs/019-visor-pdf-frontend.tsd.md` — `urlPdf(analiseId): string | null` (o
  padrão de seam para URL de binário; `Fixtures` → `null` + aviso na tela)
- `docs/engineering/specs/020-conclusao-analise-frontend.tsd.md` — `AnaliseHeader.acao`,
  `TelaAnalise.detalheEfetivo`/`resumoAtual`, `ConcluirAnalise` (estilo do botão do cabeçalho)
- `Prototipo Licia Analisadora/` — **não há** afordância de "baixar relatório" no protótipo
  (a tela do protótipo termina no checklist). O botão é acréscimo desta slice; segue o estilo
  do botão "Concluir análise" (que também é acréscimo, RF-012).

## 5. Impacto esperado

- **Produto:** fecha o fluxo do MVP frontend — o analista conclui e leva o resultado embora
  (arquivo/compartilhamento), sem sair da tela.
- **Arquitetura:** segundo uso do padrão "seam expõe URL de binário" (`urlRelatorio` ao lado
  de `urlPdf`); nenhum componente monta `${base}/analises/...`.
- **Implementação:** 1 método no gateway (2 impls + contrato) + `BaixarRelatorio` (+ CSS) + o
  ramo `CONCLUIDA` do `acao` no `TelaAnalise`. `AnaliseHeader` intocado.
- **Testes:** unit do gateway; componente `BaixarRelatorio`; `TelaAnalise` (estado por status
  - troca do botão ao concluir).
- **Documentação:** roadmap, checkpoint, `.ai-dev/audit.md`, `frontend/README.md`, evidência
  visual. Fecha o MVP frontend — atualizar o marco no roadmap/checkpoint.
- **Operação:** sem deploy; num deploy real com CSP, abrir o relatório em nova aba não precisa
  de `frame-src` (não é `<iframe>`); vale a mesma nota de CORS/headers do RF-014.

## 6. Plano de implementação

1. `analises-gateway.ts` (assinatura `urlRelatorio`) + `http-analises-gateway.ts` + `fixtures-analises-gateway.ts`.
2. `BaixarRelatorio.tsx` (+ CSS) — com/sem URL.
3. `TelaAnalise.tsx` — ramo `CONCLUIDA` do `acao`.
4. Testes (unit + componentes).
5. `npm run ci`.
6. Smoke conjunto contra o NestJS real (concluir uma análise → "Baixar relatório" abre
   `GET /analises/:id/relatorio` → `200 application/pdf`); screenshots.
7. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, `frontend/README.md`, evidência visual;
   fechar o marco "MVP frontend completo".

## 7. Validação

### 7.1 Estratégia de testes

| Tipo                                                   | Aplica-se?                                  | Justificativa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitário                                               | Sim                                         | `FixturesAnalisesGateway.urlRelatorio` → `null`. Componente `BaixarRelatorio`: com `urlRelatorio` mockado → um `link` acessível "Baixar relatório" com `href` = a URL, `target="_blank"`, `rel` contém `noopener`; com `null` → texto "Baixar relatório" **sem** `role="link"` + o aviso `role="note"`. `TelaAnalise`: `status: "CONCLUIDA"` → aparece "Baixar relatório" e **não** "Concluir análise"; `status: "PRONTA_PARA_REVISAO"` → o contrário; ao concluir pelo modal do RF-012 (gateway `concluirAnalise` mockado devolvendo `CONCLUIDA`), o cabeçalho troca "Concluir análise" → "Baixar relatório" sem reload. |
| Contrato (formato entre serviços)                      | Sim                                         | `HttpAnalisesGateway.urlRelatorio` monta `${base}/analises/${id}/relatorio` — id encodado (`encodeURIComponent`), sem barra dupla mesmo com `baseUrl` terminando em `/`. Espelha `GET /analises/:id/relatorio` (TSD-011). (Não há corpo a validar — é URL de navegação, não `fetch`.)                                                                                                                                                                                                                                                                                                                                     |
| Integração (módulos/camadas reais)                     | Não nesta slice                             | Sem backend nos testes automáticos; o `<a href>` aponta para uma URL, não há cadeia a montar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Smoke/validação manual contra dependência externa real | **Sim** (o backend real roda nesta máquina) | NestJS + PostgreSQL 17 em `:3000`, frontend com `NEXT_PUBLIC_API_BASE_URL` em `:3201`. Abrir uma análise `CONCLUIDA` (as do smoke do RF-012 servem): o cabeçalho mostra "Baixar relatório"; clicar abre `GET /analises/:id/relatorio` → `200`, `Content-Type: application/pdf`, `Content-Disposition: inline`, corpo `%PDF-`; a nova aba renderiza o relatório. Registrar no ciclo.                                                                                                                                                                                                                                       |

Slice de interface: **screenshots** do botão "Baixar relatório" no cabeçalho de uma análise
concluída (contra o backend real, com o relatório aberto na aba) e do modo "sem backend"
(botão desabilitado + aviso).

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run ci
```

## 8. Critérios de aceite

- [ ] Numa análise `CONCLUIDA`, o cabeçalho mostra **"Baixar relatório"**; com backend, é um link para `GET /analises/:id/relatorio` que abre em nova aba (`target="_blank" rel="noopener noreferrer"`).
- [ ] Numa análise `PRONTA_PARA_REVISAO` aparece o "Concluir análise" (RF-012), **não** o "Baixar relatório"; em `PENDENTE`/`PROCESSANDO`/`ERRO_PROCESSAMENTO` não aparece nenhum dos dois.
- [ ] Concluir a análise pelo modal do RF-012 troca o botão do cabeçalho para "Baixar relatório" **sem reload**.
- [ ] Sem `NEXT_PUBLIC_API_BASE_URL`, o botão aparece **desabilitado** com o aviso; nenhuma requisição é feita; não há `role="link"`.
- [ ] `AnalisesGateway.urlRelatorio` implementado em `Http` (monta `${base}/analises/${id}/relatorio`, id encodado) e `Fixtures` (`null`); **nenhum componente monta a URL sozinho**.
- [ ] Nenhuma mudança de contrato; `npm run ci` verde; sem regressão em RF-012/014 (o `acao` do `TelaAnalise` só ganha um ramo).
- [ ] §10 revisada; screenshots em `frontend/docs/visual-reference/rf-016/`; **smoke conjunto contra o NestJS real** registrado.
- [ ] Marco "MVP frontend completo" registrado no roadmap e no checkpoint.

## 9. Riscos e decisões abertas

### Decisões da slice (a validar)

- **Link que abre em nova aba** (`<a target="_blank">` para `GET /analises/:id/relatorio`),
  **não** `fetch` + blob + `<a download>`. Motivos: (1) consistência com o visor do RF-014,
  que consome `GET /analises/:id/pdf` do mesmo jeito; (2) o backend entrega `inline` de
  propósito (decisão do ciclo backend — abre no visor, o usuário salva pelo próprio visor);
  (3) zero HTTP dentro de componente, zero estado de erro/spinner novo. **Alternativa** se você
  quiser um "salvar" de verdade (diálogo de download) e tratamento in-app de erro: um
  `AnalisesGateway.baixarRelatorio(id): Promise<Blob>` (Http mapeia `409 → AnaliseConflitoError`,
  `404 → AnaliseNaoEncontradaError`; Fixtures lança `AnalisesGatewayError` com o aviso), e o
  componente faz `URL.createObjectURL` + clique programático num `<a download>`, com "Gerando…"
  e faixa de erro. É ~1 arquivo de teste a mais e um componente com estado; entrega salvar
  direto e mensagem amigável na corrida `409`. **Recomendo o link simples** — a análise
  concluída é estado terminal no MVP, então a corrida `409` é remota.
- **Botão só em `status === "CONCLUIDA"`**, no mesmo slot `acao` do "Concluir análise". Um só
  ponto de ação no cabeçalho, previsível; e a troca "Concluir" → "Baixar" ao concluir dá
  continuidade visível. Alternativa (deixar o "Baixar" sempre visível, desabilitado antes de
  concluir) descartada — polui o cabeçalho durante a revisão.
- **Sem backend → botão desabilitado + aviso** (não escondido). Igual ao visor do RF-014: o
  usuário vê que a função existe e por que não está disponível. As fixtures não têm relatório
  e forjar um enganaria.
- **`urlRelatorio` no gateway** (não um `fetch`): é composição de URL, mas mantém a base no
  data layer — idêntico ao `urlPdf` do RF-014.

### Riscos remanescentes

- **Corrida `409`** (relatório aberto para uma análise que deixou de ser `CONCLUIDA`): sem
  reabertura no MVP isso não acontece; se a alternativa "blob" não for adotada, a nova aba
  mostraria o JSON de erro do Nest. Aceito, anotado.
- **Bloqueador de pop-up**: `target="_blank"` disparado por clique direto do usuário não é
  bloqueado pelos navegadores; ok.
- **`filename` do `Content-Disposition`**: com `inline`, o nome sugerido no "salvar" vem do
  header do backend (`relatorio-analise-<id>.pdf`); o frontend não precisa fazer nada.
- **Nome/ícone do botão**: "Baixar relatório" mesmo abrindo em nova aba — é o verbo do
  roadmap e o que o usuário espera; o comportamento (abre no visor, salva de lá) é o mesmo do
  "baixar" de qualquer PDF `inline`.
- **CSP num deploy real**: abrir em nova aba não usa `<iframe>`, então não depende de
  `frame-src`; só o CORS/headers gerais já cobertos no RF-014.

## 10. Referências visuais

O protótipo (`Prototipo Licia Analisadora/`) **não tem** botão de relatório — a tela termina
no checklist. O botão "Baixar relatório" segue o **estilo do botão "Concluir análise"** do
RF-012 (que também é acréscimo sem origem no protótipo): retângulo com fundo
`--color-brand-default`, texto `--color-text-inverse`, `radius-8`, `hover` `--color-brand-hover`;
no estado desabilitado, fundo `--color-icon-disabled` + o aviso em `--color-text-secondary`
(mesmo tratamento do motivo travado do `ConcluirAnalise`).

| ID     | Papel na aplicação                    | Link/localização                               | Nome na origem | Estados representados                    | Status de inspeção                                |
| ------ | ------------------------------------- | ---------------------------------------------- | -------------- | ---------------------------------------- | ------------------------------------------------- |
| REF-11 | Botão "Baixar relatório" no cabeçalho | — (sem origem no protótipo; ver RF-012 REF-10) | —              | habilitado (link) / desabilitado + aviso | A inspecionar nesta slice (contra o backend real) |

**Divergências intencionais a registrar:** afordância inexistente no protótipo; reaproveita o
vocabulário visual do botão do cabeçalho do RF-012; abre em nova aba (não baixa forçado).

Screenshots obrigatórios: botão "Baixar relatório" numa análise concluída (com o relatório
aberto na aba, contra o backend real); botão desabilitado + aviso (modo sem backend).
Evidência em `frontend/docs/visual-reference/rf-016/`.

## 11. Rollback

Só `frontend/`. Rollback = remover `BaixarRelatorio` (+ CSS), tirar `urlRelatorio` das duas
implementações do gateway e da interface, e voltar o `acao` do `TelaAnalise` ao ternário de
dois casos do RF-012; apagar os testes desta slice. Nenhum contrato/tipo de backend muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (021), a TSD-011 (backend) e a
TSD-019/020 (frontend) e o checkpoint. Implemente só o escopo, em frontend/, na branch
frontend/rf-016-relatorio. Não faça merge sem instrução.

Camada de dados: AnalisesGateway.urlRelatorio(analiseId) → string|null (Http:
{base}/analises/{id}/relatorio, id encodado; Fixtures: null).

UI: BaixarRelatorio (client) — const url = getAnalisesGateway().urlRelatorio(analiseId);
url → <a botão href={url} target="_blank" rel="noopener noreferrer">Baixar relatório</a>;
null → <span> desabilitado + aviso "Disponível com a tela conectada ao backend.".
TelaAnalise: acao ganha o ramo status === "CONCLUIDA" → <BaixarRelatorio analiseId=
{detalheEfetivo.id} /> (PRONTA_PARA_REVISAO segue com <ConcluirAnalise>). AnaliseHeader
não muda.

Escreva os testes previstos (§7.1). Rode npm run ci e registre a saída. Rode o smoke
conjunto contra o NestJS real (Postgres 17 desta máquina): concluir uma análise → "Baixar
relatório" abre GET /analises/:id/relatorio → 200 application/pdf inline. Screenshots
(botão numa análise concluída / modo sem backend). Rode o Agente Crítico. Atualize roadmap,
checkpoint, .ai-dev/audit.md, frontend/README.md e feche o marco "MVP frontend completo".
Push da branch + merge na main + push da main.
```
