# TSD — Modal "Alterar parecer" na tela de análise (RF-008, frontend)

---
title: TSD - Alterar parecer do requisito (RF-008, frontend)
type: tsd
status: implementada
created: 01/09/2026 // Vinicius
updated: 01/09/2026 // Vinicius
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/008-revisao-requisito.tsd.md
- docs/engineering/specs/013-tela-analise-frontend.tsd.md
- docs/engineering/specs/014-status-ia-frontend.tsd.md
- docs/engineering/specs/015-filtros-status-frontend.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

Primeira **escrita** da tela de análise. Cada `RequisitoItem` ganha uma ação
**"Alterar parecer"** que abre um modal para escolher o novo `statusFinal` e escrever o
comentário que o justifica. Confirmar chama `PATCH /analises/:id/requisitos/:requisitoId`
(contrato TSD-008) e o `PainelRevisao` aplica o `{ item, resumo }` devolvido **na hora** —
sem recarregar a página: lista, badges de IA (RF-007), filtros (RF-009) e barra de progresso
reavaliam.

Sem mudança de contrato. O endpoint já existe (backend `ad2e8cd`).

**User Story de origem:** `docs/product/roadmap.md`, RF-008 — bloco "User Story (frontend — RF-008)".

## 2. Objetivo técnico

- Camada de dados: `AnalisesGateway.revisarRequisito(analiseId, requisitoId, patch)` →
  `{ item: AvaliacaoItem; resumo: ResumoAnalise }`; erros tipados `422`/`409`/`404`.
  Implementações `Http` (PATCH JSON + validação de formato + mapeamento de status) e
  `Fixtures` (aplica as mesmas regras de resolução de forma pura; **não persiste** — andaime).
- `validarAlteracaoParecer(entrada)` puro na camada de dados: parecer obrigatório e ≠ atual;
  comentário obrigatório (sempre, neste fluxo) e, em espelho da R-06, obrigatório quando o
  novo parecer ≠ `statusSugeridoIa`.
- `AlterarParecerModal` (client, portal) — bloco "Parecer atual" (só leitura) + "Novo parecer"
  (select dos 3 status menos o atual + textarea de comentário); estados enviando / erro do
  servidor; A11y de diálogo (foco, Escape, `aria-modal`).
- `RequisitoItem` ganha `onAlterarParecer?`; renderiza o botão quando o callback vem.
- `PainelRevisao` passa a ser *stateful* nas avaliações: `overrides: Map<idAvaliacao, AvaliacaoItem>`
  + `resumo` corrente; aplica os overrides antes de separar por aba / filtrar; abre e fecha
  o modal (uma instância).
- Testes: unit de `validarAlteracaoParecer`; contrato de `revisarRequisito` (Http, sucesso +
  422/409/404 + formato inesperado); Fixtures (regras de resolução); componente do
  `AlterarParecerModal`; componente do `PainelRevisao` (aplica override + resumo, respeita o
  filtro RF-009, mostra erro do servidor).
- `npm run ci` verde; screenshots (modal aberto; erro de validação; lista após alterar).

## 3. Escopo

### Incluído

#### Camada de dados (`src/lib/data/`)

- **`types.ts`**:
  - `AlteracaoParecerInput = { statusFinal: StatusRequisito; comentario: string }`
    (o fluxo do frontend sempre manda os dois; `verificado`/`paginaReferencia` não entram aqui).
  - `RevisaoRequisitoResultado = { item: AvaliacaoItem; resumo: ResumoAnalise }`.
- **`analises-gateway.ts`**:
  - `AnalisesGateway.revisarRequisito(analiseId: string, requisitoId: string, patch: AlteracaoParecerInput): Promise<RevisaoRequisitoResultado>`.
  - Novo erro `AnaliseConflitoError extends AnalisesGatewayError` (`409` — análise fora de
    `PRONTA_PARA_REVISAO`). `422` reusa `AnaliseValidacaoError` (já carrega `motivos`);
    `404` reusa `AnaliseNaoEncontradaError`.
- **`alterar-parecer.ts`** (novo):
  - `PARECER_OPCOES: StatusRequisito[]` = os 3 valores (a UI filtra o atual).
  - `validarAlteracaoParecer(e: { statusFinal: StatusRequisito | ""; statusAtual: StatusRequisito; statusSugeridoIa: StatusRequisito; comentario: string }): { ok: boolean; erros: { statusFinal?: string; comentario?: string } }`:
    - `statusFinal` vazio → erro; `statusFinal === statusAtual` → erro ("escolha um parecer diferente do atual").
    - `comentario.trim() === ""` → erro ("comentário é obrigatório").
    - (a regra R-06 fica coberta porque o comentário é sempre exigido neste modal; a função
      ainda expõe `divergeDaSugestao` para a mensagem ser específica quando `statusFinal ≠ statusSugeridoIa`.)
- **`http-analises-gateway.ts`**:
  - `revisarRequisito`: `PATCH ${base}/analises/${id}/requisitos/${requisitoId}`,
    `content-type: application/json`, corpo `{ statusFinal, comentario }`.
    `resp.status === 422` → `AnaliseValidacaoError(motivos)`; `409` → `AnaliseConflitoError`;
    `404` → `AnaliseNaoEncontradaError`; outro não-ok → `AnalisesGatewayError`.
    Sucesso → `validarRevisaoResultado(json)`.
  - `validarRevisaoResultado(corpo): RevisaoRequisitoResultado` (exportado) — reusa os helpers
    `lerItem`/`lerResumo` já existentes no arquivo.
- **`fixtures-analises-gateway.ts`**:
  - `revisarRequisito`: acha o `AnaliseDetalhe` (explícito ou sintetizado); `404` se análise
    ou avaliação não existir; `409` se `status !== "PRONTA_PARA_REVISAO"`; aplica
    `resolverAlteracaoParecer` (abaixo) e devolve `{ item, resumo }` recalculado com
    `calcularResumo`. **Não grava** — a próxima `abrirAnalise` volta ao estado das fixtures
    (andaime coerente com TSD-012 §9; documentado no §9).
- **`alterar-parecer.ts`** também exporta `resolverAlteracaoParecer(atual: AvaliacaoItem, patch: AlteracaoParecerInput): AvaliacaoItem`:
  `statusFinal` do patch; `verificado = true` (RF-011 — alterar status verifica);
  `comentario = patch.comentario.trim()`. Puro; usado pela fixture e pelos testes.
- **`index.ts`**: exporta os novos símbolos e o erro.

#### Componentes (`src/components/analise/`)

- **`AlterarParecerModal.tsx`** (+ `.module.css`, client) — `createPortal`:
  - Props: `{ analiseId: string; item: AvaliacaoItem; onFechar(); onAlterado(resultado: RevisaoRequisitoResultado) }`.
  - Estado: `statusFinal` (`"" | StatusRequisito`), `comentario`, `enviando`, `erroServidor`.
  - "Parecer atual": requisito + `StatusBadgeRequisito` do `item.statusFinal` (só leitura).
  - "Novo parecer": `<select>` com `PARECER_OPCOES` menos `item.statusFinal`; `<textarea>` de
    comentário. Dica curta abaixo do select quando a escolha diverge da IA
    ("A IA sugeriu <X>; explique a mudança.").
  - Confirmar: desabilitado enquanto `!validarAlteracaoParecer(...).ok || enviando` — como o
    botão desabilitado já é o sinal de "inválido" (idem protótipo), **não há erro inline por
    campo**; só a faixa de erro do servidor. No clique:
    `getAnalisesGateway().revisarRequisito(analiseId, item.requisitoId, { statusFinal, comentario })`.
    Sucesso → `onAlterado(resultado)` (o pai fecha). `AnaliseValidacaoError` → `erroServidor =
    motivos[0]`, modal aberto, dados preservados. `AnaliseConflitoError` → mensagem "Esta
    análise não está mais em revisão." `AnaliseNaoEncontradaError` → "Requisito não encontrado."
    `AnalisesGatewayError` → mensagem genérica.
  - A11y: `role="dialog"` `aria-modal` `aria-labelledby`; foco inicial no select; Escape fecha
    (exceto enviando); `overflow: hidden` no body enquanto aberto. (Mesmo padrão do
    `NovaAnaliseModal`.)
- **`RequisitoItem.tsx`**:
  - Nova prop opcional `onAlterarParecer?: () => void`. Quando presente, renderiza um botão
    "Alterar parecer" no rodapé do bloco expandido (e some o texto "SOMENTE LEITURA" do
    comentário do arquivo). O checkbox de "verificado" continua desabilitado (RF-011).
- **`PainelRevisao.tsx`**:
  - `const [overrides, setOverrides] = useState<Map<string, AvaliacaoItem>>(new Map())` — chave =
    `item.id` (id da avaliação).
  - `const [resumo, setResumo] = useState(detalhe.resumo)`; `overrides`/`resumo` são zerados
    **só quando `detalhe.id` muda** (troca de análise) — padrão de estado derivado no render
    (`if (detalhe.id !== analiseId) { setAnaliseId(...); reset }`). Um refetch por mudança de
    filtro (RF-009 usa `router.replace`, que dispara novo RSC) traz um `detalhe` novo com o
    mesmo id e **não** descarta o que o analista já revisou.
  - `aplicarOverrides(grupos)` mapeia cada item para `overrides.get(item.id) ?? item` antes de
    `separarPorAba` / `filtrarPorStatus`. As contagens das abas e o progresso passam a sair de
    `resumo` (estado), não de `detalhe.resumo`.
  - `const [parecerDe, setParecerDe] = useState<AvaliacaoItem | null>(null)` — item em edição;
    `RequisitoItem` recebe `onAlterarParecer={() => setParecerDe(itemEfetivo)}`.
  - `<AlterarParecerModal>` renderizado quando `parecerDe`; `onAlterado={({item, resumo}) => {
    setOverrides(m => new Map(m).set(item.id, item)); setResumo(resumo); setParecerDe(null); }}`.
- **`index` de componentes**: nenhum barrel; imports diretos.

#### Testes (`frontend/test/unit/`)

Ver §7.1.

### Fora do escopo

- Marcar/desmarcar "verificado" manualmente — **RF-011** (o checkbox segue desabilitado; só
  `statusFinal` alterado o liga, via backend).
- Campo de comentário fora do fluxo "alterar parecer"; edição de `paginaReferencia` — **RF-017
  amplo / RF-014**.
- Concluir a análise / trava por obrigatórios — **RF-012**.
- Persistir a alteração entre reloads sem backend real (a fixture é andaime).
- Histórico/auditoria de alterações de parecer (P-02).
- Otimistic UI antes da resposta do servidor (aplica só no sucesso).
- Toast global de sucesso (o fechamento do modal + a lista atualizada já sinalizam; um toast
  pode entrar junto do RF-012).

## 4. Contexto consultado

- `docs/product/prd.md` — RF-008 ("definir/alterar o parecer"), RF-017 (comentário), RF-011
  (verificado), §8 (regras de revisão), §9 (erro de persistência → mensagem)
- `docs/architecture/sdd.md` — §7 "Revisar requisito" (contrato do PATCH), §8 `avaliacao_requisito`
- `docs/engineering/specs/008-revisao-requisito.tsd.md` — corpo `{ statusFinal?, verificado?, comentario? }`,
  regra R-06, `verificado=true` ao mudar status, `409`/`404`/`422`, resposta `{ item, resumo }`
- `docs/engineering/specs/013/014/015-*-frontend` — `PainelRevisao`, `RequisitoItem`,
  `StatusIaResumo`, `divergeDaIa`, `filtrarPorStatus`, `calcularResumo`
- `docs/product/questoes-abertas.md` — R-06 (P-03), P-10 (analista único)
- `docs/product/glossario.md` — "Parecer", "Status do requisito", "Verificado"
- `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/ChangeOpinionModal.{tsx,module.css}`
  — `.overlay`/`.modal`/`.section`/`.card`/`.form`/`.select`/`.textarea`/`.footer`; parecer
  atual read-only + novo parecer; opções excluem o status atual; confirmar exige parecer +
  comentário. **Divergência:** o protótipo tem o campo "Página no documento" — fica para RF-014.
- `Prototipo .../components/AnalysisPanel.tsx` — `overrides: Map`, `effectiveItem`, o item
  migra para o novo parecer já verificado sem trocar o filtro (comportamento que replicamos).

## 5. Impacto esperado

- **Produto:** o analista finalmente **decide** — altera o parecer da IA com justificativa e vê
  o efeito imediato na revisão (progresso, filtros, divergência).
- **Arquitetura:** primeira mutação da tela; o `AnalisesGateway` ganha um método de escrita; o
  `PainelRevisao` passa a ter estado de sessão (overrides) sobre os dados do servidor.
- **Implementação:** `alterar-parecer.ts` + `AlterarParecerModal` + método no gateway (2 impls
  + contrato) + `PainelRevisao` stateful + botão no `RequisitoItem`.
- **Testes:** unit (validação/resolução), contrato (Http), fixtures, 2 componentes.
- **Documentação:** roadmap (RF-008 frontend), checkpoint, `.ai-dev/audit.md`, evidência visual,
  `frontend/README.md`.
- **Operação:** sem deploy.

## 6. Plano de implementação

1. `types.ts` + `analises-gateway.ts` (assinatura + `AnaliseConflitoError`) + `index.ts`.
2. `alterar-parecer.ts` (`PARECER_OPCOES`, `validarAlteracaoParecer`, `resolverAlteracaoParecer`) + unit.
3. `http-analises-gateway.ts` (`revisarRequisito` + `validarRevisaoResultado`) + contrato.
4. `fixtures-analises-gateway.ts` (`revisarRequisito`) + unit.
5. `AlterarParecerModal.tsx` (+ CSS) + teste de componente.
6. `RequisitoItem.tsx` (botão + prop) — ajustar testes existentes.
7. `PainelRevisao.tsx` (overrides + resumo + modal) + testes (override aplicado, resumo,
   filtro RF-009, erro do servidor).
8. `npm run ci`; screenshots (modal; erro; lista após alterar) vs protótipo.
9. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, `frontend/README.md`, evidência visual.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `validarAlteracaoParecer` (parecer vazio / igual ao atual / comentário vazio / caso válido; `divergeDaSugestao` para a mensagem). `resolverAlteracaoParecer` (usa `statusFinal` do patch, liga `verificado`, faz `trim` no comentário; não muta a entrada). `FixturesAnalisesGateway.revisarRequisito` (200 aplica a regra e recalcula `resumo`; `404` avaliação/analise inexistente; `409` fora de `PRONTA_PARA_REVISAO`). Componentes: `AlterarParecerModal` (select sem o status atual; Confirmar desabilitado sem parecer/ comentário; sucesso chama `onAlterado` com `{item,resumo}`; `422` mostra `motivos[0]` e mantém aberto e os dados; `409`/`404` mensagem). `PainelRevisao` (após `onAlterado`: o item mostra o novo badge, o progresso e a contagem de aba mudam pelo `resumo`; se o filtro ativo é "Não conforme" e o item deixou de ser, ele some da lista — RF-009; a legenda/telas de processando/erro seguem iguais). `RequisitoItem` (o botão "Alterar parecer" só aparece com o callback). |
| Contrato (formato entre serviços) | Sim | `HttpAnalisesGateway.revisarRequisito` com `fetch` dublê: envia `PATCH` na URL certa com `{ statusFinal, comentario }`; parseia `{ item, resumo }` (reusa `lerItem`/`lerResumo`); mapeia `422 → AnaliseValidacaoError` (com `motivos`), `409 → AnaliseConflitoError`, `404 → AnaliseNaoEncontradaError`, JSON inesperado / não-ok → `AnalisesGatewayError`. Espelha o contrato de `PATCH /analises/:id/requisitos/:requisitoId` da TSD-008. |
| Integração (módulos/camadas reais) | Não nesta slice | Sem backend; a cadeia modal→gateway(fixtures)→painel é coberta pelos testes de componente com o gateway real de fixtures. |
| Smoke/validação manual contra dependência externa real | Não | Sem ambiente conjunto com o backend ainda (segue como follow-up já listado no checkpoint). |

Slice de interface: **screenshots** do modal aberto (parecer atual + novo parecer), do estado
de erro de validação, e da lista/painel logo após uma alteração (badge novo + progresso
mexido); comparação com o `ChangeOpinionModal` do protótipo (sem o campo de página).

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run ci
```

## 8. Critérios de aceite

- [x] Cada `RequisitoItem` tem uma ação **"Alterar parecer"** que abre o modal com o **parecer atual** visível (requisito + status, só leitura).
- [x] O modal tem um **select** com os 3 status **menos o atual** e um **textarea de comentário**; "Confirmar" fica desabilitado até haver um parecer escolhido e um comentário não vazio.
- [x] Confirmar chama `PATCH /analises/:id/requisitos/:requisitoId` com `{ statusFinal, comentario }` via `AnalisesGateway.revisarRequisito` (nenhum componente fala HTTP direto).
- [x] No **sucesso**: o modal fecha; o item passa a mostrar o novo `statusFinal` (badge), a divergência da IA (RF-007) reavalia, o item entra/sai da lista conforme o filtro ativo (RF-009), e a **barra de progresso** e as **contagens das abas** se ajustam pelo `resumo` devolvido — **sem recarregar a página**.
- [x] `422` → mensagem do backend no modal, **modal continua aberto**, campos preservados. `409` → "análise não está mais em revisão". `404` → "requisito não encontrado". Erro de rede → mensagem genérica.
- [x] Validação client-side espelha a R-06: quando o novo parecer difere da sugestão da IA, o comentário é claramente exigido (neste fluxo ele é sempre exigido).
- [x] O checkbox de "verificado" **continua desabilitado** (RF-011); alterar o status liga `verificado` só porque o backend devolve assim.
- [x] `HttpAnalisesGateway` e `FixturesAnalisesGateway` implementam `revisarRequisito`; a fixture aplica as mesmas regras e **não persiste** (andaime — §9).
- [x] `npm run ci` verde: `eslint .` + prettier, `tsc --noEmit`, testes, `next build`.
- [x] §10 revisada; screenshots (modal / erro / lista após alterar) comparados com o protótipo — `frontend/docs/visual-reference/rf-008/`.

## 9. Riscos e decisões abertas

### Decisões da slice (a validar)

- **Aplicação imediata via estado de sessão (`overrides` no `PainelRevisao`), não `router.refresh()`.**
  Sem backend persistente, um refresh voltaria ao estado das fixtures. O `overrides: Map` +
  `resumo` de estado (padrão do protótipo — `effectiveItem`) faz a tela reagir na hora e
  funciona igual quando houver backend real (o `PATCH` devolve o `{ item, resumo }` que a tela
  aplica). Um refresh manual/polling ainda recarrega do servidor — aceitável (com backend real
  o servidor já teria a alteração; com fixtures, a alteração é de sessão mesmo).
- **O modal manda sempre `{ statusFinal, comentario }`** (não `verificado`, não `paginaReferencia`).
  O `verificado=true` vem do backend. Simplifica o corpo e evita pisar no RF-011/RF-014.
- **O select exclui o status atual** (como o protótipo). "Alterar" pressupõe mudança; manter o
  mesmo status é no-op e o backend nem exigiria comentário. Se o produto quiser "confirmar o
  mesmo parecer com comentário", vira refinamento.
- **Comentário sempre obrigatório neste modal** (não só quando diverge da IA). É a ação de
  "alterar parecer" — pedir a justificativa sempre é a leitura do protótipo e cobre a R-06 com
  folga. A mensagem fica mais específica quando diverge.
- **Sem toast de sucesso** nesta slice (o protótipo tem um `Toast`). O fechamento do modal + a
  lista mexendo já dão o feedback; um toast pode entrar com o RF-012.
- **`AnaliseConflitoError` novo** (409) em vez de reusar `AnalisesGatewayError` genérico — a
  tela precisa distinguir "não está mais em revisão" de erro de transporte.

### Riscos remanescentes

- **Fixtures não persistem:** ao alterar o parecer e depois recarregar `/analise/:id`, a
  mudança some (volta às fixtures). Documentar na evidência visual e no README; é o mesmo
  andaime do RF-001 (criar análise não entra na lista).
- **Override por `item.id` (id da avaliação):** o `PATCH` do backend endereça por
  `requisitoId`; a resposta traz o `item` com `id` (da avaliação). Usar `item.id` como chave do
  override e `item.requisitoId` na URL — atenção para não trocar os dois.
- **Interação com RF-009:** alterar um item para fora do filtro ativo faz ele sumir da lista
  imediatamente. É o comportamento do protótipo ("o item migra para o novo parecer") e está
  coberto por teste; pode surpreender — a barra de progresso mexendo ajuda a explicar.
- **Reinicialização dos overrides:** zerada só quando `detalhe.id` muda (ver §3). O polling (`AutoRefreshAnalise`) só
  roda em `PENDENTE`/`PROCESSANDO`; numa análise `PRONTA_PARA_REVISAO` o `detalhe` não muda
  sozinho, então os overrides sobrevivem. Ainda assim o `useEffect` de reset por identidade de
  `detalhe` cobre um eventual refresh manual.
- **Concorrência:** last-write-wins, igual ao backend. Sem trava otimista no MVP.

## 10. Referências visuais

Referência: `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/ChangeOpinionModal.{tsx,module.css}`.

| ID | Papel na aplicação | Link/localização | Nome na origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| REF-08 | Modal de alteração de parecer | `.../components/ChangeOpinionModal.{tsx,module.css}` | `ChangeOpinionModal` | modal aberto (parecer atual + novo parecer); Confirmar desabilitado | A inspecionar nesta slice |

Do protótipo: overlay escuro central; `.modal` card com header ("Alterar parecer" + X),
`.body` com duas `.section` ("Parecer atual" read-only num `.card` colorido pelo status,
"Novo parecer" num `.card` neutro com `.form`), e `.footer` com "Cancelar" / "Confirmar"
(primário, desabilitado até válido). Select "Parecer" + textarea "Comentário", ambos com
`*`. Reaproveitar os tokens/estrutura; **remover** o campo "Página no documento" (RF-014).

**Divergências intencionais a registrar:** sem campo de página; sem modos "uma página /
intervalo"; sem `Toast` de sucesso nesta slice; o badge do "parecer atual" usa o
`StatusBadgeRequisito` do projeto (3 status, sem "warning"/"com ressalva"). A dica "a IA
sugeriu X" abaixo do select é acréscimo (liga a R-06 ao RF-007), não existe no protótipo.

Screenshots obrigatórios: modal aberto; modal com erro de validação (comentário vazio ou
`422` do backend simulado); painel logo após uma alteração (badge novo + progresso mexido).
Evidência em `frontend/docs/visual-reference/rf-008/`.

## 11. Rollback

Só `frontend/`. Rollback = remover `AlterarParecerModal`, `alterar-parecer.ts`, o método
`revisarRequisito` das duas implementações do gateway e o `AnaliseConflitoError`, reverter
`RequisitoItem` (tira a prop/botão) e `PainelRevisao` (volta a ler `detalhe.resumo` e a não
ter overrides), e apagar os testes desta slice. Nenhum contrato/tipo de backend muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (016), a TSD-008 (backend) e a
TSD-013/014/015 (frontend) e o checkpoint. Implemente só o escopo, em frontend/, na branch
frontend/rf-008-parecer. Não faça merge sem instrução.

Camada de dados: AnalisesGateway.revisarRequisito(analiseId, requisitoId, { statusFinal,
comentario }) → { item, resumo }; AnaliseConflitoError (409); Http (PATCH JSON, mapeia
422/409/404, valida o formato reusando lerItem/lerResumo) + contrato; Fixtures (aplica
resolverAlteracaoParecer, recalcula resumo, NÃO persiste). alterar-parecer.ts:
PARECER_OPCOES, validarAlteracaoParecer, resolverAlteracaoParecer (puros).

UI: AlterarParecerModal (portal, padrão do NovaAnaliseModal; parecer atual read-only +
select sem o status atual + textarea de comentário obrigatório; erros 422/409/404 no
modal). RequisitoItem ganha onAlterarParecer? e o botão. PainelRevisao vira stateful:
overrides Map<idAvaliacao, item> + resumo de estado, aplica antes de separarPorAba/
filtrarPorStatus; uma instância do modal.

Escreva os testes previstos (§7.1). Rode npm run ci e registre a saída real. Screenshots
(modal / erro / lista após alterar) vs protótipo. Rode o Agente Crítico. Atualize roadmap,
checkpoint, .ai-dev/audit.md, frontend/README.md. Push da branch + merge na main + push da
main.
```
