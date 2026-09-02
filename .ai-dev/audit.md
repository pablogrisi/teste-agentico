# Auditoria — LicIA Analisadora

Trilha cronológica detalhada de sessões e intervenções, separada do estado resumido do checkpoint. Cada entrada deve ser suficiente para reconstituir o que foi feito, por quê, e o que ficou pendente, sem precisar ler o git log inteiro.

Uma entrada nova a cada sessão relevante (implementação, decisão, investigação, correção de processo). Não é necessário registrar leituras que não geraram mudança.

## Formato sugerido por entrada

```text
## <data> — <resumo curto>

Contexto: <por que essa sessão aconteceu>
Alterações: <o que mudou, com caminhos de arquivo>
Validações: <o que foi executado e o resultado>
Decisões: <decisões tomadas nesta sessão, com link pro decision record se houver>
Pendências: <o que ficou em aberto>
```

---

<!-- Entradas abaixo, da mais recente para a mais antiga -->

## 02/09/2026 — RF-012 / TSD-020: botão "Concluir análise" + modal de confirmação (frontend)

Contexto: 10º ciclo de RF do frontend, na branch `frontend/rf-012-conclusao` (a partir da `main`, off `c02aa88` que já tinha o PM+Engenheiro). Ciclo completo dos 6 papéis, incluindo o subagente `critico`. O usuário validou a User Story + TSD-020 com "Siga o protótipo de alta fidelidade, pode seguir" — o modal segue o enquadramento do `CompletionModal` do protótipo (card central, círculo `--color-brand-muted` + ícone de check, `<h2>`, `<p>`), com 2 ações (Cancelar / Concluir) por ser confirmação irreversível. É o penúltimo RF do MVP frontend; resta só RF-016.

Papéis:

- **PM + Engenheiro** (já em `c02aa88`): User Story do recorte frontend no `roadmap.md` + `docs/engineering/specs/020-conclusao-analise-frontend.tsd.md`.
- **Dev** (`5dc1fca`):
  - `types.ts`: `RequisitoPendente { requisitoId, codigo, titulo, area }`.
  - `analises-gateway.ts`: `AnaliseRequisitosPendentesError extends AnalisesGatewayError` (`readonly pendentes`) + `concluirAnalise(analiseId): Promise<AnaliseDetalhe>` na interface.
  - `http-analises-gateway.ts`: `concluirAnalise` → `POST {base}/analises/{id}/concluir` sem corpo; `422` → `extrairPendentes` (valida item a item, degrada p/ `[]`) → `AnaliseRequisitosPendentesError`; `409` → `AnaliseConflitoError`; `404` → `AnaliseNaoEncontradaError`; `!ok` → `AnalisesGatewayError`; sucesso → `validarAnaliseDetalhe`.
  - `fixtures-analises-gateway.ts`: `concluirAnalise` → `abrirAnalise`; `CONCLUIDA` → idempotente; `!== PRONTA_PARA_REVISAO` → `409`; `obrigatorio && !verificado` → `AnaliseRequisitosPendentesError` com a lista; senão `clonarDetalhe` + `status: CONCLUIDA` + `concluidaEm`. **Não persiste** (andaime).
  - `index.ts`: exporta `AnaliseRequisitosPendentesError` + tipo `RequisitoPendente`.
  - `ConcluirAnalise.tsx` + `.module.css` (novo, client): botão (disabled quando `obrigatoriosPendentes > 0` + `<span role="note">` com o motivo, ligado por `aria-describedby`); modal `createPortal` seguindo o `CompletionModal` (círculo + `CircleCheckIcon` + `<h2>` + `<p>` + Cancelar/Concluir); estados `montado`/`enviando`/`erro`/`pendentes`; A11y `role="dialog"` `aria-modal` `aria-labelledby`, foco no "Concluir" (`useEffect([montado])`), Escape fecha (exceto `enviando`), `overflow:hidden` no body; `422` → `<ul>` `codigo — titulo` e mantém aberto; `409`/`404`/genérico → `role="alert"`.
  - `AnaliseHeader.tsx`: nova prop `acao?: ReactNode` (div `.acoes` com `acao` + `StatusBadge`).
  - `TelaAnalise.tsx`: passa a renderizar o `AnaliseHeader` (movido do `page.tsx`); `detalheEfetivo` (reset por identidade de `detalhe.id`) + `resumoAtual`; `acao = <ConcluirAnalise>` só quando `detalheEfetivo.status === "PRONTA_PARA_REVISAO"`; `AnaliseVisor`/`PainelRevisao` recebem `detalheEfetivo`; `PainelRevisao` recebe `onResumoChange={setResumoAtual}`.
  - `page.tsx`: removido `<AnaliseHeader>` (foi pro `TelaAnalise`).
  - `PainelRevisao.tsx`: nova prop `onResumoChange?: (r: ResumoAnalise) => void` — dispara em `useEffect(…, [])` no mount e dentro de `aplicarRevisao` após `setResumo`.
- **Testes (mecânico)** (`a7f3380`): `npm run ci` ✅ — `eslint .` + prettier, `tsc --noEmit`, **vitest 214 → 240/240 (26 arquivos)**, `next build` (rota `/analise/[id]` ƒ dynamic, 8.54 kB). Novos/ampliados: `http-analises-gateway` (contrato de `concluirAnalise`: POST sem corpo; `422` com/sem lista; `409`/`404`/`500`/rede), `fixtures-analises-gateway` (idempotente / `409` / pendentes com a lista / sucesso não persiste / `404`), `concluir-analise.test.tsx` (novo — bloqueado+motivo+`aria-describedby` / habilitado / abre modal / sucesso → `onConcluida` / `422` lista e mantém aberto / `409` / `404` / Cancelar), `tela-analise` (verificar o último obrigatório habilita e concluir deixa read-only; `CONCLUIDA` sem botão), `painel-revisao` (`onResumoChange` no mount e após toggle), `analise-header` (prop `acao`).
- **Smoke conjunto contra o backend real** — NestJS + PostgreSQL 17 (`:3000`) + frontend buildado com `NEXT_PUBLIC_API_BASE_URL` (`:3201`). Análise real de 12 requisitos / 11 obrigatórios: botão **desabilitado** (11 pendentes) → `PATCH …/requisitos/:id {verificado:true}` em 10/11 + reload → ainda desabilitado (falta 1) → marcar o 11º **pela UI** (checkbox RF-011) → `onResumoChange` → botão **habilita sem reload** → corrida real (`PATCH {verificado:false}` num obrigatório, tela não recarregada) → "Concluir" → **`422`** com `{ requisitosPendentes: [{requisitoId,codigo,titulo,area}] }` → modal lista "TEC-003 — Habilitação técnica proporcional" e segue aberto, análise `PRONTA_PARA_REVISAO` → re-verificar → "Concluir" → **`200`** com o `AnaliseDetalhe` `CONCLUIDA` → tela vira `CONCLUIDA` **sem reload** (badge, "Concluída em 10:34", checkboxes read-only), backend confirmado (`status = CONCLUIDA`, `concluidaEm` gravado). Preflight CORS `OPTIONS` → `204`.
- **Crítico** (subagente `critico`): **APROVADO**, sem bloqueadores. Ajustes após o Crítico (`9d476e4`): foco no "Concluir" num `useEffect([montado])` (o portal não existe no efeito de mount — `focus()` rodava com ref `null`); motivo do bloqueio ligado ao `<button>` por `aria-describedby` + teste `toHaveAccessibleDescription`; plural do motivo simplificado (um sufixo `s`); `ConcluirAnalise` recebe `detalheEfetivo.id`. Não-bloqueadores registrados: `focus()` com ref-null também no `AlterarParecerModal` (follow-up para os dois); em modo fixtures o caminho feliz "verificar → concluir" não fecha (`marcarVerificado` não persiste; só a fixture `"7"` conclui limpo — andaime da §9, caminho real no smoke); `aria-describedby` em `<button disabled>` não é anunciado por todo leitor.
- **Documentador**: TSD-020 (§9 modal de alta fidelidade por instrução do usuário; §10 REF-10 inspecionado 02/09/2026), `roadmap.md` (RF-012 frontend → `implementada — Crítico ✅`; tabela de sequência linha 11; seção RF-012 → Status + "Notas do ciclo (frontend — 02/09/2026)"), checkpoint §1/§2/§3.1/§5/§7, este arquivo, `frontend/README.md`.

Evidência visual: `frontend/docs/visual-reference/rf-012/` — `rf012-botao-bloqueado.png`, `rf012-botao-habilitado.png`, `rf012-modal-confirmacao.png`, `rf012-422-pendentes.png`, `rf012-concluida-readonly.png` + `README.md` (REF-10 / `CompletionModal`; divergências: conclusão única, botão explícito no cabeçalho, 2 ações vs botão único, lista de `requisitosPendentes` no `422`).

Estado: ciclo fechado com Crítico ✅, `npm run ci` verde (240 testes), smoke conjunto contra o NestJS real feito. **Aguardando push da branch `frontend/rf-012-conclusao` + merge na `main`.** Próximo e último frontend: RF-016 (baixar o relatório PDF).

Decisões: modal de alta fidelidade ao `CompletionModal` (instrução do usuário) com 2 ações por ser irreversível; conclusão aplicada em estado de client (`detalheEfetivo`), sem `router.refresh()` (consistente com RF-008/011/014); gate pelo `resumo` corrente da sessão (`onResumoChange`), o backend revalida via `422`.

Pendências: push + merge da branch; RF-016 (último RF do MVP frontend); alinhar o `focus()` do `AlterarParecerModal` com o padrão novo do `ConcluirAnalise`.

## 02/09/2026 — RF-014 / TSD-019: visor de PDF + referência de página + editor (frontend)

Contexto: 9º ciclo de RF do frontend, na branch `frontend/rf-014-visor` (a partir da `main` `bbbf7b8`). Ciclo completo dos 6 papéis, incluindo o subagente `critico`. O usuário aprovou a User Story + TSD e, ao ser questionado sobre as decisões da §9, respondeu: (1) `<iframe>` nativo + `#page=N` "do jeito que melhor encaixar com o backend"; (2) editor inline no requisito — aprovado; (3) wrapper `TelaAnalise` — aprovado; (4) sem PDF nas fixtures (só o aviso) — aprovado, "vou querer testar na hora"; (5) ciclo inteiro (visor + navegação + correção de página) numa slice só — aprovado. Restam RF-012 e RF-016 para o MVP frontend.

Papéis:

- **PM**: User Story do recorte frontend de RF-014 no `roadmap.md` — visor `<iframe>` do PDF real (`GET /analises/:id/pdf`) navegado por `#page=N`; referência de página clicável no requisito; editor inline para corrigir/definir `paginaReferencia` (`PATCH { paginaReferencia }`, sem R-06). **Apresentada e parada.**
- **Engenheiro**: `docs/engineering/specs/019-visor-pdf-frontend.tsd.md` — `AnalisesGateway.urlPdf` + `corrigirPaginaReferencia`; `pagina-referencia.ts`; `AnaliseVisor` + `TelaAnalise` (estado `pagina` compartilhado); props em `PainelRevisao`/`RequisitoItem`. Decisões da slice na §9. **Apresentada e parada.**
- **Dev**: `pagina-referencia.ts` (`validarPaginaReferencia` puro); `analises-gateway.ts` (assinaturas); `http-analises-gateway.ts` (`urlPdf` → `${base}/analises/${id}/pdf`; `corrigirPaginaReferencia` via `patchRevisao` com `{ paginaReferencia }`); `fixtures-analises-gateway.ts` (`urlPdf` → `null`; `corrigirPaginaReferencia` aplica, não persiste); `AnaliseVisor.tsx` + CSS (novo — toolbar + `<iframe key={pagina}>` ou aviso); `TelaAnalise.tsx` + CSS (novo — `useState(1)`, monta visor + `<Suspense><PainelRevisao onIrParaPagina/></Suspense>`); `page.tsx` → `<AnaliseHeader/>` + `<TelaAnalise/>`; `AnaliseVisorPlaceholder` **removido**; `PainelRevisao` (prop `onIrParaPagina`, handler `corrigirPagina`, tipo `AcoesRequisito`); `RequisitoItem` (`LinhaPagina` — "Página N" clicável + editor inline `Editar`/`Definir`).
- **Testes (mecânico)**: `npm run ci` ✅ — `eslint .` + prettier, `tsc --noEmit`, **vitest 186 → 214/214 (24 arquivos)**, `next build` (rota `/analise/[id]` ƒ dynamic, 7.21 kB). Novos: `pagina-referencia`, `analise-visor` (com/sem `urlPdf`, ‹/› nas pontas, campo com clamp), `tela-analise` (clicar na referência move o `#page=` do `<iframe>`), + describes em `http`/`fixtures` gateway e `requisito-item`. **Smoke conjunto**: frontend buildado com `NEXT_PUBLIC_API_BASE_URL` contra um backend **stub** (Node http ~90 linhas no formato do backend + PDF real de 3 páginas com CORS) — o `<iframe>` renderiza o PDF e clicar em "Página 2" no requisito navega o visor para `…/analises/1/pdf#page=2&view=FitH`. O `test:e2e` do backend / o NestJS real não sobem nesta máquina (sem PostgreSQL: `@embedded-postgres` recusa sob usuário admin, sem Docker).
- **Crítico** (subagente `critico`): **APROVADO**, sem bloqueantes. Ajustes após o Crítico: `RequisitoItem` usa a constante `PAGINA_REFERENCIA_VAZIO` (antes exportada e não consumida); + teste `painel-revisao` (CONCLUIDA: "Página N" clicável, sem "Editar"). Follow-up registrado: round-trip contra o NestJS real.
- **Documentador**: TSD-019 (status `implementada` + §8), `roadmap.md` (RF-014 frontend → implementada; tabela linha 10), checkpoint §1/§2/§3.1/§5/§7, este arquivo, `frontend/README.md`.

Evidência visual: `frontend/docs/visual-reference/rf-014/` — `rf014-visor-sem-backend.png`, `rf014-referencia-clicavel.png`, `rf014-editor-pagina.png`, `rf014-smoke-page2.png` (o `<iframe>` renderizando o PDF na página 2 após o clique) + `README.md` (REF-09 / `PdfPanel`; divergências: `<iframe>` nativo vs documento desenhado, sem PDF nas fixtures, editor inline vs modal).

Estado: ciclo fechado com Crítico ✅, `npm run ci` verde, mergeado na `main` (`d9fc9b4`). Próximo frontend: RF-012 (modal de conclusão).

**Smoke conjunto contra o backend real — feito em 02/09/2026 (pós-merge).** Descobri que a máquina tem um serviço **PostgreSQL 17** rodando (o `@embedded-postgres` do `test:e2e` é que recusa sob usuário admin; o Postgres do sistema roda normal). Criada a base `licia` (`CREATE ROLE licia` + `CREATE DATABASE licia`), `prisma migrate deploy`, `seed` (12 requisitos), `npm run start` do NestJS em `:3000` (`IA_ADAPTER=stub`, `PROCESSAMENTO_AUTO=true`), frontend buildado com `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` em `:3201`. Verificado ponta a ponta:

- `POST /analises` (multipart, PDF de 4 páginas) → `PENDENTE` → worker processa → `PRONTA_PARA_REVISAO` com `totalPaginasPdf = 4` (contagem `pdf-lib` do PDF real) e 12 avaliações (Checklist 8 + Técnica 4).
- `GET /analises/:id/pdf` → `200 application/pdf`, `Content-Disposition: inline`, **sem** `X-Frame-Options`/CSP → o `<iframe>` do visor renderiza o PDF; a toolbar navega e o `#page=N` abre a folha no visor nativo do browser.
- Editor inline de página → `PATCH /analises/:id/requisitos/:requisitoId` `{ paginaReferencia: 3 }` → `{ item, resumo }`, **gravado no banco** (`CHK-001.paginaReferencia = 3`), **sem** disparar a R-06; o requisito re-renderizou com "Página 3" sem reload.
- Clicar em "Página 3" no requisito → `<iframe>` para `…/analises/:id/pdf#page=3&view=FitH`.
- Preflight `OPTIONS` em `/analises/:id/requisitos/:id` → `204` com `Access-Control-Allow-Origin` da origem do frontend (CORS `35ee46d`).
  Evidência: `frontend/docs/visual-reference/rf-014/rf014-real-{visor,editou-pagina,page-nav}.png`. O `stub-backend.mjs` do 1º smoke foi andaime, não entrou no repo. **RF-014 validado contra o backend real** — não precisa mais do Pablo para essa parte.

## 01/09/2026 — RF-017 / TSD-018: justificativa visível + erro de revisão fiel (frontend) + CORS no backend

Contexto: 8º ciclo de RF do frontend, na branch `frontend/rf-017-comentario` (a partir da `main` `35ee46d`). Ciclo completo dos 6 papéis, incluindo o subagente `critico`. O usuário aprovou a User Story + TSD e, na mesma mensagem, pediu para **habilitar CORS no backend** para destravar o smoke frontend↔backend.

**Mudança no backend (antes do ciclo do RF-017), autorizada pelo responsável do frontend:**

- Branch `backend/cors` (a partir da `main` `5fc5730`) → `35ee46d`, mergeada na `main`.
- `backend/src/main.ts`: `app.enableCors({ origin: corsOrigins.length ? corsOrigins : true, methods: ['GET','POST','PATCH','DELETE','OPTIONS'] })`.
- `backend/src/config/configuration.ts`: campo `corsOrigins` + função pura `parseCorsOrigins` (lista de `CORS_ORIGINS` separada por vírgula). Vazio = reflete a origem — ok no MVP sem autenticação (SDD §2/§9).
- `backend/.env.example`: documenta `CORS_ORIGINS`.
- `backend/test/unit/configuration.spec.ts` (novo): `parseCorsOrigins` + `configuration().corsOrigins`.
- Validação: `npm install` no `backend/` (deps estavam ausentes) + `npx prisma generate`; `npm run ci` do backend **verde** (lint, typecheck, `prisma:validate` com `.env` local gitignored, **110 unit**, build). `npm run test:e2e` **não roda nesta máquina** — o Postgres embutido recusa iniciar sob usuário administrador ("Execution of PostgreSQL by a user with administrative permissions is not permitted"); sem relação com a mudança, e o gate `ci` do backend não inclui e2e. Pablo pode querer re-rodar o `test:e2e`.

**Ciclo RF-017 (frontend):**

- **PM**: User Story no `roadmap.md` — a _exigência_ de comentário nas ações de revisão do frontend **já vem do RF-008** (modal sempre pede) + backend (R-06 no `PATCH`); RF-017 frontend fecha **visibilidade** da justificativa + **mensageria** do erro. **Apresentada e parada.**
- **Engenheiro**: `docs/engineering/specs/018-comentario-revisao-frontend.tsd.md` — slice pequena de acabamento; sem componente novo, sem mudança de contrato. **Apresentada e parada** (o usuário perguntou por que a §9 "decisões a validar" existe; expliquei que são as escolhas de forma não fixadas em nenhum doc, o ponto de aprovação PM→Engenheiro→Dev).
- **Dev**: `StatusIaResumo.tsx` (+ CSS) — linha "Justificativa da alteração: {comentario}" quando `diverge && item.comentario?.trim()`; `RequisitoItem.tsx` — a linha "Comentário:" passa a `!diverge && item.comentario?.trim()`; `catch (erro)` do toggle usa `erro instanceof AnaliseValidacaoError ? erro.motivos[0] : GENÉRICA`.
- **Testes (mecânico)**: `npm run ci` ✅ — `eslint .` + prettier, `tsc --noEmit`, **vitest 185 → 186/186 (21 arquivos)**, `next build`. Novos: `status-ia-resumo.test.tsx` (justificativa só quando diverge + comentário, com `trim`); `requisito-item.test.tsx` (+ "Comentário:" vs "Justificativa"; + 422 mostra a mensagem do backend; + 404/409 caem na genérica).
- **Crítico** (subagente `critico`): **APROVADO**, sem bloqueantes. Ajustes após o Crítico: `?.trim()` também na condição da linha "Comentário:" (simetria); + caso 404 no toggle. Não-bloqueantes no checkpoint §3.1.
- **Documentador**: TSD-018 (status `implementada` + §8), `roadmap.md` (RF-017 frontend → implementada; tabela linha 9), checkpoint §1/§2/§3.1/§5/§7, este arquivo, `frontend/README.md`.

Evidência visual: `frontend/docs/visual-reference/rf-017/` — `rf017-justificativa.png` (requisito divergente `av-6` expandido com "Justificativa da alteração" no `StatusIaResumo`, sem a linha "Comentário:") + `README.md` (REF-07).

Estado: ciclo fechado com Crítico ✅, `npm run ci` verde, **branch aguardando push + merge na `main`**. Próximo frontend: RF-014 (visor de PDF + referência de página). Com o CORS no backend, o smoke frontend↔backend real fica destravado (`frontend/README.md` > "Rodar contra o backend real").

## 01/09/2026 — RF-011 / TSD-017: checkbox de "verificado" interativo (frontend)

Contexto: 7º ciclo de RF do frontend, na branch `frontend/rf-011-verificado` (a partir da `main` `e3e19a8`). Ciclo completo dos 6 papéis, incluindo o subagente `critico`. O usuário validou a User Story + TSD ("aprovar"). Antes deste ciclo, o usuário pediu para conferir o GitHub: o backend do MVP está completo (Pablo mergeou RF-016 / relatório PDF), e os 4 contratos que o frontend consome foram **conferidos campo a campo** contra `backend/src/analises` do `main` e batem — commit `chore(frontend): notas de integração` (`.env.example`/README com o passo de rodar os dois juntos; gap conhecido: backend sem `app.enableCors()`). Colisão de numeração anotada: Pablo criou `docs/engineering/specs/011-relatorio-pdf.tsd.md` (há dois "TSD-011").

Papéis:

- **PM**: User Story do recorte frontend de RF-011 no `roadmap.md` — o checkbox de "verificado" (desabilitado desde o RF-010) fica operável; `PATCH { verificado }` (mesmo endpoint da TSD-008); painel aplica `{ item, resumo }` na hora (mecanismo do RF-008). **Apresentada e parada.**
- **Engenheiro**: `docs/engineering/specs/017-verificado-interativo-frontend.tsd.md` — `AnalisesGateway.marcarVerificado`; `RequisitoItem` com estado local `salvando`/`erroToggle`; `PainelRevisao` só passa o fio. Decisões da slice na §9. **Apresentada e parada.**
- **Dev**: `analises-gateway.ts` (`marcarVerificado`); `http-analises-gateway.ts` (extraído `patchRevisao(analiseId, requisitoId, body)` comum a `revisarRequisito` e `marcarVerificado`); `fixtures-analises-gateway.ts` (`marcarVerificado` aplica só o `verificado`, recalcula `resumo`, **não persiste**; helpers `localizarAvaliacao`/`resultadoComItem` compartilhados); `RequisitoItem.tsx` (+ CSS — prop `onToggleVerificado?`, checkbox perde `disabled`/`readOnly`, `onChange`, `salvando` trava, `erroToggle` `role="alert"` que reverte o valor); `PainelRevisao.tsx` (`alternarVerificado` + `aplicarRevisao` extraído/compartilhado com o `onAlterado` do modal; fio só quando `podeEditar`).
- **Testes (mecânico)**: `npm run ci` ✅ — `eslint .` + prettier, `tsc --noEmit`, **vitest 177 → 179/179 (20 arquivos)**, `next build`. Novos: `http`/`fixtures` gateway (contrato `{ verificado }` + regras + 409/404 + 422/rede + não-persistência), `requisito-item` +3, `painel-revisao` +2 (progresso pelo `resumo`; `CONCLUIDA` desabilitado).
- **Crítico** (subagente `critico`): **APROVADO**, sem bloqueantes. Ajustes após o Crítico: `aria-label` do checkbox não-editável; +422 e falha de rede explícitos no contrato de `marcarVerificado`; redação reconciliada na TSD §8/§9/§10. Não-bloqueantes no checkpoint §3.1.
- **Documentador**: TSD-017 (status `implementada` + §8), `roadmap.md` (RF-011 frontend → implementada; tabela linha 8), checkpoint §1/§2/§3.1/§5/§7, este arquivo, `frontend/README.md`.

Evidência visual: `frontend/docs/visual-reference/rf-011/` — `rf011-checkboxes.png`, `rf011-apos-marcar.png` (progresso 2/6→3/6 sem reload), `rf011-concluida-desabilitado.png` + `README.md` (REF-05 / `ChecklistItem`).

Estado: ciclo fechado com Crítico ✅, `npm run ci` verde, **branch aguardando push + merge na `main`**. Próximo frontend: RF-017 (comentário obrigatório — o PM avalia quanto já veio no modal do RF-008). Follow-ups: fixtures não persistem; `resumo` de estado pode refletir resposta fora de ordem com N `PATCH` concorrentes; smoke frontend↔backend bloqueado por CORS no backend.

## 01/09/2026 — RF-016 / TSD-011: relatório PDF final (backend)

Contexto: usuário mandou "vamos continuar o desenvolvimento pra fechar o backend do mvp" — RF-016 é o último ciclo de feature do backend (depois só a integração da IA real). Branch `backend/rf-016-relatorio`, dois pontos de aprovação humana explícitos.

Papéis:

- **PM**: 4 perguntas. Decisões: (1) lib `pdfkit` (+ `@types/pdfkit`); (2) conteúdo além do mínimo do PRD → resumo de contagens + referência de página + norma estruturada; **sem** comentário do analista; (3) ordenação → _"você decide"_ → agrupar por área, ordem natural do requisito (documento formal, não a visão "não conformes primeiro" da tela); (4) entrega → `Content-Disposition: inline`. User Story validada.
- **Engenheiro**: `docs/engineering/specs/011-relatorio-pdf.tsd.md` — apresentada e **aprovada** ("Sim, implemente"). Sem migration; sem mudança de contrato existente.
- **Dev**: `src/relatorio/` — `relatorio-modelo.ts` (`montarModeloRelatorio` puro + `formatarNorma`; itens de cada área reordenados por `ordem`), `relatorio.builder.ts` (`renderRelatorioPdf` com `pdfkit`, coleta chunks do stream → `Buffer`; `ROTULO_STATUS` pt-BR; datas `America/Sao_Paulo`), `relatorio.service.ts` (`gerar(id)` → `abrir` (404) → `409` se `!= CONCLUIDA` → `{ bytes, nomeArquivo }`), `relatorio.controller.ts` (`GET /analises/:id/relatorio` → `StreamableFile` `application/pdf` inline), `relatorio.module.ts` (`imports: [AnalisesModule]`). Deps: `pdfkit` ^0.20 + `@types/pdfkit`. +11 unit (`relatorio-modelo` — campos, ordenação por `ordem`, `formatarNorma`, página condicional; `relatorio-builder` — smoke `%PDF-` + páginas via `pdf-lib`) + 1 suite de integração (`relatorio-pdf`: `200 application/pdf inline` com assinatura `%PDF-` / `409` antes de concluir / `404`).
- **Testes**: `npm run ci` ✅ — lint, typecheck, `prisma:validate`, **106 unit**, build. `npm run test:e2e` ✅ **39/39** (9 suites).
- **Crítico**: aprovado, sem desvios de escopo. Menores: conteúdo textual do PDF não é assertável por extração (`pdfkit` não devolve texto) — mitigado pela lógica morar em `montarModeloRelatorio` (puro, 100% testado) + smoke no render; fuso fixado em `America/Sao_Paulo` (revisitar com identidade real); `renderRelatorioPdf` monta o documento inteiro em memória (ok para o volume do MVP).
- **Documentador**: SDD §7 ("Relatório PDF" — contrato final: inline, conteúdo, `409`/`404`); `questoes-abertas.md` **A-04 fechada para o MVP** (sob demanda, sem persistir); checkpoint; roadmap RF-016 → `implementada` (branch).

Estado: ciclo fechado, **branch aguardando merge + push**. Backend do MVP: só falta a **integração da IA real** (`HttpAdapter` da `AnaliseIaPort` + A-02).

## 01/09/2026 — RF-008 / TSD-016: modal "Alterar parecer" na tela de análise (frontend)

Contexto: 6º ciclo de RF do frontend, na branch `frontend/rf-008-parecer` (a partir da `main` `2e8f6d5` — RF-009 já mergeada). Ciclo completo dos 6 papéis, incluindo o subagente `critico`. TSD-016 é a próxima livre na numeração compartilhada. É a **primeira escrita** da tela de análise (até aqui só leitura). O usuário validou a User Story + TSD com "pode seguir como achar melhor" — as decisões da §9 ficaram por conta do agente.

Papéis:

- **PM**: User Story do recorte frontend de RF-008 no `roadmap.md` — botão "Alterar parecer" em cada `RequisitoItem`; modal com parecer atual (read-only) + select de novo parecer + comentário; `PATCH /analises/:id/requisitos/:requisitoId` (contrato TSD-008, já na `main` `ad2e8cd`); painel aplica `{ item, resumo }` na hora. **Apresentada e parada** para validação.
- **Engenheiro**: `docs/engineering/specs/016-alterar-parecer-frontend.tsd.md` — `AnalisesGateway.revisarRequisito`; `alterar-parecer.ts` puro; `AlterarParecerModal`; `PainelRevisao` stateful (overrides). Decisões da slice na §9. **Apresentada e parada.**
- **Dev**: `types.ts` (`AlteracaoParecerInput`, `RevisaoRequisitoResultado`); `analises-gateway.ts` (método + `AnaliseConflitoError` 409); `alterar-parecer.ts` novo (`PARECER_OPCOES`, `validarAlteracaoParecer`, `resolverAlteracaoParecer` — puros); `http-analises-gateway.ts` (`revisarRequisito` PATCH JSON + `validarRevisaoResultado`, reusa `lerItem`/`lerResumo`); `fixtures-analises-gateway.ts` (`revisarRequisito` aplica as regras, recalcula `resumo`, **não persiste**); `AlterarParecerModal.tsx` + CSS (portal, padrão do `NovaAnaliseModal`); `RequisitoItem.tsx` (prop `onAlterarParecer?` + botão no bloco expandido; checkbox de verificado segue desabilitado); `PainelRevisao.tsx` (`overrides: Map<idAvaliacao, item>` + `resumo` de estado, aplicados antes de `separarPorAba`/`filtrarPorStatus`, zerados só quando `detalhe.id` muda; `podeEditar` gateia botão+modal por `PRONTA_PARA_REVISAO`).
- **Testes (mecânico)**: `npm run ci` ✅ — `eslint .` + prettier, `tsc --noEmit`, **vitest 130 → 164/164 (20 arquivos)**, `next build`. Novos: `alterar-parecer` (validação/resolução puras), `alterar-parecer-modal` (parecer atual, select sem o atual, Confirmar travado, sucesso→`onAlterado`, 422/409/404/rede, "editar limpa a faixa de erro"), `http`/`fixtures` gateway (contrato PATCH + regras + 409/404 + não-persistência), `painel-revisao` +3 (override aplicado + some do filtro + progresso; filtro "Todos" mantém badge; CONCLUIDA sem botão), `requisito-item` +2 (botão só com callback). Percalços: `getByRole` name é substring no Playwright (usar `exact: true`); um refetch por troca de filtro (RF-009 usa `router.replace`) descartava os overrides — corrigido zerando só por `detalhe.id`.
- **Crítico** (subagente `critico`): **APROVADO**, sem bloqueantes. Ajustes aplicados após o Crítico: modal limpa a faixa de erro do servidor ao editar qualquer campo; +3 testes de componente (404, rede, "editar limpa o erro"); precisão de redação na TSD §3/§7.1. Não-bloqueantes anotados no checkpoint §3.1.
- **Documentador**: TSD-016 (status `implementada` + §8), `roadmap.md` (RF-008 frontend → implementada; tabela linha 7), checkpoint §1/§2/§3.1/§5/§7, este arquivo, `frontend/README.md`.

Evidência visual: `frontend/docs/visual-reference/rf-008/` — `rf008-modal.png`, `rf008-modal-diverge.png` (dica "a IA sugeriu…"), `rf008-apos-alterar.png` (item verificado + badge "Conforme" + chip âmbar "IA: Não conforme" + progresso 2/6→3/6, sobrevivendo à troca de filtro) + `README.md` (REF-08 / `ChangeOpinionModal`; divergências: sem campo de página, sem toast, comentário sempre obrigatório).

Estado: ciclo fechado com Crítico ✅, `npm run ci` verde, **branch aguardando push + merge na `main`**. Próximo frontend: RF-011 (marcar "verificado" interativo). Follow-ups: fixtures não persistem a alteração; validação da fixture mais estrita que a R-06 do backend.

## 01/09/2026 — RF-009 / TSD-015: filtros por status + visão inicial priorizando não conformes (frontend)

Contexto: 5º ciclo de RF do frontend, na branch `frontend/rf-009-filtros` (a partir da `main` — RF-007 já mergeada em `cbe9f5b`). Ciclo completo dos 6 papéis, incluindo o subagente `critico`. TSD-015 é a próxima livre na numeração compartilhada. O usuário validou a User Story + TSD e respondeu às 6 decisões abertas da §9: **(1)** filtro persistido na URL ("caso eu marque não conforme, não tire"); **(2)** filtro compartilhado entre as abas (recomendação aceita); **(3)** filtrar por `statusFinal` — "o humano sempre tem a decisão final, a IA só sugere"; **(4)** 3 chips de status + "Todos" (backend do colega tem 3 status); **(5)** grupos sem itens no filtro **continuam aparecendo** com placeholder (mudou vs. proposta original, que ocultava); **(6)** atalho "Ver todos" só no caso "nenhum não conforme" (como no documento).

Papéis:

- **PM**: User Story do recorte frontend de RF-009 no `roadmap.md` — tela abre priorizando não conformes + chips de filtro por status no `PainelRevisao` (adiados do RF-010). **Apresentada e parada** para validação.
- **Engenheiro**: `docs/engineering/specs/015-filtros-status-frontend.tsd.md` — slice de apresentação; `filtrarPorStatus` puro; filtro na URL; estado "nenhum não conforme" (PRD §9). **Apresentada e parada.** Após as respostas do usuário às decisões §9, a TSD foi ajustada (URL + grupos visíveis) e um commit "decisões validadas" registrou a mudança.
- **Dev**: `src/lib/data/filtro-requisito.ts` novo (`FiltroRequisito`, `FILTRO_REQUISITO_PADRAO/OPCOES/LABEL`, `parseFiltroRequisito`/`filtroParaSlug`, `filtrarPorStatus` — puro, preserva todos os grupos, não muta); `src/components/analise/FiltroStatus.tsx` + `.module.css` novo (chips `role="group"` / `aria-pressed`, cor de ativo por status portada de `.chipActive*` do protótipo); `PainelRevisao.tsx` → filtro em `useState` lido de `useSearchParams` e escrito com `router.replace(..., { scroll: false })` (param omitido no padrão), compartilhado entre abas, grupos vazios com linha de placeholder, estado "nenhum não conforme" + botão "Ver todos os requisitos", legenda RF-007 só quando há itens visíveis; `app/analise/[id]/page.tsx` → `<PainelRevisao>` sob `<Suspense>`; `fixtures-analise-detalhe.ts` → id "7" ganha `AVALIACOES_SEM_NAO_CONFORME` (andaime) para exercitar o §9.
- **Testes (mecânico)**: `npm run ci` ✅ — `eslint .` + prettier, `tsc --noEmit`, **vitest 130 → 129/129 (18 arquivos)** (o −1 é a remoção de `contarPorFiltro` pós-Crítico), `next build` (rota `/analise/[id]` como ƒ dynamic). Novos: `filtro-requisito` (parse/slug/filtrar/não-muta), `filtro-status` (4 chips/aria-pressed/onChange/grupo), `painel-revisao` +7 (filtro inicial, URL grava/limpa, lê `?requisitos=`, mantém ao trocar de aba, placeholder de grupo vazio + badge dos visíveis, §9 + atalho, PROCESSANDO sem chips).
- **Crítico** (subagente `critico`): **APROVADO**, sem bloqueantes. Ajustes aplicados após o Crítico: **removido `contarPorFiltro`** (só o teste o chamava — a contagem sai de `contarItens(gruposFiltrados)`); asserção da ausência do grupo de chips em `PROCESSANDO` e de que o badge do cabeçalho de grupo reflete os itens visíveis. Não-bloqueantes anotados no checkpoint §3.1: legenda "sugestões da IA" passou a depender de haver itens visíveis (decisão de implementação); `?requisitos=` só é lido na montagem (back/forward do browser não re-sincroniza os chips — follow-up); contraste AA do chip "Não se aplica" ativo; fixture id "7" é andaime.
- **Documentador**: TSD-015 (status `implementada` + §8), `roadmap.md` (RF-009 frontend → implementada; tabela de sequenciamento linha 6), checkpoint §1/§2/§3.1/§5/§7, este arquivo.

Evidência visual: `frontend/docs/visual-reference/rf-009/` — `rf009-nao-conforme.png`, `rf009-todos.png`, `rf009-grupo-vazio-placeholder.png`, `rf009-nenhum-nao-conforme.png`, `rf009-ver-todos.png` + `README.md` (comparação REF-06 / `AnalysisPanel` do protótipo; divergências intencionais registradas). A URL real após "Ver todos" (`…/analise/7?requisitos=todos`) confirma a persistência fora do mock.

Estado: ciclo fechado com Crítico ✅, `npm run ci` verde, **branch aguardando push + merge na `main`**. Próximo frontend: RF-008 (modal de alteração de status final / "parecer").

## 01/09/2026 — RF-007 / TSD-014: status sugerido pela IA na tela de análise (frontend)

Contexto: 4º ciclo de RF do frontend, na branch `frontend/rf-007-status-ia` (a partir da `main` — RF-010 já mergeada em `28c9e8c`). O usuário reforçou: seguir o **fluxo completo dos 6 papéis, incluindo o Crítico**, em toda implementação (os ciclos anteriores de frontend pularam o Crítico). A partir daqui o subagente `critico` roda antes de fechar cada RF. TSD-014 é a próxima livre na numeração compartilhada (backend 009/010; frontend 011/012/013/014).

Papéis:

- **PM**: User Story do recorte frontend de RF-007 no `roadmap.md` — exibir `statusSugeridoIa` no `RequisitoItem` do RF-010, distinguir sugestão da IA do parecer atual, realçar divergência. Sem mudança de contrato (o payload já traz os dois campos). **Apresentada e parada.**
- **Engenheiro**: `docs/engineering/specs/014-status-ia-frontend.tsd.md` — slice puramente de apresentação; `divergeDaIa`; caminho "diverge" implementado agora (só ocorre com RF-008) e testado via fixture; §10 (REF-07 — protótipo não distingue os dois status: divergência registrada). **Apresentada e parada.** Usuário validou: "faça igual ao protótipo, melhore onde achar melhor" + "siga o fluxo dos meus agentes".
- **Dev**: `analise-detalhe.ts` → `divergeDaIa(item)` (puro, `Pick<AvaliacaoItem,...>`); `StatusIaResumo.tsx` novo (bloco "Sugestão da IA / Parecer atual — alterado na revisão"); `RequisitoItem.tsx` → marca "IA" (parecer = sugestão) ou chip âmbar "IA: <sugestão>" + classe `divergente` (realce âmbar do card) quando diverge, e `StatusIaResumo` no topo do expandido; `PainelRevisao.tsx` → legenda "os status abaixo são sugestões da IA…" acima da lista (some no estado processando/erro/sem itens); `fixtures-analise-detalhe.ts` → item `av-6` passou a divergir (`statusSugeridoIa=NAO_CONFORME`, `statusFinal=CONFORME`, `verificado=true`, comentário) para o caso ser exercitável e realista.
- **Testes (mecânico)**: `npm run ci` ✅ — `eslint .` + prettier, `tsc --noEmit`, **vitest 111 → 113/113 (16 arquivos)**, `next build`. Novos: `divergeDaIa` (2), `requisito-item` RF-007 (marca/chip/badge principal/expandido igual/expandido diverge — 5), `painel-revisao` legenda (com itens / PROCESSANDO / ERRO_PROCESSAMENTO). Percalço: comentário/legenda com Prettier resolvido no `--write`.
- **Crítico** (subagente `critico`): **APROVADO**, sem bloqueantes. Não-bloqueantes: fixture `av-6` carregou `verificado`+`comentario` além do descrito na TSD §9 (coerente com R-06 — anotado); realce âmbar só com evidência visual; legenda visível com aba ativa vazia. Ajustes aplicados após o Crítico: asserção de ausência da legenda em `ERRO_PROCESSAMENTO` e do badge principal seguir `statusFinal` na divergência.
- **Documentador**: TSD-014 (status + §8), `roadmap.md` (RF-007 frontend → implementada), checkpoint §1/§2/§3.1/§5/§7, este arquivo, `frontend/README.md`.

Evidência visual: `frontend/docs/visual-reference/rf-007/` — `parecer-igual-sugestao.png`, `parecer-diverge-da-ia.png`, `prototipo-painel.png` + `README.md`.

Estado: ciclo fechado com Crítico ✅, `npm run ci` verde, **branch aguardando push + merge na `main`**. Próximo frontend: RF-009 (visão inicial priorizando não conformes + filtros por status). Follow-up: o caminho "diverge da IA" só terá caso real com RF-008.

## 01/09/2026 — RF-010 / TSD-013: tela de análise — abas Checklist/Técnica (frontend)

Contexto: 3º ciclo de RF do frontend, na branch `frontend/rf-010-tela-analise` (a partir da `main` `9887dca`). Numeração: backend tinha tomado TSD-009 (RF-014) e TSD-010 (RF-012/013/015); frontend seguiu com 011 (RF-002), 012 (RF-001/004) e agora **013** (RF-010).

Papéis (em sequência, mesma sessão):

- **PM**: User Story do recorte frontend de RF-010 em `docs/product/roadmap.md` — tela de análise carrega `GET /analises/:id`, abas Checklist/Técnica com navegação livre, lista de requisitos por área em acordeão **somente leitura**, estados carregando/erro/404. Fora do escopo: filtros (RF-009), IA sugerida (RF-007), verificado interativo (RF-011), modal de parecer (RF-008), comentário (RF-017), visor de PDF (RF-014), conclusão (RF-012). **Apresentada e parada para validação.**
- **Engenheiro**: `docs/engineering/specs/013-tela-analise-frontend.tsd.md`. **Apresentada e parada.** Usuário validou com 3 decisões: (1) corte inclui a lista read-only; (2) aba Técnica **fiel ao backend** (badge de `statusFinal`, não neutra como o protótipo — P-04); (3) **ligar polling** enquanto processa; checkbox desabilitado (interativo no RF-011). TSD-013 §9/§10 atualizadas com as decisões e a inspeção do `AnalysisPanel`.
- **Dev**:
  - Camada de dados: `types.ts` (`AnaliseDetalhe`, `ResumoAnalise`, `AreaComItens`, `AvaliacaoItem`, `NormaReferencia`); `analise-detalhe.ts` (`separarPorAba` por prefixo `CHECKLIST`/`TECNICA`, `rotuloArea`, `normaTexto`, `calcularResumo`, `contarItens`, `ANALISE_POLL_MS`); `status-requisito.ts` (label/tone); `analises-gateway.ts` (`abrirAnalise` + `AnaliseNaoEncontradaError`); `fixtures-analise-detalhe.ts` (fixtures explícitas ids 1/2/3/5 + sintetizador a partir da listagem); `fixtures-analises-gateway.ts`/`http-analises-gateway.ts` (`abrirAnalise` + `validarAnaliseDetalhe`); `index.ts`.
  - Rota: `app/analise/[id]/page.tsx` reescrita (Server Component `dynamic`, `notFound()` no `AnaliseNaoEncontradaError`); `not-found.tsx` novo.
  - Componentes `src/components/analise/`: `AnaliseHeader` (NUP/objeto/status/responsável/datas — barra própria acima dos painéis), `AnaliseVisorPlaceholder` (RF-014), `AutoRefreshAnalise` (client, `setInterval`→`router.refresh()` só enquanto `PENDENTE`/`PROCESSANDO`), `PainelRevisao` (client — abas, progresso do `resumo`, grupos por área, estados processando/erro), `RequisitoItem` (client — acordeão; `<div>` header com checkbox desabilitado + `<button>` toggle para não aninhar input em button; expandido = descrição/norma/comentário/página-texto), `StatusBadgeRequisito`. Ícones: nenhum novo (reusa `ChevronDownIcon`).
- **Testes (mecânico)**: `npm run ci` ✅ — `eslint .` + prettier, `tsc --noEmit`, **vitest 104/104 (16 arquivos)**, `next build`. Novos/estendidos: `analise-detalhe` (separar/rótulo/norma/resumo), `fixtures-analises-gateway` (+`abrirAnalise`: fixture/sintetizado/processando/404/imutabilidade), `http-analises-gateway` (+`abrirAnalise` contrato: URL encodada, mapeamento completo, `404`→`NaoEncontrada`, `500`, sem `avaliacoesPorArea`/`resumo`, status fora da allowlist, rede), `painel-revisao` (6 casos), `requisito-item` (4), `analise-header` (2). Percalço: comentário JSDoc com `CHECKLIST*/` fechava o bloco → reescrito.
- **Visual**: screenshots (Checklist com item expandido, Técnica, processando, não-encontrada) + `prototipo-painel.png` em `frontend/docs/visual-reference/rf-010/` + `README.md` com a comparação vs REF-06/REF-07 (divergências: Técnica com status, sem filtros/checkbox/editar-parecer, badge pílula, cabeçalho em barra própria).

Docs: `roadmap.md` (RF-010 frontend — User Story + status), `013-*.tsd.md` (novo), checkpoint §1/§2/§5/§7, este arquivo.

Estado: ciclo implementado e validado, `npm run ci` verde, **branch aguardando push + merge na `main`**. Próximo frontend: RF-007 (status sugerido pela IA na tela de análise). Follow-up: smoke da tela de análise contra o backend real quando houver ambiente conjunto.

## 01/09/2026 — RF-001 + RF-004 / TSD-012: modal "Nova análise" + upload (frontend)

Contexto: usuário pediu "Continue" após aprovar RF-002. Aberto o 2º ciclo de RF do frontend na branch `frontend/rf-001-nova-analise` (a partir de `frontend/rf-002-listagem`), agrupando RF-001 (criar análise: NUP, objeto) + RF-004 (upload de PDF) — mesmo agrupamento do backend (TSD-004). Sem merge na `main`.

Papéis (em sequência, mesma sessão):

- **PM**: User Story do recorte frontend em `docs/product/roadmap.md` (RF-001), com escopo, fora do escopo e divergências protótipo × PRD (limite 25 MB vs 50 MB; `objeto`/`arquivo`; sem "Processando documento…").
- **Engenheiro**: `docs/engineering/specs/012-nova-analise-frontend.tsd.md` — escopo, estratégia de testes (inclui **contrato** de `POST /analises`), decisões (validação client-side = obrigatórios + tipo PDF + 25 MB; magic bytes/`/Encrypt` ficam no backend), §10 (REF-05).
- **Dev**:
  - `src/lib/data/nova-analise.ts` — `ANALISE_PDF_TAMANHO_MAX_MB=25`, `NUP_MAX=60`, `OBJETO_MAX=2000`; `validarArquivoPdf`, `validarNovaAnalise`, `formatarTamanho` (puros).
  - `types.ts` — `NovaAnaliseInput` (`{ nup, objeto, arquivo: File }`), `AnaliseCriada`.
  - `analises-gateway.ts` — `criarAnalise` na interface; `AnaliseValidacaoError extends AnalisesGatewayError` (`motivos: string[]`).
  - `fixtures-analises-gateway.ts` — `criarAnalise` revalida e devolve `AnaliseCriada` sintética `PENDENTE` (`id: nova-<uuid>`; **não** entra na lista — andaime).
  - `http-analises-gateway.ts` — `criarAnalise` = `POST {base}/analises` (FormData `nup`/`objeto`/`arquivo`); `422` → `AnaliseValidacaoError` (lê `message` string|array); `≥500`/rede → `AnalisesGatewayError`; `validarAnaliseCriada` para o `201`.
  - `NovaAnaliseModal` (client, `createPortal` p/ `document.body`): campos + dropzone (clique + drag&drop), `role="dialog"`/`aria-modal`, Escape / clique-fora / × / Cancelar (bloqueado enviando), foco inicial no NUP, `body` sem scroll enquanto aberto. Erro por campo (`aria-invalid`/`aria-describedby`); faixa do arquivo fica **vermelha** quando inválido; banner de erro de envio acima do rodapé com os campos preservados.
  - `NovaAnaliseButton` (client) — substitui o `<button disabled>` do `AnalisesToolbar`; no `onCriada` faz `router.push('/analise/<id>')`.
  - Ícones `XmarkIcon`, `UploadIcon`, `CircleCheckIcon`, `TrashIcon`.
- **Testes (mecânico)**: `npm run ci` ✅ — `eslint .` + prettier, `tsc --noEmit`, **vitest 72/72 (12 arquivos)**, `next build`. Novos: `nova-analise` (validações puras), `nova-analise-modal` (7 casos RTL: campos, habilita só quando válido, recusa não-PDF via drag, recusa >25 MB, sucesso → `onCriada`, erro do servidor → banner + dados preservados, Escape), `nova-analise-button` (abre modal, cria → `push`), + `criarAnalise` no `fixtures-analises-gateway` e no `http-analises-gateway` (contrato: FormData/URL/método, `201`, `422` array e string, `502`, corpo fora do formato, rede). Percalços: `userEvent.upload` filtra por `accept` → teste de "não-PDF" usa `fireEvent.drop`; `crypto.randomUUID` disponível no ambiente jsdom.
- **Visual**: screenshots do modal (vazio, com arquivo, erro de arquivo) + `prototipo-modal.png` em `frontend/docs/visual-reference/rf-001/` + `README.md` com a comparação vs REF-05. Estado "erro de envio" é coberto por teste (sem backend no ar).

Docs: `roadmap.md` (RF-001/RF-004 frontend — User Story + status + TSD-012), `011-*.tsd.md` (novo), checkpoint §1/§2/§5/§7, este arquivo.

Estado: ciclo implementado, `npm run ci` verde, **branch aguardando revisão (Crítico) + merge** — na ordem `tsd-002-fundacao` → `rf-002-listagem` → `rf-001-nova-analise`. Próximo frontend: RF-010 (tela de análise). Follow-up: smoke `criar → abrir` contra o backend real quando houver ambiente conjunto (o `HttpAnalisesGateway` só passou por teste de contrato).

## 01/09/2026 — RF-002 / TSD-011: tela de listagem de análises (frontend)

Contexto: usuário (Vinicius) pediu para abrir o 1º ciclo de RF do frontend a partir da fundação (TSD-002 não mergeada), sem merge na `main`, e incluir o follow-up de migração do `next lint`. Branch `frontend/rf-002-listagem` a partir de `frontend/tsd-002-fundacao`.

Papéis (executados em sequência pela mesma sessão — feature pequena, sem subagentes):

- **PM**: User Story do recorte frontend de RF-002 escrita em `docs/product/roadmap.md` (RF-002), com escopo, fora do escopo e divergências protótipo × PRD.
- **Engenheiro**: `docs/engineering/specs/011-listagem-analises-frontend.tsd.md` — escopo, estratégia de testes (inclui **contrato** do `HttpAnalisesGateway`), decisões (URL como estado, chips de status, coluna Status, "Nova análise" desabilitado), §10 (REF-03 inspecionada) e divergências.
- **Dev**:
  - Camada de dados (`src/lib/data/`): `types.ts` (+`ListarAnalisesQuery`), `analises-query.ts` (`parseListarAnalisesQuery` tolerante + `queryParaString` omitindo defaults; `TAMANHO_PADRAO=20`/`MAX=100`), `status-analise.ts` (label/tone/allowlist), `analises-gateway.ts` (`listarAnalises(query?)` + `AnalisesGatewayError`), `fixtures-analises-gateway.ts` (aplica busca acento-insensitive/filtro multi-status/ordenação/paginação; fixtures ampliadas p/ 24), `http-analises-gateway.ts` (contrato TSD-005 + `validarAnalisesPagina`), `index.ts` (`getAnalisesGateway` → HTTP se `NEXT_PUBLIC_API_BASE_URL`).
  - UI (`src/components/analises/`): `StatusBadge`, `AnalisesTable` (tabela real; cabeçalhos NUP/"Iniciada em" ordenáveis via `<Link>`; linha clicável por link estendido na 1ª célula), `AnalisesToolbar` (+`SearchField` client debounced, `StatusFilter` client chips), `Paginator` (links; disabled = `<span>`), `AnalisesListaVazia` (sem-analises / sem-resultado). Ícones novos.
  - Rotas: `src/app/page.tsx` reescrita como Server Component (`dynamic = "force-dynamic"`, lê `searchParams`, redireciona página fora do intervalo), `loading.tsx` (skeleton), `error.tsx` ("tentar novamente").
  - **Migração `next lint` → `eslint .`**: removido `.eslintrc.json`; criado `eslint.config.mjs` (flat, `FlatCompat` + `next/core-web-vitals` + `prettier`); dep `@eslint/eslintrc`; scripts `lint`/`lint:fix` (`eslint .` / `eslint . --fix`); `next.config.mjs` com `eslint.ignoreDuringBuilds: true` (lint roda no `npm run ci`).
  - Testes (Vitest + RTL): `analises-query`, `status-analise`, `fixtures-analises-gateway` (busca/filtro/ordenação/paginação/clamp/imutabilidade), `http-analises-gateway` (**contrato**: URL, mapeamento, rejeição de payload sem `total` / status inválido / item sem `nup` / não-OK / erro de rede), `analises-table`, `analises-lista-vazia`, `paginator`, `search-field` (`next/navigation` mockado). `vitest.setup.ts` ganhou mock de `next/link` e `cleanup` por teste.
- **Testes (mecânico)**: `npm run ci` ✅ — `eslint .` + `prettier --check` limpos, `tsc --noEmit` ✅, **vitest 43/43 (9 arquivos)**, `next build` ✅ (`/` dinâmica, First Load ~108 kB). Percalços resolvidos no ciclo: (a) CSS Modules rejeita seletores "impuros" (`thead`/`td` nus) → escopados sob `.tabela`; (b) coluna "objeto" colapsava com `max-width:0` → `<span>` com `-webkit-line-clamp` e `td` auto; (c) `userEvent` + fake timers travava → teste do `SearchField` usa timers reais + `waitFor`; (d) tipagem de `vi.fn` sem args no teste de contrato → `vi.fn((_url: string) => …)`.
- **Visual**: screenshots 1440×900 (lista, página 2, busca+filtro+ordenação, vazio-sem-resultado) em `frontend/docs/visual-reference/rf-002/` + `README.md` com a comparação de enquadramento vs REF-03 (ok; divergências intencionais registradas).

Docs: `roadmap.md` (RF-002 frontend — User Story + status + TSD-011), `docs/engineering/specs/011-*.tsd.md` (novo), checkpoint §1/§2/§5/§7, este arquivo.

Estado: ciclo implementado, `npm run ci` verde, **branch aguardando revisão (Crítico) + merge** (fundação primeiro). Próximo frontend: RF-001/RF-004 (modal "Nova análise" + upload de PDF). Follow-up: smoke de `/` contra o backend real quando houver ambiente conjunto (o `HttpAnalisesGateway` só passou por teste de contrato).

## 01/09/2026 — TSD-002: implementação da fundação técnica do frontend

Contexto: usuário (Vinicius) pediu para trabalhar no frontend seguindo o método. TSD-002 estava `aprovada — não implementada`; §10 (Referências visuais) com inspeção `Pendente` (gate do `visual-reference-workflow`). Ciclo na branch `frontend/tsd-002-fundacao` (a partir do `main` `fb4cd8e`). Não é ciclo de 6 papéis — é fundação (§0 do workflow): implementar a TSD, rodar gates, atualizar checkpoint + audit.

Etapas:

- **Inspeção visual + §10**: lidos `Prototipo Licia Analisadora/src/theme/*`, `Topbar`, `HomePage`, `AnalysisPage` (+ `PdfPanel`/`AnalysisPanel` CSS). Preenchida a §10 da TSD-002 (§10.1 observações por REF-01..04; §10.2 chrome/divergências a não implementar). 4 `Status de inspeção` → `Inspecionado`. **Parada para revisão humana → aprovada pelo usuário.**
- **Decisões** (registradas na TSD §9): Next.js 15 App Router + React 19 + TS estrito; Node 20 + npm; **CSS Modules + CSS custom properties** (tokens portados por valor para `src/app/theme/`); **Vitest + RTL + jsdom**; Kanit via `next/font/google`; brasão = placeholder SVG local (`CearaLogo.tsx`), não a URL do Figma MCP; sem trava `min-width: 1440px`.

Alterações:

- **`frontend/`** (novo): projeto Next.js. `package.json` (scripts `dev/build/start/lint/typecheck/test/test:watch/ci`), `tsconfig.json` (strict, alias `@/*`), `next.config.mjs`, `.eslintrc.json` (`next/core-web-vitals` + `prettier`), `.prettierrc.json`, `vitest.config.ts` (alias via `resolve.alias` — sem `vite-tsconfig-paths`, ESM-only quebrava o config `.ts`), `vitest.setup.ts` (mock de `next/font/google`), `.env.example` (`NEXT_PUBLIC_API_BASE_URL`), `.nvmrc` (20), `.gitignore`, `README.md`.
- `src/app/`: `layout.tsx` (Kanit + `globals.css`), `globals.css` (importa tokens + reset), `theme/*.css` (6 arquivos de token portados do protótipo), `page.tsx` (rota `/` — casca lista; server component que exercita o seam), `analise/[id]/page.tsx` (rota dinâmica — casca: visor à esquerda, painel de revisão 596px à direita).
- `src/components/`: `topbar/Topbar.tsx` (+ `.module.css`), `layout/PageShell.tsx` (frame base Topbar + conteúdo; prop `fill`), `brand/CearaLogo.tsx` (placeholder), `icons/index.tsx` (`ChevronDownIcon`).
- `src/lib/data/`: `types.ts` (`StatusAnalise`, `StatusRequisito` com 3 valores, `AnaliseResumo`, `AnalisesPagina`), `analises-gateway.ts` (interface), `fixtures.ts` (3 análises derivadas do protótipo, sem "responsável"), `fixtures-analises-gateway.ts`, `index.ts` (`getAnalisesGateway()` — fixtures hoje; erro explícito se `NEXT_PUBLIC_API_BASE_URL` definida).
- `test/unit/`: `page-shell.test.tsx` (2 casos), `fixtures-analises-gateway.test.ts` (2 casos).
- `frontend/docs/visual-reference/`: 4 screenshots (casca × protótipo, `/` e `/analise`) + `README.md` com o resultado da comparação de frame.
- Raiz: `README.md` — seção "Frontend" com instruções de execução. `docs/engineering/checkpoint.md` — slice ativada e fechada. `docs/engineering/specs/002-fundacao-frontend.tsd.md` — §8 (critérios marcados), §9 (decisões), §10, frontmatter.

Validações (rodadas de `frontend/`, 01/09/2026):

- `npm run lint` ✅ (ESLint `next/core-web-vitals` sem erros + Prettier `--check` limpo)
- `npm run typecheck` ✅ (`tsc --noEmit`)
- `npm run test` ✅ **4/4** (2 arquivos — `page-shell`, `fixtures-analises-gateway`)
- `npm run build` ✅ — 4 rotas (`/` estática, `/analise/[id]` dinâmica, `/_not-found`), First Load JS ~103 kB
- `npm run ci` ✅ (encadeia os 4)
- **Visual**: screenshots 1440×900 via Chrome (playwright-core) da casca (`npm run build && start`) e do protótipo (`npm run dev`). Frame de REF-02 (Topbar 64px verde-gov), REF-03 (cabeçalho + regra de marca) e REF-04 (visor à esquerda + painel 596px à direita, altura `calc(100vh - 64px)`) confere. Sem gaps de enquadramento. Evidência em `frontend/docs/visual-reference/`.

Percalços resolvidos: (1) `vite-tsconfig-paths` ESM-only quebrava o carregamento de `vitest.config.ts` → trocado por `resolve.alias` manual, dep removida. (2) Painéis da tela de análise não esticavam na vertical (`height: 100%` em item de flex-grow não resolve) → contêiner `align-items: stretch` + `min-height: 0` e remoção do `height: 100%` dos painéis. (3) Ordem dos painéis invertida vs. protótipo → visor à esquerda, revisão à direita. (4) `npm 11` bloqueia install scripts → `package.json#allowScripts` para `esbuild`/`unrs-resolver` (documentado no README). O `package.json` do protótipo, tocado por `npm approve-scripts` durante as screenshots de referência, foi restaurado (`git checkout`).

Decisões: ver TSD-002 §9. Nenhuma questão de `questoes-abertas.md` fechada (fundação só cria seams).

Pendências: revisão (Crítico) + merge da branch na `main`. Follow-up: migrar `next lint` → ESLint CLI (deprecado no Next 15). Depois: abrir o 1º ciclo de RF do frontend (RF-002 — tela de listagem + estado vazio).

## 01/09/2026 — RF-012 + RF-013 + RF-015 / TSD-010: conclusão da análise (backend)

Contexto: usuário mandou "faz o merge e o push, e abre o ciclo de RF-012+RF-013+RF-015" logo após o fechamento de RF-014. Ciclo agrupado ("concluir a análise") na branch `backend/rf-012-conclusao`, com as duas paradas de aprovação humana explícitas.

Papéis:

- **PM**: 4 perguntas. Decisões do usuário: (1) reconclusão de análise já `CONCLUIDA` → `200` idempotente; (2) resposta de sucesso = payload completo (`GET /analises/:id`); (3) responsável → _"você decide"_ → expor `analistaId` **e** `analistaNome` (relatório RF-016 vai precisar do nome); (4) trava fiel ao PRD — só `verificado` (não exige `statusFinal` editado). User Story validada; roadmap RF-012/013/015 → `user story aprovada`.
- **Engenheiro**: `docs/engineering/specs/010-conclusao-analise.tsd.md` — apresentada e **aprovada** ("Aprova, pode implementar"). Sem migration (`concluida_em`/`CONCLUIDA` já existiam).
- **Dev**: `src/analises/conclusao-analise.ts` (`requisitosObrigatoriosPendentes` — obrigatórios com `verificado=false`, ordenado por área/ordem); `AnalisesService.concluir(id)` (`404`; `CONCLUIDA` → `200` via `abrir`; fora de `PRONTA_PARA_REVISAO` → `409`; pendentes → `422 { requisitosPendentes }`; senão `updateMany where status=PRONTA_PARA_REVISAO set CONCLUIDA + concluidaEm` e devolve `abrir(id)`); `AnaliseDetalhe`/`montarAnaliseDetalhe` ganham `analistaId` + `analistaNome` (3º parâmetro, default `''`); `abrir` resolve o nome via `AnalistaAtualProvider`; `POST /analises/:id/concluir` `@HttpCode(200)`. +11 unit (`conclusao-analise.spec` + `analise-detalhe` responsável) + 1 suite de integração (`conclusao-analise.integration-spec`: `422`+lista / `200`+`CONCLUIDA`+`concluidaEm`+responsável / idempotente / não-obrigatório não bloqueia / `409` / `404`).
- **Testes**: `npm run ci` ✅ — lint, typecheck, `prisma:validate`, **97 unit**, build. `npm run test:e2e` ✅ **36/36** (8 suites).
- **Crítico**: aprovado, sem desvios de escopo. Menores: `concluir` faz 3 idas ao banco no caminho feliz (`buscarPorId` + `findMany` + `updateMany` + o `abrir` relê tudo) — barato no MVP; `analistaNome` de análises antigas mostra sempre o analista corrente (analista único — P-10); sem `updatedAt`-check entre a checagem de pendentes e o `updateMany` (a transição condicional cobre a corrida de status, não a de conteúdo — aceitável).
- **Documentador**: SDD §7 ("Concluir análise" — contrato final) e §8 (`analise`: `analista_id`/`concluida_em` expostos, transição condicional); `questoes-abertas.md` P-01/P-02 anotadas (conclusão interna, auditoria mínima); checkpoint; roadmap RF-012/013/015 → `implementada` (branch).

Estado: ciclo fechado, **branch aguardando merge + push**. Próximo backend: RF-016 (relatório PDF final), depois a integração da IA real (A-02).

## 01/09/2026 — RF-014 / TSD-009: referência de página do PDF (backend)

Contexto: usuário mandou "faz o merge e o push pro github; depois começa o ciclo da RF-14" e apontou que **não estava recebendo a User Story do PM nem a TSD para validar antes da implementação**. Ciclo na branch `backend/rf-014-pdf-pagina`, com os dois pontos de aprovação humana restaurados como paradas explícitas.

Ajuste de processo: registrado em `docs/perguntas-e-respostas.md` e no checkpoint §7 — a partir deste ciclo o PM apresenta a User Story e **para**; o Engenheiro apresenta a TSD e **para**; só então o Dev implementa.

Papéis:

- **PM**: 4 perguntas. Decisões do usuário: (1) visor do frontend navega para a página via `#page=N` contra o PDF inteiro — **sem extração de página no servidor**; `lerPagina` fica como seam; (2) validação de página fora do intervalo passa a ser da `paginaReferencia` no PATCH; (3) correção da página pelo analista **incluída no PATCH de revisão** agora; (4) lib `pdf-lib`, só para contar páginas. User Story validada; recorte backend reduzido no roadmap.
- **Engenheiro**: `docs/engineering/specs/009-pdf-por-pagina.tsd.md` — apresentada e **aprovada pelo usuário** ("Aprova, pode implementar").
- **Dev**: `Analise.totalPaginasPdf Int?` + migration `20260901020000_analise_total_paginas` (só `ALTER TABLE ADD COLUMN`, gerada por `prisma migrate diff`); `src/analises/contar-paginas-pdf.ts` (`contarPaginasPdf` best-effort com `pdf-lib`, `null` quando não parseável, nunca lança); `AnalisesService.criar` calcula e persiste `totalPaginasPdf` (não bloqueia a criação); `AnaliseDetalhe`/`montarAnaliseDetalhe` expõem `totalPaginasPdf` no `GET /analises/:id`; `validarEResolverPatch` ganha 3º parâmetro `totalPaginasPdf` e valida `paginaReferencia` (`1..total` | `≥1` | `null` → senão `422`), **sem** disparar a regra R-06; `lerPagina` seam com comentário atualizado (porta + adapter). Dep nova: `pdf-lib` ^1.17.1. +16 unit (contagem + validação de página) + 4 integração (criar→payload; PATCH ok/fora do intervalo/limpar/total desconhecido).
- **Testes**: `npm run ci` ✅ — lint, typecheck, `prisma:validate`, **91 unit**, build. `npm run test:e2e` ✅ **32/32** (7 suites), migration nova aplicada pelo `embedded-postgres`.
- **Crítico**: aprovado, sem desvios de escopo. Menores: `contarPaginasPdf` roda no caminho do request de criação (aceitável no MVP, já em TSD §5/§9; move-se para o worker se pesar); `pdf-lib` imprime warnings de parse no console em PDFs malformados (ruído de log, correção tratada pelo `catch`); 3º parâmetro `totalPaginasPdf` com default `null` em vez de obrigatório (mantém call sites internos compilando; o único chamador real passa explícito).
- **Documentador**: SDD §7 (Criar análise — `total_paginas_pdf`; Revisar requisito — `paginaReferencia`; Abrir análise — `totalPaginasPdf`; `GET /analises/:id/pdf` sem param de página), §8 (`analise`, `avaliacao_requisito`, `ArmazenamentoPdfPort`), §9 (linha de decisão RF-014); `questoes-abertas.md` P-05 → **parcialmente fechada**; checkpoint; roadmap RF-014 → `implementada` (branch).

Estado: ciclo fechado, **branch aguardando merge + push**. Próximo backend: RF-012+RF-013+RF-015 (conclusão da análise), depois RF-016 (relatório), depois a integração da IA real (A-02).

## 31/08/2026 — RF-008 + RF-011 + RF-017 / TSD-008: revisão de requisito (backend)

Contexto: usuário mandou "faz o merge e abre o ciclo de RF-008+RF-011+RF-017". TSD-007 mergeada na `main` (`b648908` fecha; `96ff8fb` traz o código). Ciclo na branch `backend/rf-008-revisao-requisito`.

Papéis:

- **PM**: 4 perguntas — P-03 e "desmarcar verificado" respondidas pelo usuário; rota e resposta "você decide". Decisões: comentário obrigatório **só quando `statusFinal ≠ statusSugeridoIa`** (invariante — R-06); `verificado` alterna livre; rota `/requisitos/:requisitoId`; resposta `{ item, resumo }`. **P-03 fechado** (`questoes-abertas.md` R-06).
- **Engenheiro**: `docs/engineering/specs/008-revisao-requisito.tsd.md`.
- **Dev**: refactor `analise-detalhe.ts` (exporta `toItem`, extrai `calcularResumo`); `status-requisito.ts` (+ `isStatusRequisito`); `revisao-requisito.ts` (`validarEResolverPatch` puro); `AnalisesService.revisarRequisito` (404/409/422 + update + resumo recalculado); `PATCH /analises/:id/requisitos/:requisitoId`. +10 unit + 1 integração.
- **Testes**: `npm run ci` ✅ (75 unit) · `npm run test:e2e` ✅ 28/28.
- **Crítico**: aprovado, sem desvios. Menores: comentário de avaliação divergente não pode ser apagado (intencional R-06); `resumo` via `findMany`; last-write-wins concorrente.
- **Documentador**: SDD §7 (contrato de "Revisar requisito"); checkpoint; roadmap RF-008/011/017 → `implementada` (branch); P-03 → R-06.

Estado: ciclo fechado, **branch aguardando sign-off + merge**. Próximo backend: RF-014 (PDF por página).

## 31/08/2026 — RF-009 / TSD-007: abrir análise (backend)

Contexto: usuário mandou "faz o merge e abre o ciclo de RF-009". TSD-006 mergeada na `main` (`64b2909` fecha; `67ff89f` traz o código). Ciclo na branch `backend/rf-009-abrir-analise`.

Papéis:

- **PM**: 4 perguntas — statusFinal e resumo escolhidos pelo usuário; formato do endpoint e agrupamento "você decide" → IA: enriquecer `GET /analises/:id`, agrupado por área no backend. Registrado em `perguntas-e-respostas.md`.
- **Engenheiro**: `docs/engineering/specs/007-abrir-analise.tsd.md`.
- **Dev**: `src/analises/analise-detalhe.ts` (`montarAnaliseDetalhe` pura — agrupa por área alfabética, `NAO_CONFORME` por `statusFinal` primeiro depois `ordem`, `norma` estruturada, `resumo`); `AnalisesService.abrir` (buscarPorId + `findMany` com `include: requisito`); `GET /analises/:id` passa a devolver o `AnaliseDetalhe`. Contrato anterior preservado. +4 unit + 1 integração.
- **Testes**: `npm run ci` ✅ (65 unit) · `npm run test:e2e` ✅ 24/24.
- **Crítico**: aprovado, sem desvios. Menores: payload cresce com a base real (§9); método do controller ainda `buscar`.
- **Documentador**: SDD §7 item 2 (payload de `GET /analises/:id`); checkpoint; roadmap RF-009 → `implementada` (branch).

Estado: ciclo fechado, **branch aguardando sign-off + merge**. Próximo backend: RF-008 + RF-011 + RF-017 (revisão de requisito).

## 31/08/2026 — RF-005 + RF-007 / TSD-006: processamento da análise (backend)

Contexto: usuário mandou "faz o merge e abre o ciclo de RF-005+RF-007". RF-002/TSD-005 mergeada na `main` (`ce30442` fecha; `57b170f` traz o código). Ciclo na branch `backend/rf-005-processamento`.

Papéis:

- **PM**: agrupou RF-005+RF-007. 4 perguntas, todas "você decide" → decisões da IA: disparo imediato + varredura 5s + recuperação no boot (sob `PROCESSAMENTO_AUTO`); `POST /analises/:id/reprocessar`; `IA_TIMEOUT_MS=120000`; base vazia → `ERRO_PROCESSAMENTO`. Registrado em `perguntas-e-respostas.md`.
- **Engenheiro**: `docs/engineering/specs/006-processamento-analise.tsd.md`.
- **Dev**: model `AvaliacaoRequisito` + migration `20260901010000` (FK cascade/restrict, `@@unique`); `ProcessamentoService` (claim atômico via `updateMany` count, `comTimeout`, gravação transacional de 1 avaliação/requisito com default `NAO_SE_APLICA`, `PRONTA_PARA_REVISAO`/`ERRO_PROCESSAMENTO`, `processarPendentes` single-flight, `recuperarPresas`, `disparar`); `AnalisesService.criar` dispara; `reprocessar` + `POST /analises/:id/reprocessar`. Config `IA_TIMEOUT_MS`/`PROCESSAMENTO_INTERVALO_MS`/`PROCESSAMENTO_AUTO`. **`@nestjs/schedule` descartado** (ESM-only, quebra o ts-jest CJS) → `setInterval` próprio + `onModuleDestroy`.
- **Testes**: `npm run ci` ✅ (**61 unit**) · `npm run test:e2e` ✅ **21/21** (+ integração `processamento`: processar, claim atômico não duplica, base vazia→erro, reprocessar 200/409/404, `recuperarPresas`).
- **Crítico**: aprovado. Desvio do `@nestjs/schedule` justificado. Menores: falha na transação da etapa 6 deixa `PROCESSANDO` até o boot (varredura só olha `PENDENTE`) → nova questão **A-07**; `comTimeout` não cancela a chamada subjacente.
- **Documentador**: SDD §6/§7/§8/§9; checkpoint; roadmap RF-005/RF-007 → `implementada` (branch); `questoes-abertas.md` A-07.

Estado: ciclo fechado, **branch aguardando sign-off + merge**. Próximo backend: RF-009 (abrir análise — leitura das avaliações agrupadas/ordenadas).

## 31/08/2026 — RF-002 / TSD-005: listagem de análises (backend)

Contexto: usuário mandou "segue pro próximo passo". Antes de abrir RF-002, a branch `backend/rf-001-criar-analise` (TSD-004) foi empurrada e mergeada na `main` por fast-forward (`6c7e983..9dd6792`). Ciclo de RF-002 na branch `backend/rf-002-listagem` (a partir do `main`).

Papéis:

- **PM**: User Story + critérios no roadmap; P-06 (contrato da listagem) fechado — usuário respondeu "você decide" nas 3 perguntas; a IA decidiu: contrato completo (`q` em nup+objeto insensitive, `status` multi, `ordenarPor` iniciadaEm|nup, `ordem`, `pagina`/`tamanho` 20/máx 100), resposta `{ itens, total, pagina, tamanho }`, itens com 6 campos, sem contagens.
- **Engenheiro**: `docs/engineering/specs/005-listagem-analises.tsd.md`.
- **Dev**: `src/analises/listar-analises.query.ts` (parser + 422), `AnalisesService.listar` (where + orderBy dinâmico + skip/take + `$transaction([findMany, count])`), rota `GET /analises` no controller. `test:e2e` passou a rodar `--runInBand` (dois integration specs mutam a mesma tabela `analise` no Postgres compartilhado). +11 unit + 1 integração (7 casos).
- **Testes**: `npm run ci` ✅ (49 unit) · `npm run test:e2e` ✅ 16/16.
- **Crítico**: aprovado, com feedback aplicado no ciclo — parser passou a aceitar param repetido (`?status=A&status=B`), não só vírgula (antes: 500 em vez de 422). +1 unit. Re-teste verde.
- **Documentador**: SDD §7 (contrato de `GET /analises`); checkpoint §1/§2/§3/§3.1/§5/§7; roadmap RF-002 → `implementada` (branch); `questoes-abertas.md` P-06 → fechada (R-05).

Estado: ciclo fechado, **branch aguardando sign-off + merge**. Próximo backend: RF-005 + RF-007 (worker + gravação da sugestão) — cria `avaliacao_requisito`.

## 31/08/2026 — RF-001 + RF-004 + RF-018 / TSD-004: criar análise com PDF persistido (backend)

Contexto: usuário pediu "abre o ciclo do PM e siga com o desenvolvimento das próximas partes". Ciclo completo na branch `backend/rf-001-criar-analise` (a partir do `main` `13b111e`).

Papéis:

- **PM**: agrupou RF-001+RF-004+RF-018 num ciclo backend. User Story + critérios no roadmap; 4 perguntas ao usuário. Respostas: PDF válido = mimetype `application/pdf` + magic bytes `%PDF-` + limite 25 MB (`ANALISE_PDF_TAMANHO_MAX_MB`) + recusa `/Encrypt`; NUP string livre (≤60); `status` todos os valores do SDD como string+allowlist; NUP repetido permitido (sem unique).
- **Engenheiro**: `docs/engineering/specs/004-criar-analise.tsd.md`.
- **Dev**: model `Analise` + migration `20260901000000_criar_analise`; `src/analises/` (`status-analise.ts`, `ValidacaoAnaliseService`, `AnalisesService`, `AnalisesController`); `POST /analises` (multipart via `FileInterceptor`), `GET /analises/:id`, `GET /analises/:id/pdf` (`StreamableFile`); config `ANALISE_PDF_TAMANHO_MAX_MB`; dep `@types/multer`. +15 unit + 1 integração (`analises.integration-spec`).
- **Testes**: `npm run ci` ✅ (lint, typecheck, prisma validate, **38 unit**, build) · `npm run test:e2e` ✅ **9/9** (health + requisitos-importador + analises: criar→buscar→baixar PDF, 422 sem criar linha, 404s), Postgres embutido.
- **Crítico**: aprovado. Refinação: `POST /analises` responde **201** (não 202 — nada assíncrono na requisição); SDD §7 ajustado. Menores: `STATUS_ANALISE` seam para RF-005; heurística `/Encrypt`; teto multer 60 MB; PDF órfão possível se `create` falha após `salvar` (aceito no MVP).
- **Documentador**: SDD §7/§8 (`analise` implementada, 201); checkpoint §1/§2/§3/§5/§7; roadmap RF-001/004/018 → `implementada`; nova questão **P-11** (máscara do NUP).

Estado: ciclo fechado, **branch aguardando sign-off + merge na `main`**. Próximo backend: RF-002 (listagem — depende de P-06).

## 31/08/2026 — Merge da fundação backend + RF-006 na `main`; modelo de branch definido

Contexto: usuário questionou se valia fazer merge na `main` ou manter uma branch longa por pessoa até o fim. Decidido: **merge frequente na `main`**, porque os documentos vivos do método (`checkpoint.md`, `roadmap.md`, `audit.md`, `questoes-abertas.md`) são fonte de verdade única e branches longas divergentes os inviabilizam.

Ações:

- `git push -u origin backend/tsd-001-fundacao-tecnica` (backup/visibilidade).
- `git checkout main && git merge --ff-only backend/tsd-001-fundacao-tecnica` → fast-forward `0b90f8a..13b111e` (76 arquivos, sem commit de merge, sem conflito).
- `git push origin main`.

Modelo de branch adotado daqui pra frente: **uma branch curta por ciclo/TSD**, mergeada no `main` quando o Documentador fecha. Frentes backend/frontend em pastas distintas → merges por ciclo quase não conflitam. A branch `backend/tsd-001-fundacao-tecnica` acumulou 3 ciclos (TSD-001 + RF-006 + infra de teste) — foi o sintoma do modelo "uma branch por pessoa"; agora mergeada, não usar mais.

Fechamento (Documentador): TSD-001 e TSD-003 → `concluída`; roadmap RF-006 (backend) → `implementada`; checkpoint §1/§2/§3/§5/§7 atualizados.

Próximo: backend abre ciclo de RF-001+RF-004+RF-018 em `backend/rf-001-criar-analise`; frontend faz a TSD-002 em `frontend/tsd-002-fundacao`, ambas a partir do `main` `13b111e`.

## 31/08/2026 — Infra de teste: PostgreSQL embutido (resolve pendência de e2e)

Contexto: usuário perguntou se dava pra instalar Docker nesta máquina. Não dá — sem WSL2, sem privilégio de admin, e Docker Desktop mexe em config de sistema/virtualização (fora do que a IA deve fazer). Alternativa implementada para destravar `test:e2e` sem Docker.

Alterações (`backend/`):

- dep dev `embedded-postgres` (só publica betas — `18.4.0-beta.17`; aceito por ser infra de teste, com teardown blindado).
- `test/embedded-postgres.globalSetup.ts`: sobe um PostgreSQL self-contained numa porta dedicada (54329), aplica `prisma migrate deploy`, grava um handle em `os.tmpdir()`. `E2E_EXTERNAL_DB=true` + `DATABASE_URL` pula o embutido (CI com serviço de Postgres).
- `test/embedded-postgres.globalTeardown.ts`: mata o processo pelo `postmaster.pid` (hard kill cross-platform — `taskkill /F /T` no Windows, `SIGKILL` no resto), com `pg.stop()` como fallback; limpa o tmp dir com retries. Nunca trava, nunca falha a run.
- `test/embedded-postgres.d.ts`: tipos mínimos (pacote é ESM-only sem campo `types`; `moduleResolution: node` clássico não acha os `.d.ts`).
- `test/jest-e2e.json`: `globalSetup`/`globalTeardown` + `testTimeout` 30s. `test:e2e` roda com `--forceExit`.
- `setup-e2e-env.ts`: `DATABASE_URL` sai daqui (quem define é o globalSetup).
- `prisma/migrations/20260831010000_base_fixa_requisitos/migration.sql`: removida uma linha `warn ...` do Prisma que tinha vazado no arquivo pelo `>` de stdout na autoria (causava `syntax error at or near "warn"` no `migrate deploy`).

Validação (Windows, sem Docker):

- `npm run ci` ✅ (lint, typecheck, prisma validate, `test` 23/23, build)
- `npm run test:e2e` ✅ 5/5 (`health.e2e-spec` + `requisitos-importador.integration-spec`), rodado 2× seguidas (idempotência de porta/dir), sem processos ou tmp dirs órfãos.

Efeito: a pendência de ambiente carregada por TSD-001 e TSD-003 está **resolvida**. Ambas passam a bateria completa; falta só o sign-off humano e o merge na `main`. Docs atualizadas: `quality-gates.md`, `context-map.md`, `backend/README.md`, checkpoint, TSD-001 §9, TSD-003 §7.1/§9.

Follow-up aberto: migrar `package.json#prisma` para `prisma.config.ts` antes do Prisma 7 (hoje só um warning).

## 31/08/2026 — RF-006 / TSD-003: base fixa de requisitos (backend)

Contexto: pós-TSD-001, usuário pediu "siga com o processo" e commits na branch de backend. Ciclo completo de RF-006 (recorte backend) na branch `backend/tsd-001-fundacao-tecnica`.

Papéis:

- **PM**: confirmou RF-006 como início; rascunhou User Story + critérios no roadmap; 5 perguntas ao usuário. Respostas aplicadas: seed via importador de arquivo externo (não lista em código); `norma_referencia` estruturada; sem coluna de versão (imutabilidade + `ativo=false`); `area` como campo flexível, não enum; sem endpoint HTTP neste slice. `obrigatorio` decidido imutável (efeito normativo).
- **Engenheiro**: `docs/engineering/specs/003-base-fixa-requisitos.tsd.md` (aprovada pelo usuário).
- **Dev**: modelo Prisma `Requisito` + migration `20260831010000_base_fixa_requisitos`; `src/requisitos/` (areas allowlist, importador `parse`/`validar`/`importarRequisitos` transacional, `ImportadorRequisitosService`, `RequisitosService.listarAtivos()`); `prisma/seed.ts` + `seed-data/requisitos.csv` (placeholder 12 itens); dep `csv-parse`; `test:e2e` passou a cobrir `test/integration/`. 4 specs unit novas.
- **Testes (mecânico)**: `lint` ✅ · `typecheck` ✅ · `prisma validate` ✅ · `test` ✅ 23/23 (8 suites) · `build` ✅ · `test:e2e` ⛔ (health + integração) — sem Docker/Postgres nesta máquina (`Can't reach database server at localhost:5432`).
- **Crítico**: aprovado; todos os critérios da TSD-003 atendidos no código e nos unitários; pendência = rodar os testes de integração contra Postgres. Observações menores: aviso de deprecação `package.json#prisma`; `ImportadorRequisitosService` sem consumidor ainda.
- **Documentador**: checkpoint §1/§3.1/§4/§7, SDD §8 (linha `requisito`), roadmap (RF-006 backend → `em validação`), `questoes-abertas.md` (A-03 fechada).

Decisões: ver linhas novas no checkpoint §4. Nada de merge na `main` até a bateria com Postgres passar.

Pendências: `docker compose up -d db && npm run prisma:migrate && npm run seed && npm run test:e2e`; depois fechar TSD-001 + RF-006 e mergear; abrir próximo ciclo backend (RF-001+RF-004+RF-018).

## 31/08/2026 — TSD-001: implementação da fundação técnica do backend

Contexto: TSD-001 aprovada. Usuário pediu para implementar o backend numa branch separada.

Branch: `backend/tsd-001-fundacao-tecnica` (a partir da `main`).

Alterações:

- Raiz: `.gitignore`, `.gitattributes` (LF), `.nvmrc` (20), `README.md` reescrito para o projeto (duas frentes); README do método movido para `.ai-dev/README.md` (via `git mv`).
- `backend/`: projeto NestJS 11 + TypeScript (strict). `package.json` com scripts `lint`/`typecheck`/`test`/`test:e2e`/`test:contract`/`build`/`ci` e `prisma:*`. ESLint flat (`eslint.config.mjs`) + Prettier. `tsconfig(.build).json`, `nest-cli.json`.
- Prisma: `schema.prisma` (datasource postgres, generator client, **sem tabelas de domínio**), migration inicial vazia + `migration_lock.toml`. `docker-compose.yml` com Postgres 16.
- `src/`: `ConfigModule` global com `validateEnv` (falha no boot se faltar env obrigatória); `PrismaModule`/`PrismaService` (connect no boot, `healthCheck` = `SELECT 1`); `CoreModule` com as portas `AnaliseIaPort` e `ArmazenamentoPdfPort` (interfaces + tokens), adapters `AnaliseIaStubAdapter` (determinístico) e `ArmazenamentoPdfFilesystemAdapter`, e `AnalistaAtualProvider` (analista fixo por config); `HealthModule` (`GET /health` → 200 com `{status, db, timestamp}`); módulos de feature vazios `Analises/Requisitos/Processamento/Relatorio`. `main.ts` com `enableShutdownHooks`.
- `test/`: `test/unit/` com 4 specs (health service, stub adapter, filesystem adapter, analista atual provider — 8 testes); `test/e2e/health.e2e-spec.ts` (Supertest); `test/integration/` e `test/contract/` vazios (`.gitkeep`); configs `jest-e2e.json` e `jest-contract.json`.

Validações (rodadas de `backend/`):

- `npm run lint` ✅ (após `--fix` de formatação Prettier)
- `npm run typecheck` ✅
- `npx prisma validate` ✅ · `npx prisma generate` ✅ (client v6.19.3)
- `npm run test` ✅ — 8 testes, 4 suites
- `npm run build` ✅
- `npm run test:contract` ✅ (sem testes, `--passWithNoTests`)
- `npm run test:e2e` ⛔ **não executável nesta máquina** — sem Docker/Postgres: `PrismaClientInitializationError: Can't reach database server at localhost:5432`. Não é defeito de código; TSD-001 §9 previu esse gap. Pendência aberta: rodar com Docker.

Decisões: código do serviço em `backend/` (fecha a questão de local do código); sem gerenciador de workspace no monorepo (cada pacote isolado); `AnaliseIaPort` com `IA_ADAPTER=http` falhando explicitamente até existir adapter real (A-02).

Pendências: e2e com Postgres; revisão do Crítico; merge da branch na `main` após fechamento do ciclo.

## 31/08/2026 — Fundação: bootstrap do método para LicIA Analisadora

Contexto: repositório continha o Método Agentico v2 + um exemplo preenchido (PRD LicIA + protótipo visual) e nenhum `docs/engineering/checkpoint.md`. Usuário pediu para começar o projeto; confirmado que o projeto é a própria LicIA Analisadora. Seguido o roteiro de `.ai-dev/bootstrap.md`.

Alterações:

- Etapa 0: `{{NOME_DO_PROJETO}}` → "LicIA Analisadora" em `START_HERE.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.ai-dev/workflow.md`, `.ai-dev/quality-gates.md`, `.ai-dev/audit.md`, `.ai-dev/context-map.md`.
- Etapa 1: `docs/product/prd.md` aprovado como baseline; RF-016 e RF-018 promovidos a Must/MVP; RF-003 e estado "sem permissão" marcados pós-MVP; regras de negócio de identidade reescritas (analista único fixo). Criado `docs/product/questoes-abertas.md` (P-01..P-10, A-01..A-06, R-01..R-04).
- Etapa 2: criado `docs/architecture/sdd.md` (aprovado); `.ai-dev/quality-gates.md` preenchido com comandos NestJS/Prisma reais; criado `docs/engineering/decisions/001-framework-backend-nestjs.md` (NestJS; Fastify descartado).
- Etapas 3–4: `.ai-dev/context-map.md` seções de testes e de contexto visual preenchidas (inclui divergências protótipo × PRD).
- Etapa 5: criado `docs/product/glossario.md`.
- Etapa 6: criados `docs/engineering/checkpoint.md`, `docs/product/roadmap.md` e `docs/engineering/specs/001-fundacao-tecnica.tsd.md` (draft).
- Após revisão da Etapa 6, o usuário pediu para dividir o trabalho em **duas frentes paralelas num monorepo**: `backend/` (Pablo) e `frontend/` (Vinicius, em branch). Reescrito o `roadmap.md` com duas tabelas de sequenciamento (Backend / Frontend); ajustados SDD §2/§3/§5, `quality-gates.md`, `context-map.md` e checkpoint; TSD-001 reescopada para `backend/` (decisão de local do código fechada); criada `docs/engineering/specs/002-fundacao-frontend.tsd.md` (draft, Next.js + Vitest + camada de dados com fixtures).

Validações: nenhuma execução de código (fundação documental). Nenhum quality gate rodado — não há projeto de código ainda.

Decisões: nome do projeto; PRD baseline; RF-016/RF-018 no MVP; MVP sem identidade (analista único); stack Node/TS/NestJS/PostgreSQL/Prisma (DR-001); processamento assíncrono em processo; relatório PDF sob demanda; monorepo com frentes backend/frontend independentes; fundação em TSD-001 (backend) + TSD-002 (frontend).

Estado no fim da sessão: TSD-001 aprovada mas NÃO implementada (a pedido do usuário). TSD-002 aguardando aprovação.

Pendências: aprovar TSD-002; subir fundação no GitHub para handoff; implementar TSD-001 e TSD-002; questões abertas A-02, A-03/P-07, A-05/P-09, P-10; confirmar se `docs/licia-analisadora-product-discovery.md` está versionado.
