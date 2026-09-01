# TSD — Modal "Nova análise" + upload de PDF (RF-001 + RF-004, frontend)

---
title: TSD - Modal "Nova análise" + upload de PDF (RF-001/RF-004, frontend)
type: tsd
status: implementada na branch frontend/rf-001-nova-analise — aguardando revisão e merge
created: 01/09/2026 // Vinicius
updated: 01/09/2026 // Vinicius
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/004-criar-analise.tsd.md
- docs/engineering/specs/011-listagem-analises-frontend.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

Segundo ciclo de feature de produto do frontend, agrupando **RF-001** (criar análise: NUP,
objeto) e **RF-004** (upload manual de PDF). O botão "Nova análise" da listagem — hoje
desabilitado — passa a abrir um **modal** com os três campos, validação client-side e envio
via seam de dados (`POST /analises` multipart, contrato TSD-004). Em sucesso, navega para
`/analise/[id]`. Cobre os estados de erro do PRD §9 (PDF inválido, erro no upload/persistência)
preservando os dados já digitados.

**User Story de origem:** `docs/product/roadmap.md`, RF-001 (recorte frontend, ciclo
agrupado RF-001 + RF-004).

## 2. Objetivo técnico

- `NovaAnaliseModal` (client) com campos NUP, Objeto, Arquivo (clique + arrastar-e-soltar).
- Validação client-side: obrigatórios; arquivo `application/pdf`; tamanho ≤ 25 MB
  (`ANALISE_PDF_TAMANHO_MAX_MB` do backend). "Confirmar" desabilitado até válido; erro por campo.
- `AnalisesGateway.criarAnalise(input)` — `HttpAnalisesGateway` faz `POST {base}/analises`
  (FormData `nup`/`objeto`/`arquivo`), mapeia `201`, `422` (→ erro de validação com motivos) e
  `5xx`/rede (→ erro de gateway). `FixturesAnalisesGateway` valida e devolve uma análise
  sintética `PENDENTE`.
- Sucesso → fecha o modal, `router.push('/analise/<id>')`.
- Erro de servidor/rede → banner no modal, **campos preservados**, permite reenviar.
- `npm run ci` verde; screenshots dos estados vs REF (modal do protótipo).

## 3. Escopo

### Incluído

- `src/components/analises/NovaAnaliseButton.tsx` (client) — substitui o `<button disabled>` do
  `AnalisesToolbar`; controla `open` e renderiza o modal; no `onCreated(id)` faz `router.push`.
- `src/components/analises/NovaAnaliseModal.tsx` (+ `.module.css`) — client. `role="dialog"`,
  `aria-modal`, fecha por Escape / clique fora / botão × / Cancelar (bloqueado enquanto envia);
  `createPortal` para `document.body` após montar; foco inicial no campo NUP.
- `src/lib/data/nova-analise.ts` — `ANALISE_PDF_TAMANHO_MAX_MB = 25`, `NUP_MAX = 60`,
  `OBJETO_MAX = 2000`; `validarArquivoPdf(file)` e `validarNovaAnalise({ nup, objeto, arquivo })`
  → `{ ok, erros: { nup?, objeto?, arquivo? } }` (puros).
- `src/lib/data/types.ts` — `NovaAnaliseInput` (`{ nup, objeto, arquivo: File }`), `AnaliseCriada`
  (`{ id, nup, objeto, status, iniciadaEm }`).
- `src/lib/data/analises-gateway.ts` — `criarAnalise(input): Promise<AnaliseCriada>` na interface;
  `AnaliseValidacaoError extends AnalisesGatewayError` (com `motivos: string[]`).
- `src/lib/data/fixtures-analises-gateway.ts` — `criarAnalise`: revalida; inválido →
  `AnaliseValidacaoError`; válido → `AnaliseCriada` com `id` gerado e `status: "PENDENTE"`.
  **Não** entra na lista de fixtures (andaime — ver §9).
- `src/lib/data/http-analises-gateway.ts` — `criarAnalise` multipart; parse do `201`; `422` →
  `AnaliseValidacaoError` (lê `message` string|array); `≥ 500` / rede → `AnalisesGatewayError`.
- `src/lib/data/index.ts` — exporta os novos símbolos.
- `src/components/icons/index.tsx` — `XmarkIcon`, `UploadIcon`, `CircleCheckIcon`, `TrashIcon`.
- `src/components/analises/AnalisesToolbar.tsx` — usa `NovaAnaliseButton`.
- Testes: `nova-analise` (validações), `fixtures-analises-gateway` (`criarAnalise`),
  `http-analises-gateway` (`criarAnalise` — contrato), `nova-analise-modal` (RTL),
  `nova-analise-button` (RTL).

### Fora do escopo

- Validação de magic bytes `%PDF-` / `/Encrypt` no cliente — o backend é a autoridade e
  devolve `422`; o modal exibe o motivo. Client-side fica em tipo + tamanho.
- Máscara / validação de formato do NUP (questão aberta).
- Visor de PDF, tela de análise além da casca (RF-010+).
- Atualizar a lista in-place após criar (navega para a análise; a lista é `force-dynamic` e
  re-busca ao voltar — com a API real reflete; com fixtures não, ver §9).
- Progresso de upload (barra %), cancelamento de upload em andamento.
- Focus-trap completo (Tab cíclico) — só foco inicial + Escape/overlay nesta slice.

## 4. Contexto consultado

- `START_HERE.md`, `.ai-dev/context-map.md`, `docs/engineering/checkpoint.md`
- `docs/product/prd.md` — RF-001, RF-004, §9 (PDF inválido; erro no upload; erro de persistência)
- `docs/architecture/sdd.md` — §7 "Criar análise" (201, PENDENTE)
- `docs/engineering/specs/004-criar-analise.tsd.md` — contrato `POST /analises` (campos,
  `422`/`502`, limite 25 MB, `nup ≤ 60`, `objeto ≤ 2000`)
- `docs/engineering/specs/011-listagem-analises-frontend.tsd.md` — seam de dados, toolbar
- `Prototipo Licia Analisadora/src/routes/HomePage/NewAnalysisModal.{tsx,module.css}`
- `.ai-dev/visual-reference-workflow.md`, `.ai-dev/quality-gates.md`, glossário

## 5. Impacto esperado

- **Produto:** o analista consegue criar uma análise pela UI e é levado à tela dela.
- **Arquitetura:** `AnalisesGateway` ganha `criarAnalise` (multipart) nas duas implementações;
  nenhuma decisão nova.
- **Implementação:** novo modal + validações; ícones novos.
- **Testes:** contrato de `POST /analises` no frontend; testes de componente do modal.
- **Documentação:** roadmap (RF-001/RF-004 frontend), checkpoint, `.ai-dev/audit.md`, evidência visual.
- **Operação:** sem deploy.

## 6. Plano de implementação

1. `nova-analise.ts` (constantes + validações puras) + tipos.
2. `AnalisesGateway.criarAnalise` + `AnaliseValidacaoError`; implementar nas duas gateways.
3. Ícones (`XmarkIcon`, `UploadIcon`, `CircleCheckIcon`, `TrashIcon`).
4. `NovaAnaliseModal` (+ CSS) e `NovaAnaliseButton`; ligar no `AnalisesToolbar`.
5. Testes (validações, `criarAnalise` fixtures + contrato, modal, botão).
6. `npm run ci`; screenshots dos estados; comparação com o modal do protótipo.
7. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, evidência visual.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `validarNovaAnalise`/`validarArquivoPdf` (nup vazio/>60, objeto vazio/>2000, sem arquivo, tipo ≠ pdf, > 25 MB, happy). `FixturesAnalisesGateway.criarAnalise` (happy → `AnaliseCriada` PENDENTE; inválido → `AnaliseValidacaoError`). Componentes: `NovaAnaliseModal` (campos, "Confirmar" habilita só quando válido, submit chama o gateway e `onCreated` no sucesso, banner + dados preservados no erro, erro client-side bloqueia envio) e `NovaAnaliseButton` (abre o modal) com `next/navigation` mockado. |
| Integração (módulos/camadas reais) | Não nesta slice | Sem backend/servidor de arquivos real; a cadeia modal→gateway→(fixtures) é coberta no unitário. Integração real modal→API entra quando houver ambiente conjunto. |
| Contrato (formato entre serviços que não sobem juntos) | Sim | `HttpAnalisesGateway.criarAnalise` consome `POST /analises` (TSD-004). `test/unit/http-analises-gateway.test.ts` valida: método/URL/FormData (`nup`,`objeto`,`arquivo`), parse do `201 { id, status: "PENDENTE", … }`, `422` → `AnaliseValidacaoError` com `motivos`, `502`/`5xx` → `AnalisesGatewayError`, erro de rede → `AnalisesGatewayError`. |
| Smoke/validação manual contra dependência externa real | Não | Backend não está no ar aqui; `NEXT_PUBLIC_API_BASE_URL` desligada. Rodar smoke criar→abrir quando houver ambiente conjunto. |

Slice de interface: **screenshots** do modal (vazio, com arquivo anexado, erro client-side de
arquivo, erro de envio) e comparação de enquadramento com o modal do protótipo.

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run ci
```

## 8. Critérios de aceite

- [x] O botão "Nova análise" abre o modal; ele fecha por ×, Cancelar, Escape e clique fora (não enquanto envia).
- [x] Campos NUP (≤ 60), Objeto (≤ 2000) e Arquivo; "Confirmar" só habilita com os três válidos.
- [x] Arquivo não-PDF ou > 25 MB → erro na área do arquivo, sem enviar (PRD §9 "PDF inválido").
- [x] Sucesso → `POST /analises` multipart; fecha o modal e navega para `/analise/[id]` (id do `201`).
- [x] Erro `422` → mostra os motivos do backend no modal; erro `5xx`/rede → banner "não foi possível criar"; em ambos os casos **NUP/objeto/arquivo digitados são preservados** e é possível reenviar (PRD §9 "erro no upload"/"erro de persistência").
- [x] `criarAnalise` existe nas duas gateways; `getAnalisesGateway()` usa HTTP quando `NEXT_PUBLIC_API_BASE_URL` está definida.
- [x] `npm run ci` verde: `eslint .` + prettier, `tsc --noEmit`, testes (inclui contrato de `POST /analises`), `next build`.
- [x] §10 preenchida e revisada; screenshots do modal comparados com o protótipo — `frontend/docs/visual-reference/rf-001/`.

## 9. Riscos e decisões abertas

### Decisões da slice

- **Modal por estado de client** (não por URL): UI efêmera; segue o protótipo. `createPortal`
  para `document.body`.
- **Validação de arquivo client-side = tipo + tamanho.** Magic bytes / `/Encrypt` ficam no
  backend (`422`), que o modal exibe. Evita ler o arquivo no cliente e duplicar regra.
- **Limite 25 MB** exibido e validado (o protótipo dizia 50 MB — divergência registrada; o
  backend usa 25 MB por `ANALISE_PDF_TAMANHO_MAX_MB`).
- **Sem "Processando documento…":** o `POST /analises` responde `201` na hora (análise nasce
  `PENDENTE`); o modal fecha e navega. O acompanhamento do processamento é da tela de análise.
- **`criarAnalise` nas fixtures não altera a lista:** devolve uma análise sintética para a
  navegação funcionar; com `NEXT_PUBLIC_API_BASE_URL` a API persiste e a lista reflete. Andaime
  aceito no MVP (as fixtures são estáticas e `getAnalisesGateway()` cria instância por request).

### Riscos remanescentes

- **Sem smoke contra o backend real** (sem ambiente conjunto): `criarAnalise` HTTP validado só
  por teste de contrato. Refazer smoke criar→abrir quando houver ambiente.
- **Formato do corpo `422`:** assume o padrão do Nest (`message: string | string[]`). Se o
  backend padronizar outro envelope de erro, ajustar o parse (um ponto só, no gateway).
- **Focus-trap parcial:** só foco inicial + Escape/overlay. Trap completo fica para um ajuste
  de acessibilidade posterior.

## 10. Referências visuais

Referência: `Prototipo Licia Analisadora/src/routes/HomePage/NewAnalysisModal.{tsx,module.css}`.

| ID | Papel na aplicação | Link/localização | Nome na origem | Estados representados | Status de inspeção |
|---|---|---|---|---|---|
| REF-05 | Modal "Nova análise" (NUP, objeto, upload) | `Prototipo Licia Analisadora/src/routes/HomePage/NewAnalysisModal.tsx` | `NewAnalysisModal` | vazio; arquivo anexado; "processando" | Inspecionado — 01/09/2026 (Vinicius) |

### 10.1 Observações da inspeção

Overlay `preto-1000` 45% + card 752px `--radius-8` `--shadow-modal`. Header: "Nova análise"
+ × verde, regra inferior na cor de marca. Corpo: campo NUP (input), Objeto (textarea
`min-height:80px`, resize vertical), Arquivo — área tracejada com ícone upload + "Clique aqui
ou arraste e solte" + dica; quando anexado, faixa verde com check, nome (ellipsis), tamanho
formatado (ex.: "30,4KB") e lixeira. Rodapé: "Cancelar" (outline) + "Confirmar" (verde,
desabilitado até válido). Estado "processando": spinner + textos centralizados.

### 10.2 Divergências intencionais

- Limite exibido **25 MB** (protótipo: 50 MB).
- Campos/anexo mapeados para o contrato (`objeto`, `arquivo`), não `subject`/`file`.
- **Sem** a simulação "Processando documento…" — `POST` responde `201` e navega.
- Adicionadas **mensagens de erro** (por campo e banner de envio) que o protótipo não tem
  (PRD §9). Erro de arquivo aparece na área do upload; erro de envio, num banner acima do rodapé.
- `accept="application/pdf"` no input + validação de tipo/tamanho antes de habilitar "Confirmar".

### Screenshots

`frontend/docs/visual-reference/rf-001/`: `modal-vazio.png`, `modal-com-arquivo.png`,
`modal-erro-arquivo.png`, `modal-erro-envio.png` + `prototipo-modal.png`. Resultado da
comparação no `README.md` da pasta.

## 11. Rollback

Só `frontend/`. Rollback = remover `NovaAnaliseModal`/`NovaAnaliseButton` (+ CSS),
`src/lib/data/nova-analise.ts`, o método `criarAnalise` das gateways e da interface,
`AnaliseValidacaoError`, os ícones novos e os testes desta slice; voltar `AnalisesToolbar` ao
`<button disabled>`. Nenhum contrato de backend muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (011), a TSD-004 (contrato) e a TSD-011.
Implemente só o escopo, em frontend/, na branch frontend/rf-001-nova-analise. Não faça merge.
Modal client com NUP/Objeto/Arquivo; validação client-side = obrigatórios + tipo PDF + 25 MB.
Envio por AnalisesGateway.criarAnalise (multipart no HttpAnalisesGateway). Sucesso -> navegar
para /analise/[id]. Erro 422 -> motivos do backend; erro 5xx/rede -> banner; preservar os
dados digitados nos dois casos. Escreva os testes previstos, incluindo o de contrato de
POST /analises. Rode npm run ci e registre a saída real. Screenshots do modal vs protótipo.
Atualize roadmap, checkpoint e .ai-dev/audit.md.
```
