# TSD — Botão "Concluir análise" + modal de confirmação (RF-012, frontend)

---

title: TSD - Conclusão da análise (RF-012, frontend)
type: tsd
status: aprovada — em implementação (seguir CompletionModal do protótipo)
created: 02/09/2026 // Vinicius
updated: 02/09/2026 // Vinicius
related:

- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/010-conclusao-analise.tsd.md
- docs/engineering/specs/016-alterar-parecer-frontend.tsd.md
- docs/engineering/specs/019-visor-pdf-frontend.tsd.md
- .ai-dev/visual-reference-workflow.md

---

## 1. Resumo

A tela de análise ganha um botão **"Concluir análise"** no cabeçalho, habilitado só quando
não há requisito **obrigatório** sem verificar (`resumo.obrigatoriosPendentes === 0`).
Clicar abre um **modal de confirmação**; confirmar chama `POST /analises/:id/concluir`
(contrato TSD-010) e a tela reflete `CONCLUIDA` na hora — badge, "Concluída em" e tudo
read-only (o `podeEditar` já deriva do status). `422` lista os pendentes do backend.

Vínculo com o backend do Pablo: consome `POST /analises/:id/concluir` (já na `main` `56f83bd`);
o smoke conjunto contra o NestJS real está previsto no §7.1. Sem mudança de contrato.

**User Story de origem:** `docs/product/roadmap.md`, RF-012 — bloco "User Story (frontend — RF-012)".

## 2. Objetivo técnico

- `AnalisesGateway.concluirAnalise(analiseId): Promise<AnaliseDetalhe>` — `POST` sem corpo;
  erros tipados: `422` → `AnaliseRequisitosPendentesError` (carrega `pendentes`), `409` →
  `AnaliseConflitoError`, `404` → `AnaliseNaoEncontradaError`. `Http` + `Fixtures` (não persiste)
  - contrato.
- `RequisitoPendente = { requisitoId; codigo; titulo; area }` (formato do `requisitosPendentes`
  do backend, TSD-010).
- `ConcluirAnalise` (client) — botão + `createPortal` modal; gate por `obrigatoriosPendentes`.
- `TelaAnalise` passa a orquestrar: `detalheEfetivo` (trocado na conclusão) + `resumoAtual`
  (espelhado do `PainelRevisao` via `onResumoChange`), e move o `AnaliseHeader` para dentro de
  si para que o cabeçalho reaja à conclusão.
- `PainelRevisao` ganha `onResumoChange?(resumo)` — disparado no mount e a cada `aplicarRevisao`.
- Testes: contrato de `concluirAnalise` (Http); `Fixtures` (regras); `ConcluirAnalise`
  (desabilitado com motivo / habilitado / sucesso → `onConcluida` / `422` lista pendentes /
  `409` mensagem); `TelaAnalise` (marcar o último obrigatório habilita o botão; após concluir,
  tudo read-only); `PainelRevisao` (`onResumoChange` dispara).
- `npm run ci` verde; smoke conjunto contra o NestJS real; screenshots (botão bloqueado com
  motivo; modal; tela concluída; `422` com lista).

## 3. Escopo

### Incluído

#### Camada de dados (`src/lib/data/`)

- **`types.ts`**: `RequisitoPendente` (`requisitoId`, `codigo`, `titulo`, `area`).
- **`analises-gateway.ts`**:
  - `AnalisesGateway.concluirAnalise(analiseId: string): Promise<AnaliseDetalhe>`.
  - Novo erro `AnaliseRequisitosPendentesError extends AnalisesGatewayError` com
    `readonly pendentes: RequisitoPendente[]` e mensagem "Ainda há requisitos obrigatórios não verificados."
- **`http-analises-gateway.ts`**:
  - `concluirAnalise(id)` → `POST ${base}/analises/${encodeURIComponent(id)}/concluir`, `accept: application/json`.
    `resp.status === 422` → parseia `{ requisitosPendentes }` do corpo → `AnaliseRequisitosPendentesError`
    (se o corpo não trouxer a lista, `pendentes: []`). `409` → `AnaliseConflitoError`; `404` →
    `AnaliseNaoEncontradaError`; outro não-ok → `AnalisesGatewayError`. Sucesso → `validarAnaliseDetalhe(json)`.
- **`fixtures-analises-gateway.ts`**:
  - `concluirAnalise(id)` → `abrirAnalise(id)`:
    - `status === "CONCLUIDA"` → devolve o detalhe como está (idempotente).
    - `status !== "PRONTA_PARA_REVISAO"` → `AnaliseConflitoError`.
    - `pendentes = avaliacoesPorArea.flatMap(itens).filter(obrigatorio && !verificado).map(...)`;
      `pendentes.length > 0` → `AnaliseRequisitosPendentesError(pendentes)`.
    - senão → `clonarDetalhe` com `status: "CONCLUIDA"`, `concluidaEm: new Date().toISOString()`.
      **Não persiste** (andaime — a próxima `abrirAnalise` volta ao estado das fixtures).
- **`index.ts`**: exporta `AnaliseRequisitosPendentesError` e o tipo `RequisitoPendente`.

#### Componentes (`src/components/analise/`)

- **`ConcluirAnalise.tsx`** (+ `.module.css`, client):
  - Props: `{ analiseId: string; obrigatoriosPendentes: number; onConcluida: (d: AnaliseDetalhe) => void }`.
  - Botão "Concluir análise": `disabled={obrigatoriosPendentes > 0}`; quando desabilitado,
    um `<span>` ao lado — "Faltam N requisito(s) obrigatório(s) não verificado(s)".
  - Ao clicar (habilitado) → abre o modal (portal): título "Concluir análise", texto
    "Depois de concluída, a análise fica **somente leitura**." + "Cancelar" / "Concluir".
  - Estado: `aberto`, `enviando`, `erro` (string | null), `pendentes` (`RequisitoPendente[]`).
  - "Concluir" → `getAnalisesGateway().concluirAnalise(analiseId)`:
    - sucesso → `onConcluida(detalhe)` (o pai troca o `detalheEfetivo` e o modal desmonta).
    - `AnaliseRequisitosPendentesError` → `pendentes = erro.pendentes`; `erro = "Ainda faltam requisitos obrigatórios não verificados:"`; modal aberto, lista `codigo — titulo`.
    - `AnaliseConflitoError` → "Esta análise não está mais em revisão."
    - `AnaliseNaoEncontradaError` → "Análise não encontrada."
    - `AnalisesGatewayError` → mensagem genérica.
  - A11y: `role="dialog"` `aria-modal` `aria-labelledby`; foco no "Concluir"; Escape fecha
    (exceto `enviando`); `overflow: hidden` no body (padrão do `AlterarParecerModal`).
- **`AnaliseHeader.tsx`**: nova prop opcional `acao?: React.ReactNode`, renderizada no
  `.linhaTopo` ao lado do `StatusBadge`.
- **`TelaAnalise.tsx`**:
  - Passa a renderizar também o `<AnaliseHeader detalhe={detalheEfetivo} acao={…} />`
    (movido do `page.tsx`).
  - `const [detalheEfetivo, setDetalheEfetivo] = useState(detalhe)`; reset por identidade
    quando `detalhe.id` muda (padrão do `PainelRevisao`).
  - `const [resumoAtual, setResumoAtual] = useState(detalhe.resumo)`.
  - `AnaliseVisor` e `PainelRevisao` passam a receber `detalheEfetivo` (o visor não muda com a
    conclusão, mas o `PainelRevisao` deriva `podeEditar` do status — fica read-only).
  - `PainelRevisao` recebe `onResumoChange={setResumoAtual}`.
  - `acao` = quando `detalheEfetivo.status === "PRONTA_PARA_REVISAO"` →
    `<ConcluirAnalise analiseId={detalhe.id} obrigatoriosPendentes={resumoAtual.obrigatoriosPendentes} onConcluida={setDetalheEfetivo} />`; senão `undefined`.
- **`page.tsx`**: deixa de renderizar `<AnaliseHeader>` (vai para o `TelaAnalise`); fica só
  `<AutoRefreshAnalise>` + `<TelaAnalise detalhe={detalhe} />` no `div.coluna`.
- **`PainelRevisao.tsx`**: nova prop `onResumoChange?: (r: ResumoAnalise) => void`. Dispara:
  - uma vez no mount (`useEffect(() => onResumoChange?.(resumo), [])` — só o valor inicial), e
  - dentro de `aplicarRevisao`, depois do `setResumo(rs)`, `onResumoChange?.(rs)`.
  - (Sem `useEffect([resumo])` para não disparar em loop; os dois pontos cobrem os casos.)

#### Testes (`frontend/test/unit/`)

Ver §7.1.

### Fora do escopo

- **Baixar o relatório PDF** da análise concluída — **RF-016** (esta slice pode deixar um
  espaço/rótulo "relatório em RF-016", mas sem ação).
- Reabrir uma análise `CONCLUIDA` (fora do MVP).
- Os modais intermediários de "etapa concluída" (checklist/técnica) do protótipo — aqui a
  conclusão é única.
- Mudar a forma como o `PainelRevisao` guarda `overrides`/`resumo` (só adiciona o `onResumoChange`).
- Persistir a conclusão sem backend (a fixture é andaime).
- Barra de progresso global nova; o `resumo` já dá `verificados/total` e `obrigatoriosPendentes`.

## 4. Contexto consultado

- `docs/product/prd.md` — RF-012 (conclusão numa confirmação), RF-013 (responsável + datas),
  RF-015 (sem aprovação/assinatura/dupla revisão), §8
- `docs/engineering/specs/010-conclusao-analise.tsd.md` — `POST /analises/:id/concluir`
  (`@HttpCode 200`): `404` / `CONCLUIDA` → `200` idempotente / `≠ PRONTA_PARA_REVISAO` → `409`
  / obrigatório não verificado → `422` `{ message, requisitosPendentes: RequisitoPendente[] }`
  / senão transição atômica → `CONCLUIDA` + `concluidaEm`, devolve `AnaliseDetalhe` completo.
  Trava **só por `verificado`** (obrigatório `NAO_SE_APLICA` não verificado também bloqueia).
- `backend/src/analises/analises.service.ts` (`concluir`) + `conclusao-analise.ts`
  (`RequisitoPendente = { requisitoId, codigo, titulo, area }`) — conferido no `main`
- `docs/engineering/specs/016/019` — `AlterarParecerModal` (padrão de modal/portal/A11y),
  `AnaliseConflitoError`, `podeEditar`, `overrides`/`resumo`, `aplicarRevisao`, `TelaAnalise`
- `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/CompletionModal.tsx` — o
  modal de conclusão do protótipo (título + texto + confirmar). O protótipo dispara vários ao
  longo do checklist; aqui é **um só**, no fim.

## 5. Impacto esperado

- **Produto:** o analista fecha a análise numa ação, com trava clara pelos obrigatórios — o
  parecer final fica registrado e a análise vira consulta.
- **Arquitetura:** primeiro `POST` de ação sem corpo; `TelaAnalise` assume a orquestração do
  `detalhe` efetivo (conclusão) e do `resumo` corrente (gate do botão), tirando o `AnaliseHeader`
  do `page.tsx`.
- **Implementação:** `concluirAnalise` no gateway (2 impls + contrato) + `ConcluirAnalise` +
  `onResumoChange` no `PainelRevisao` + `acao` no `AnaliseHeader`.
- **Testes:** contrato + fixtures + 2 componentes + `TelaAnalise`.
- **Documentação:** roadmap, checkpoint, `.ai-dev/audit.md`, `frontend/README.md`, evidência
  visual; `questoes-abertas.md` P-01/P-02 já anotadas pelo backend.
- **Operação:** sem deploy.

## 6. Plano de implementação

1. `types.ts` (`RequisitoPendente`) + `analises-gateway.ts` (assinatura + `AnaliseRequisitosPendentesError`) + `index.ts`.
2. `http-analises-gateway.ts` (`concluirAnalise`) + contrato.
3. `fixtures-analises-gateway.ts` (`concluirAnalise`) + unit.
4. `PainelRevisao.tsx` — `onResumoChange`.
5. `AnaliseHeader.tsx` — prop `acao`.
6. `ConcluirAnalise.tsx` (+ CSS) + teste de componente.
7. `TelaAnalise.tsx` — `detalheEfetivo` + `resumoAtual` + move o header; `page.tsx` enxuga.
8. Testes de `TelaAnalise`.
9. `npm run ci`; smoke conjunto (backend NestJS real); screenshots vs protótipo.
10. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, `frontend/README.md`, evidência visual.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo                                                   | Aplica-se?                                                | Justificativa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitário                                               | Sim                                                       | `FixturesAnalisesGateway.concluirAnalise` (`CONCLUIDA` → idempotente; `≠ PRONTA` → `409`; obrigatórios pendentes → `AnaliseRequisitosPendentesError` com a lista; sem pendentes → detalhe `CONCLUIDA` + `concluidaEm`, não persiste). Componentes: `ConcluirAnalise` (botão desabilitado + motivo quando `obrigatoriosPendentes > 0`; habilitado quando `0`; clicar abre o modal; "Concluir" chama o gateway; sucesso → `onConcluida(detalhe)`; `422` → lista `codigo — titulo` e mantém aberto; `409`/`404` → mensagem). `TelaAnalise` (verificar o último obrigatório via `PainelRevisao` habilita o botão; após concluir com sucesso o badge vira "Concluída", some o botão e "Alterar parecer"/checkbox/editor de página ficam read-only). `PainelRevisao` (`onResumoChange` dispara no mount e após um toggle de "verificado", com o `resumo` novo). |
| Contrato (formato entre serviços)                      | Sim                                                       | `HttpAnalisesGateway.concluirAnalise` com `fetch` dublê: `POST` em `${base}/analises/${id}/concluir` sem corpo; sucesso → `validarAnaliseDetalhe`; `422` com `{ message, requisitosPendentes:[{requisitoId,codigo,titulo,area}] }` → `AnaliseRequisitosPendentesError` cujo `.pendentes` é essa lista; `409` → `AnaliseConflitoError`; `404` → `AnaliseNaoEncontradaError`; malformado/rede → `AnalisesGatewayError`. Espelha `POST /analises/:id/concluir` (TSD-010).                                                                                                                                                                                                                                                                                                                                                                                    |
| Integração (módulos/camadas reais)                     | Não nesta slice                                           | Sem backend nos testes automáticos; costuras testadas isoladas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Smoke/validação manual contra dependência externa real | **Sim** (o backend real roda nesta máquina — Postgres 17) | Subir NestJS + frontend com `NEXT_PUBLIC_API_BASE_URL`; abrir uma análise `PRONTA_PARA_REVISAO`: (a) com obrigatório pendente → botão desabilitado; verificar todos → habilita; (b) concluir → `200`, tela vira `CONCLUIDA`, tudo read-only, `concluidaEm` no header; (c) tentar `POST` de novo → `200` idempotente. Registrar no ciclo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

Slice de interface: **screenshots** do botão bloqueado (com o motivo), do modal de
confirmação, da tela após concluir (badge "Concluída" + read-only), e do `422` com a lista de
pendentes.

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run ci
```

## 8. Critérios de aceite

- [ ] Numa análise `PRONTA_PARA_REVISAO` com `obrigatoriosPendentes > 0`, o botão "Concluir análise" aparece **desabilitado** com o texto do motivo.
- [ ] Verificar o último obrigatório (RF-011) **habilita** o botão sem reload (o gate usa o `resumo` corrente da sessão, via `onResumoChange`).
- [ ] Clicar abre um modal de confirmação; "Concluir" chama `POST /analises/:id/concluir` via `AnalisesGateway.concluirAnalise` (nenhum componente fala HTTP direto).
- [ ] **Sucesso** → a tela reflete `CONCLUIDA` **sem reload**: badge "Concluída", "Concluída em" no header, e "Alterar parecer" / checkbox de "verificado" / editor de página ficam read-only (via `podeEditar`).
- [ ] **`422`** → o modal lista os `requisitosPendentes` do backend (`codigo — titulo`) e continua aberto; a análise segue `PRONTA_PARA_REVISAO`. **`409`/`404`/rede** → mensagem clara no modal.
- [ ] Numa análise `CONCLUIDA`, o botão "Concluir análise" **não aparece**.
- [ ] `HttpAnalisesGateway` e `FixturesAnalisesGateway` implementam `concluirAnalise`; a fixture **não persiste** (andaime — §9).
- [ ] Nenhuma mudança de contrato; `npm run ci` verde; sem regressão em RF-008/011/014/017.
- [ ] §10 revisada; screenshots em `frontend/docs/visual-reference/rf-012/`; **smoke conjunto contra o NestJS real** registrado.

## 9. Riscos e decisões abertas

### Decisões da slice (a validar)

- **Botão no cabeçalho** (`AnaliseHeader`, ao lado do status), não num rodapé fixo nem dentro
  do painel de revisão. É a ação global da tela — fica perto do status que ela muda. Alternativa
  (rodapé fixo dos dois painéis) descartada por acrescentar cromo.
- **Gate pelo `resumo` corrente da sessão** (`obrigatoriosPendentes` que o `PainelRevisao`
  recalcula ao marcar "verificado"), não só pelo `detalhe.resumo` do servidor. Assim marcar o
  último obrigatório habilita o botão na hora. O backend ainda revalida (o `422` cobre a corrida).
- **Conclusão aplicada em estado de client** (`detalheEfetivo` no `TelaAnalise`), não
  `router.refresh()`. Consistente com RF-008/011/014: o `POST` devolve o `AnaliseDetalhe`
  `CONCLUIDA` e a tela troca. Com backend real um refresh também traria `CONCLUIDA`; com
  fixtures, a conclusão é de sessão (andaime).
- **`AnaliseHeader` migra do `page.tsx` para o `TelaAnalise`** para o cabeçalho reagir à
  conclusão (badge + "Concluída em"). `page.tsx` fica só com `AutoRefreshAnalise` + `TelaAnalise`.
- **Sem toast de sucesso** (padrão das slices anteriores); a mudança do badge + o read-only já
  sinalizam. Um lugar reservado para "baixar relatório" (RF-016) pode entrar como texto
  desabilitado, ou ficar totalmente para o RF-016 — **fica para o RF-016** (nada nesta slice).
- **Modal de confirmação seguindo o `CompletionModal` de alta fidelidade** (instrução do
  usuário, 02/09/2026): card central com o círculo `--color-brand-muted` + ícone de check,
  `<h2>` de título, `<p>` de texto e 2 botões ("Cancelar" / "Concluir"). A11y (`role="dialog"`,
  foco, Escape, `overflow:hidden` no body) reaproveitada do `AlterarParecerModal`. Sem checkbox
  "não perguntar de novo".

### Riscos remanessantes

- **`onResumoChange` no mount**: um `useEffect(() => onResumoChange?.(resumo), [])` dispara com
  o valor inicial — o `TelaAnalise` já inicia `resumoAtual` com `detalhe.resumo`, então é
  redundante mas inofensivo; mantém o fluxo explícito quando o `PainelRevisao` remonta.
- **Corrida real** (dois analistas — fora do MVP, analista único): o `422` do backend com a
  lista cobre; o botão pode aparecer habilitado e a conclusão falhar com a lista.
- **`detalheEfetivo` vs polling**: `AutoRefreshAnalise` só roda em `PENDENTE`/`PROCESSANDO`;
  numa `PRONTA_PARA_REVISAO` o `detalhe` não muda sozinho, então `detalheEfetivo` sobrevive.
- **Análise que entra `CONCLUIDA` já do servidor** (aberta depois de concluída noutra aba):
  `detalheEfetivo.status === "CONCLUIDA"` → sem botão, tudo read-only. Coberto.
- **`requisitosPendentes` ausente no corpo do 422** (backend mudar o formato): o gateway cai
  para `pendentes: []` e o modal mostra só a mensagem genérica — degrada com elegância.

## 10. Referências visuais

Referência: `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/CompletionModal.{tsx,module.css}`.

| ID     | Papel na aplicação            | Link/localização                                  | Nome na origem    | Estados representados                                              | Status de inspeção                                                                    |
| ------ | ----------------------------- | ------------------------------------------------- | ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| REF-10 | Modal de conclusão da análise | `.../components/CompletionModal.{tsx,module.css}` | `CompletionModal` | aberto (círculo+check, título, texto, ações); erro `422` com lista | Inspecionado 02/09/2026 — enquadramento OK (`frontend/docs/visual-reference/rf-012/`) |

Do protótipo: `CompletionModal` é um card central com ícone, título, um parágrafo e um botão
de confirmação (o protótipo usa vários — "Não-conformes verificados!", "Checklist concluído!"
— para guiar o fluxo). Reaproveitar o **enquadramento** (overlay + card + título + texto +
ações), com **um** modal de confirmação de conclusão. O botão "Concluir análise" em si não
existe no protótipo como elemento fixo — é acréscimo desta slice (a conclusão do protótipo é
implícita ao marcar tudo).

**Divergências intencionais a registrar:** conclusão **única** (não uma cadeia de modais por
etapa); botão explícito no cabeçalho com trava por obrigatórios + motivo; a lista de
`requisitosPendentes` no `422` é acréscimo (o protótipo não falha); **duas** ações no modal
(Cancelar / Concluir) em vez do botão único do protótipo — é uma confirmação de ação
irreversível. O círculo com o ícone de check **é** mantido (alta fidelidade ao `CompletionModal`).

Screenshots obrigatórios: botão desabilitado com o motivo; modal de confirmação; tela após
concluir (badge "Concluída" + "Concluída em" + read-only); `422` com a lista de pendentes.
Evidência em `frontend/docs/visual-reference/rf-012/`.

## 11. Rollback

Só `frontend/`. Rollback = remover `ConcluirAnalise`, `concluirAnalise` das duas implementações
do gateway e o `AnaliseRequisitosPendentesError`; reverter `TelaAnalise` (sem `detalheEfetivo`/
`resumoAtual`, o `AnaliseHeader` volta ao `page.tsx`), `AnaliseHeader` (tira `acao`) e
`PainelRevisao` (tira `onResumoChange`); apagar os testes desta slice. Nenhum contrato/tipo de
backend muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (020), a TSD-010 (backend) e a
TSD-016/019 (frontend) e o checkpoint. Implemente só o escopo, em frontend/, na branch
frontend/rf-012-conclusao. Não faça merge sem instrução.

Camada de dados: AnalisesGateway.concluirAnalise(analiseId) → AnaliseDetalhe;
AnaliseRequisitosPendentesError (422, com .pendentes: RequisitoPendente[]). Http: POST
{base}/analises/{id}/concluir sem corpo; 422 → parseia requisitosPendentes; 409 →
AnaliseConflitoError; 404 → AnaliseNaoEncontradaError; sucesso → validarAnaliseDetalhe.
Fixtures: idempotente se CONCLUIDA; 409 fora de PRONTA; pendentes (obrigatorio && !verificado)
→ erro com a lista; senão detalhe CONCLUIDA + concluidaEm; NÃO persiste.

UI: ConcluirAnalise (client) — botão no header (via prop `acao` do AnaliseHeader),
disabled quando obrigatoriosPendentes>0 + motivo; modal de confirmação (esqueleto do
AlterarParecerModal); "Concluir" → gateway; sucesso → onConcluida(detalhe); 422 lista
codigo—titulo. TelaAnalise: detalheEfetivo (trocado na conclusão) + resumoAtual (de
onResumoChange do PainelRevisao) + move o AnaliseHeader pra dentro; page.tsx enxuga.
PainelRevisao: onResumoChange no mount e em aplicarRevisao.

Escreva os testes previstos (§7.1). Rode npm run ci e registre a saída. Rode o smoke
conjunto contra o NestJS real (Postgres 17 desta máquina) e registre. Screenshots
(botão bloqueado / modal / concluída / 422 com lista) vs protótipo. Rode o Agente
Crítico. Atualize roadmap, checkpoint, .ai-dev/audit.md, frontend/README.md. Push da
branch + merge na main + push da main.
```
