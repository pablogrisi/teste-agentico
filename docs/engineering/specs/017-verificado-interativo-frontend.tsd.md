# TSD — Checkbox de "verificado" interativo na tela de análise (RF-011, frontend)

---
title: TSD - Verificado interativo (RF-011, frontend)
type: tsd
status: implementada
created: 01/09/2026 // Vinicius
updated: 01/09/2026 // Vinicius
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/008-revisao-requisito.tsd.md
- docs/engineering/specs/016-alterar-parecer-frontend.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

O checkbox de "verificado" de cada `RequisitoItem` — hoje desabilitado (RF-010) — passa a ser
operável: clicar alterna `verificado` (true↔false) via `PATCH /analises/:id/requisitos/:requisitoId`
com o corpo `{ verificado }` (contrato TSD-008; **sem comentário** — a R-06 só vale ao mudar
`statusFinal`). O `{ item, resumo }` devolvido é aplicado na hora pelo mesmo mecanismo de
`overrides` + `resumo` de estado do RF-008: a barra de progresso e os contadores acompanham,
nada recarrega.

Sem mudança de contrato. Segundo consumidor do endpoint da TSD-008 (o primeiro é o RF-008).

**User Story de origem:** `docs/product/roadmap.md`, RF-011 — bloco "User Story (frontend — RF-011)".

## 2. Objetivo técnico

- `AnalisesGateway.marcarVerificado(analiseId, requisitoId, verificado): Promise<RevisaoRequisitoResultado>`
  — `PATCH` com `{ verificado }`; mesmos erros tipados `422`/`409`/`404` do `revisarRequisito`.
  Implementações `Http` (PATCH JSON + `validarRevisaoResultado`) e `Fixtures` (aplica só o
  `verificado`, recalcula `resumo`, **não persiste** — andaime).
- `RequisitoItem`: checkbox habilitado quando vem `onToggleVerificado?`; estado local
  `salvando` (desabilita o checkbox durante a chamada) e `erroToggle` (mensagem curta no
  item); no erro, o valor visível volta ao anterior.
- `PainelRevisao`: fornece `onToggleVerificado` ligado ao gateway + aos `overrides`/`resumo`
  já existentes; `podeEditar` (já existe, `status === "PRONTA_PARA_REVISAO"`) gateia.
- Testes: unit/contrato de `marcarVerificado`; `RequisitoItem` (toggle chama a prop; checkbox
  travado durante a chamada; erro mostra mensagem e reverte); `PainelRevisao` (progresso e
  `X/Y verificados` acompanham após o toggle; `CONCLUIDA` → checkbox desabilitado).
- `npm run ci` verde; screenshots (checkbox operável; progresso após marcar; erro).

## 3. Escopo

### Incluído

#### Camada de dados (`src/lib/data/`)

- **`analises-gateway.ts`**: `AnalisesGateway.marcarVerificado(analiseId: string, requisitoId: string, verificado: boolean): Promise<RevisaoRequisitoResultado>`.
  (Reusa `RevisaoRequisitoResultado`, `AnaliseConflitoError`, `AnaliseNaoEncontradaError`,
  `AnaliseValidacaoError`.)
- **`http-analises-gateway.ts`**: `marcarVerificado` → `PATCH ${base}/analises/${id}/requisitos/${requisitoId}`,
  corpo `{ verificado }`, `content-type: application/json`. Mesmo mapeamento de status e
  `validarRevisaoResultado` do `revisarRequisito` — extrair um helper privado
  `patchRevisao(url, body)` que os dois métodos chamam (DRY).
- **`fixtures-analises-gateway.ts`**: `marcarVerificado` → `abrirAnalise`; `409` se não
  `PRONTA_PARA_REVISAO`; `404` se a avaliação não existir; devolve
  `{ item: { ...atual, verificado }, resumo: calcularResumo(gruposAtualizados) }`. **Não grava.**
- **`index.ts`**: nada novo a exportar (o método entra pela interface; os tipos/erros já são exportados).

#### Componentes (`src/components/analise/`)

- **`RequisitoItem.tsx`**:
  - Nova prop opcional `onToggleVerificado?: (verificado: boolean) => Promise<void>`.
  - Quando presente: o `<input type="checkbox">` perde `disabled`/`readOnly`/`tabIndex={-1}`,
    ganha `onChange`. `aria-label` passa a "Marcar como verificado — <título>".
  - Estado local: `salvando` (bool) e `erroToggle` (string | null).
  - `onChange`: `setSalvando(true); setErroToggle(null);` → `await onToggleVerificado(!item.verificado)`;
    no `catch`, `setErroToggle("Não foi possível salvar. Tente de novo.")`; `finally setSalvando(false)`.
  - Enquanto `salvando`, o checkbox fica `disabled`. O valor exibido é sempre `item.verificado`
    (a prop): no sucesso o pai atualiza o `item` (via `overrides`) e o checkbox reflete; no
    erro o `item` não muda, então o checkbox "volta" sozinho.
  - `erroToggle` renderiza um `<p role="alert">` curto no rodapé do item (fora do bloco
    expandido — visível mesmo recolhido).
  - Sem `onToggleVerificado` (ex.: `CONCLUIDA`): comportamento de hoje — checkbox desabilitado.
- **`PainelRevisao.tsx`**:
  - `onToggleVerificado` passado por `ConteudoAba`/`ListaAba` até o `RequisitoItem`, junto do
    `onAlterarParecer` já existente, **só quando `podeEditar`**:
    ```
    onToggleVerificado={podeEditar
      ? async (verificado) => {
          const { item: it, resumo: rs } = await getAnalisesGateway()
            .marcarVerificado(detalhe.id, item.requisitoId, verificado);
          setOverrides((m) => new Map(m).set(it.id, it));
          setResumo(rs);
        }
      : undefined}
    ```
  - O erro **propaga** (o `RequisitoItem` faz o `catch` e mostra a mensagem). O painel não
    precisa de estado novo.
  - Progresso e `X/Y verificados` já saem de `resumo` (estado) desde o RF-008 → acompanham sozinhos.

#### Testes (`frontend/test/unit/`)

Ver §7.1.

### Fora do escopo

- Ação "verificar tudo" / em massa.
- Concluir a análise, botão global bloqueado até tudo verificado — **RF-012**.
- Campo de comentário fora do fluxo "alterar parecer" — **RF-017**.
- Editar `paginaReferencia` / visor de PDF — **RF-014**.
- Optimistic UI (marcar antes da resposta) — ver §9; nesta slice aplica só no sucesso.
- Toast global; histórico de verificação; desfazer com Ctrl+Z.

## 4. Contexto consultado

- `docs/product/prd.md` — RF-011 ("marcar/desmarcar verificado"), RF-012 (`obrigatorio` + trava), §8
- `docs/architecture/sdd.md` — §7 "Revisar requisito" (o mesmo `PATCH`)
- `docs/engineering/specs/008-revisao-requisito.tsd.md` — `verificado` alterna livre quando o
  status não muda; `verificado` **não** dispara a R-06; `409`/`404`; resposta `{ item, resumo }`
- `docs/engineering/specs/016-alterar-parecer-frontend.tsd.md` — `overrides`/`resumo` de estado,
  `revisarRequisito`, `AnaliseConflitoError`, `podeEditar`, andaime das fixtures
- `docs/product/glossario.md` — "Verificado"
- `backend/src/analises/analises.controller.ts` + `revisao-requisito.ts` (conferido no `main`
  pós-RF-016) — `PATCH :id/requisitos/:requisitoId` aceita `{ verificado?: boolean }`, devolve
  `{ item, resumo }`
- `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/ChecklistItem.tsx` — o
  checkbox do protótipo (`onToggleChecked`) alterna o item na hora; sem chamada de rede (é mock)

## 5. Impacto esperado

- **Produto:** o analista controla o progresso da revisão item a item, direto na lista.
- **Arquitetura:** segundo consumidor do `PATCH` da TSD-008; reuso total do mecanismo de
  `overrides`/`resumo` do RF-008 — o painel não ganha estado novo.
- **Implementação:** um método no gateway (2 impls + contrato) + `RequisitoItem` com estado
  local de toggle + fio no `PainelRevisao`.
- **Testes:** unit/contrato do gateway; `RequisitoItem` (toggle/erro/trava); `PainelRevisao` (progresso).
- **Documentação:** roadmap (RF-011 frontend), checkpoint, `.ai-dev/audit.md`, evidência visual,
  `frontend/README.md`.
- **Operação:** sem deploy.

## 6. Plano de implementação

1. `analises-gateway.ts` (assinatura) + `http-analises-gateway.ts` (`marcarVerificado` +
   extrair `patchRevisao`) + contrato.
2. `fixtures-analises-gateway.ts` (`marcarVerificado`) + unit.
3. `RequisitoItem.tsx` — prop, checkbox operável, `salvando`/`erroToggle` + CSS.
4. `PainelRevisao.tsx` — fio do `onToggleVerificado` (só `podeEditar`).
5. Testes (unit + componentes).
6. `npm run ci`; screenshots (operável; progresso após marcar; erro) vs protótipo.
7. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, `frontend/README.md`, evidência visual.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `FixturesAnalisesGateway.marcarVerificado` (aplica só o `verificado`, recalcula `resumo.verificados`/`obrigatoriosPendentes`; `409` fora de `PRONTA_PARA_REVISAO`; `404` avaliação inexistente; não persiste). Componentes: `RequisitoItem` (com `onToggleVerificado`: `onChange` chama a prop com `!item.verificado`; checkbox `disabled` enquanto a promise não resolve; rejeição → `role="alert"` no item e o checkbox reflete de novo `item.verificado`; sem a prop → `disabled`). `PainelRevisao` (após um toggle resolvido, `X/Y verificados` e a largura da barra mudam pelo `resumo` devolvido; `CONCLUIDA` → checkbox desabilitado, sem chamada). |
| Contrato (formato entre serviços) | Sim | `HttpAnalisesGateway.marcarVerificado` com `fetch` dublê: `PATCH` na URL certa, corpo **exatamente** `{ verificado }`, parseia `{ item, resumo }` (mesmo `validarRevisaoResultado`); mapeia `409 → AnaliseConflitoError`, `404 → AnaliseNaoEncontradaError`, `422 → AnaliseValidacaoError`, malformado/rede → `AnalisesGatewayError`. Espelha `PATCH /analises/:id/requisitos/:requisitoId` (TSD-008). |
| Integração (módulos/camadas reais) | Não nesta slice | Sem backend. Cada costura testada isoladamente (spy no gateway nos componentes; fixture real no seu teste). |
| Smoke/validação manual contra dependência externa real | Não | Sem ambiente conjunto (mesmo gap do RF-008 — o backend ainda não habilitou CORS; ver `frontend/README.md`). |

Slice de interface: **screenshots** do checkbox operável (um marcado, um não), do progresso
logo após marcar um item, e do estado de erro (mensagem no item).

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run ci
```

## 8. Critérios de aceite

- [x] Numa análise `PRONTA_PARA_REVISAO`, o checkbox de "verificado" de cada `RequisitoItem` é **operável** (sem `disabled`); numa `CONCLUIDA` fica desabilitado.
- [x] Clicar chama `AnalisesGateway.marcarVerificado(analiseId, requisitoId, !verificadoAtual)` — nenhum componente fala HTTP direto.
- [x] No **sucesso**: o item passa a mostrar o novo `verificado`; a barra de **progresso** e o texto **`X/Y verificados`** (e `obrigatoriosPendentes`, quando exibido) se ajustam pelo `resumo` devolvido — **sem recarregar**.
- [x] Durante a chamada o checkbox fica `disabled` e não aceita novo clique.
- [x] Num erro (`409`/`404`/rede) o checkbox **volta ao valor anterior** e o item mostra uma mensagem curta (`role="alert"`).
- [x] O corpo do `PATCH` é **exatamente** `{ verificado: boolean }` — nunca `statusFinal`/`comentario`.
- [x] Alterar o parecer pelo modal (RF-008) continua marcando `verificado = true` (sem regressão nos testes existentes).
- [x] `HttpAnalisesGateway` e `FixturesAnalisesGateway` implementam `marcarVerificado`; a fixture **não persiste** (andaime — §9).
- [x] `npm run ci` verde: `eslint .` + prettier, `tsc --noEmit`, testes, `next build`.
- [x] §10 revisada; screenshots (operável / progresso após marcar / `CONCLUIDA` desabilitado) — `frontend/docs/visual-reference/rf-011/`. O estado de erro do toggle **não é fotografável com fixtures** (não falham num requisito válido) → coberto por teste de unidade do `RequisitoItem`, não por screenshot.

## 9. Riscos e decisões abertas

### Decisões da slice (a validar)

- **Aplica no sucesso, não optimistic.** Consistente com o RF-008 e com o mecanismo de
  `overrides` (o pai só atualiza o `item` quando o `{ item, resumo }` chega). O checkbox fica
  `disabled` durante a chamada (rápida). Se a latência incomodar, um passo futuro liga o
  optimistic (marca já, reverte no `catch`) — mudança pequena e localizada no `RequisitoItem`.
- **Estado de toggle local ao `RequisitoItem`** (`salvando`/`erroToggle`), não no `PainelRevisao`.
  Cada linha cuida do seu clique; o painel só expõe a função. Menos estado central.
- **Erro inline no item** (`role="alert"`), não toast. Mesma linha do RF-008 (sem toasts nesta
  fase). A mensagem é limpa no **início da próxima tentativa de clique** (`setErroToggle(null)`
  no começo do `onChange`).
- **Método dedicado `marcarVerificado`** em vez de generalizar `revisarRequisito` para um
  `Partial<...>`. Intenção explícita, corpo mínimo, sem risco de mandar `statusFinal` por engano.
- **Sem "verificar tudo"** — o protótipo não tem; e um clique em massa mereceria sua própria
  UX (confirmar, progresso). Fica para depois se o produto pedir.

### Riscos remanescentes

- **Fixtures não persistem:** marcar e recarregar `/analise/:id` volta ao estado das fixtures
  (mesmo andaime do RF-001/RF-008). Documentar na evidência visual.
- **Cliques rápidos em vários itens:** cada `RequisitoItem` trava só o seu próprio checkbox; o
  usuário pode disparar N `PATCH` concorrentes em itens diferentes. Cada resposta faz
  `setOverrides(m => new Map(m).set(it.id, it))` — chaves distintas, sem corrida. O `resumo`,
  porém, é substituído por inteiro a cada resposta: se duas respostas chegam fora de ordem, o
  `resumo` final pode refletir um estado intermediário até o próximo toggle. Aceito no MVP
  (analista único, cliques humanos); com backend real cada resposta traz o `resumo` já
  recalculado do servidor. Anotar como limitação conhecida.
- **Interação com RF-009:** marcar "verificado" **não** muda `statusFinal`, então o item não
  entra/sai do filtro por status — só o progresso muda. Sem efeito surpresa.
- **Duplo submit:** o `disabled` durante `salvando` cobre o clique repetido no mesmo item.

## 10. Referências visuais

Referência: `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/ChecklistItem.tsx`
(+ `.module.css`) — o checkbox à esquerda do título, alterna o item na hora (mock, sem rede).

| ID | Papel na aplicação | Link/localização | Nome na origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| REF-05 | Item de requisito — checkbox de verificado | `.../components/ChecklistItem.{tsx,module.css}` | `ChecklistItem` | não verificado / verificado; item marcado some do foco visual | Inspecionado (RF-010 / TSD-013 §10) |

Do protótipo: checkbox quadrado com check branco sobre fundo da cor da marca quando ativo;
marcar não remove o item (só o progresso sobe). Reaproveitar o `.checkbox` já estilizado no
`RequisitoItem` (hoje só desabilitado) — agora com `:checked` interativo e um `:disabled`
sutil durante o `salvando`.

**Divergências intencionais a registrar:** o protótipo não faz chamada de rede — aqui há um
`PATCH` real; enquanto ele corre o checkbox fica `disabled` (estado que o protótipo não tem).
A mensagem de erro no item é acréscimo (o protótipo nunca falha). Sem "verificar tudo".

Screenshots obrigatórios: lista com um item verificado e outro não (checkbox operável);
progresso logo depois de marcar; análise `CONCLUIDA` com os checkboxes desabilitados. O
estado de erro do toggle não sai com fixtures (elas não falham num requisito válido) — fica
coberto pelo teste de unidade do `RequisitoItem`. Evidência em
`frontend/docs/visual-reference/rf-011/`.

## 11. Rollback

Só `frontend/`. Rollback = remover `marcarVerificado` das duas implementações do gateway,
reverter `RequisitoItem` (checkbox volta a `disabled`, tira `onToggleVerificado`/estado local)
e `PainelRevisao` (tira o fio), apagar os testes desta slice. Nenhum contrato/tipo muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (017), a TSD-008 (backend) e a TSD-016
(frontend) e o checkpoint. Implemente só o escopo, em frontend/, na branch
frontend/rf-011-verificado. Não faça merge sem instrução.

Camada de dados: AnalisesGateway.marcarVerificado(analiseId, requisitoId, verificado) →
{ item, resumo }; Http (PATCH { verificado }, reusa validarRevisaoResultado; extrair
patchRevisao comum a revisarRequisito) + contrato; Fixtures (aplica só o verificado,
recalcula resumo, NÃO persiste; 409/404).

UI: RequisitoItem ganha onToggleVerificado? (Promise); checkbox perde disabled, ganha
onChange; estado local salvando (disabled enquanto corre) e erroToggle (role=alert no item,
some no próximo clique ok); sem a prop segue disabled. PainelRevisao passa o
onToggleVerificado (só quando podeEditar) ligado a marcarVerificado + overrides/resumo já
existentes; erro propaga para o RequisitoItem.

Escreva os testes previstos (§7.1). Rode npm run ci e registre a saída real. Screenshots
(operável / progresso após marcar / erro) vs protótipo. Rode o Agente Crítico. Atualize
roadmap, checkpoint, .ai-dev/audit.md, frontend/README.md. Push da branch + merge na main +
push da main.
```
