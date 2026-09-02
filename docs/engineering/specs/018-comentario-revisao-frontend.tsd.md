# TSD — Justificativa visível + erro de revisão fiel (RF-017, frontend)

---
title: TSD - Comentário nas ações de revisão (RF-017, frontend)
type: tsd
status: implementada
created: 01/09/2026 // Vinicius
updated: 01/09/2026 // Vinicius
related:
- docs/product/prd.md
- docs/architecture/sdd.md
- docs/engineering/specs/008-revisao-requisito.tsd.md
- docs/engineering/specs/014-status-ia-frontend.tsd.md
- docs/engineering/specs/016-alterar-parecer-frontend.tsd.md
- docs/engineering/specs/017-verificado-interativo-frontend.tsd.md
- .ai-dev/visual-reference-workflow.md
---

## 1. Resumo

A **exigência** de comentário nas ações de revisão do frontend já é cumprida pelo RF-008
(o modal "Alterar parecer" sempre pede comentário e explica a R-06; um `422` já aparece no
modal). Esta slice fecha as duas pontas que sobraram:

1. **Visibilidade da justificativa** — num requisito cujo parecer diverge da sugestão da IA
   (`statusFinal ≠ statusSugeridoIa` — o caso que a R-06 governa), o texto do `comentario`
   passa a aparecer como **"Justificativa da alteração"** dentro do bloco `StatusIaResumo`
   (RF-007), amarrado à divergência — não mais só na linha genérica "Comentário:".
2. **Erro fiel à regra** — quando "marcar verificado" (RF-011) é recusado com
   `AnaliseValidacaoError` (`422`), o `RequisitoItem` mostra **a mensagem do backend** no lugar
   do genérico "Não foi possível salvar."

Sem mudança de contrato. Sem componente novo.

**User Story de origem:** `docs/product/roadmap.md`, RF-017 — bloco "User Story (frontend — RF-017)".

## 2. Objetivo técnico

- `StatusIaResumo`: quando `diverge` e `item.comentario` não é vazio, renderiza uma linha
  "Justificativa da alteração:" com o texto, abaixo de "Parecer atual — alterado na revisão".
- `RequisitoItem`: a linha "Comentário:" do bloco expandido passa a aparecer **só quando
  não diverge** (para o item divergente, a justificativa já sai no `StatusIaResumo`; evita
  duplicar o mesmo texto).
- `RequisitoItem`: no `catch` do toggle de "verificado", se o erro é `AnaliseValidacaoError`,
  `erroToggle = erro.motivos[0]`; senão, a mensagem genérica de hoje.
- Testes: `StatusIaResumo` (justificativa aparece só quando diverge + tem comentário);
  `RequisitoItem` (não duplica o comentário no item divergente; `422` do toggle mostra a
  mensagem do backend; `409`/rede seguem genéricos).
- `npm run ci` verde; screenshot do requisito divergente expandido com a justificativa.

## 3. Escopo

### Incluído

- **`src/components/analise/StatusIaResumo.tsx`** (+ `.module.css`):
  - Após o bloco `diverge`, quando `item.comentario?.trim()`:
    `<p><span class="rotulo">Justificativa da alteração:</span> {item.comentario}</p>`.
  - Estilo: mesma família das outras linhas do bloco; o texto pode quebrar em várias linhas.
- **`src/components/analise/RequisitoItem.tsx`**:
  - A renderização condicional `{item.comentario && <p>Comentário: …</p>}` vira
    `{!diverge && item.comentario && <p>Comentário: …</p>}` (o `diverge` já existe no componente).
  - `import { AnaliseValidacaoError } from "@/lib/data"`.
  - `aoAlternarVerificado`: `catch (erro) { setErroToggle(erro instanceof AnaliseValidacaoError ? (erro.motivos[0] ?? MENSAGEM_GENERICA) : MENSAGEM_GENERICA); }`
    (hoje o `catch` é sem binding e usa só a genérica).
- **Testes** (Vitest + RTL): ver §7.1.

### Fora do escopo

- Campo para editar **só** o comentário sem mudar o parecer (o `PATCH` aceitaria `comentario`
  sozinho, mas não há caso de uso claro no MVP; a R-06 impede limpar o comentário de um item
  divergente de qualquer forma).
- **Relaxar** a exigência do modal do RF-008 (decidido "comentário sempre obrigatório" e
  validado pelo usuário — fora de discussão aqui).
- Histórico/lista de comentários; comentário em massa.
- Conclusão da análise (RF-012); visor de PDF / `paginaReferencia` (RF-014).
- Mudança na camada de dados (o `AnaliseValidacaoError` e o `.motivos` já existem desde o RF-008).

## 4. Contexto consultado

- `docs/product/prd.md` — RF-017 ("exigir comentário nas ações de revisão"), §8
- `docs/product/questoes-abertas.md` — **R-06** (comentário obrigatório sse `statusFinal ≠ statusSugeridoIa`)
- `docs/engineering/specs/008-revisao-requisito.tsd.md` — o `PATCH` já valida a R-06 e devolve
  `422` com `message` (Nest); o frontend mapeia para `AnaliseValidacaoError(motivos)`
- `docs/engineering/specs/016-alterar-parecer-frontend.tsd.md` — o modal já exige comentário
  sempre e mostra o `422` (`erroServidor = motivos[0]`)
- `docs/engineering/specs/017-verificado-interativo-frontend.tsd.md` — `RequisitoItem` com
  `erroToggle`; `marcarVerificado` mapeia `422 → AnaliseValidacaoError`
- `docs/engineering/specs/014-status-ia-frontend.tsd.md` — `StatusIaResumo`, `divergeDaIa`
- `Prototipo Licia Analisadora/.../ChecklistItem.tsx` — o comentário (`detail`) aparece no
  corpo do item; o protótipo não distingue "justificativa" de "comentário" (não tem os dois status)

## 5. Impacto esperado

- **Produto:** a justificativa de uma alteração de parecer deixa de ficar escondida numa linha
  genérica — fica colada à divergência que ela explica; e o feedback de "faltou comentário"
  numa ação de revisão passa a dizer o que faltou.
- **Arquitetura:** nenhuma — só apresentação; reusa `AnaliseValidacaoError`/`.motivos`.
- **Implementação:** ~10 linhas em `StatusIaResumo` + 2 ajustes pequenos no `RequisitoItem`.
- **Testes:** `StatusIaResumo` + `RequisitoItem` (sem regressão no RF-007/008/011).
- **Documentação:** roadmap (RF-017 frontend), checkpoint, `.ai-dev/audit.md`, evidência visual, README.
- **Operação:** sem deploy.

## 6. Plano de implementação

1. `StatusIaResumo.tsx` (+ CSS) — linha "Justificativa da alteração".
2. `RequisitoItem.tsx` — condicionar "Comentário:" a `!diverge`; erro do toggle fiel ao `422`.
3. Testes.
4. `npm run ci`; screenshot do item divergente expandido.
5. Atualizar roadmap, checkpoint, `.ai-dev/audit.md`, README, evidência visual.

## 7. Validação

### 7.1 Estratégia de testes

| Tipo | Aplica-se? | Justificativa |
|---|---|---|
| Unitário | Sim | `StatusIaResumo`: com `diverge` + `comentario` → mostra "Justificativa da alteração:" com o texto; com `diverge` e `comentario` vazio/null → não mostra; sem `diverge` → não mostra (mesmo com comentário). `RequisitoItem`: item divergente com comentário → o texto aparece **uma vez** (no `StatusIaResumo`), a linha "Comentário:" **não** duplica; item não divergente com comentário → linha "Comentário:" aparece; toggle de "verificado" que rejeita com `AnaliseValidacaoError(["comentário obrigatório …"])` → `role="alert"` com essa mensagem; rejeição com `AnaliseConflitoError`/erro genérico → mensagem genérica de hoje. |
| Contrato (formato entre serviços) | Não nesta slice | Nenhum campo/endpoint novo; o `422 → AnaliseValidacaoError(motivos)` já é coberto pelos contratos de `revisarRequisito`/`marcarVerificado` (TSD-016/017). |
| Integração (módulos/camadas reais) | Não nesta slice | Só apresentação; sem cadeia nova. |
| Smoke/validação manual contra dependência externa real | Não | Sem backend/CORS (mesmo gap recorrente). |

Slice de interface: **screenshot** de um requisito divergente expandido mostrando
"Sugestão da IA / Parecer atual — alterado na revisão / Justificativa da alteração: …".

### 7.2 Comandos previstos

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run ci
```

## 8. Critérios de aceite

- [x] Num requisito com `statusFinal ≠ statusSugeridoIa` **e** `comentario` preenchido, o bloco expandido mostra **"Justificativa da alteração:"** com o texto, dentro do `StatusIaResumo`.
- [x] Nesse mesmo item, a linha genérica **"Comentário:"** não aparece (sem texto duplicado).
- [x] Num requisito **não** divergente com `comentario`, a linha "Comentário:" continua aparecendo como hoje.
- [x] Uma ação de "marcar verificado" recusada com `422` (`AnaliseValidacaoError`) mostra **`motivos[0]`** no item (`role="alert"`); `409`/`404`/rede continuam com a mensagem genérica.
- [x] Nenhuma mudança de contrato; `npm run ci` verde (`eslint .` + prettier, `tsc`, testes, `next build`); sem regressão nos testes de `StatusIaResumo`/`RequisitoItem`/`PainelRevisao`.
- [x] §10 revisada; screenshot em `frontend/docs/visual-reference/rf-017/`.

## 9. Riscos e decisões abertas

### Decisões da slice (a validar)

- **RF-017 frontend é uma slice pequena de acabamento**, não uma feature nova: a exigência de
  comentário nas ações de revisão do frontend já vem do RF-008 (modal) + backend (R-06 no
  `PATCH`). O que falta é *visibilidade* (a justificativa colada à divergência) e *mensageria*
  (erro fiel no toggle). Registrado assim no roadmap/checkpoint.
- **A justificativa some da linha "Comentário:" quando o item diverge** (aparece só no
  `StatusIaResumo`). Alternativa: mostrar nos dois lugares — descartada por ser texto repetido
  no mesmo card.
- **Não se relaxa** a exigência "comentário sempre" do modal do RF-008. Alinhar 100% à R-06
  (comentário só quando diverge) seria uma mudança de comportamento do RF-008 já validado —
  fica fora desta slice.
- **A mensagem do `422` vem do backend** (string do Nest). Se um dia o texto do backend mudar,
  a UI acompanha automaticamente; não há string espelhada no frontend para o caso R-06.

### Riscos remanescentes

- **Sem backend real**, o `422` do toggle não ocorre com as fixtures (elas não colocam um item
  divergente sem comentário — o RF-008 sempre grava comentário ao divergir). O caminho fica
  coberto por teste de unidade (rejeição forjada), não por screenshot — mesmo critério do RF-011.
- **Comentário longo** no `StatusIaResumo`: a linha quebra em várias linhas; conferir na
  inspeção visual que o bloco âmbar comporta.
- **`item.comentario` com espaços só** — `trim()` na condição evita render de linha vazia.

## 10. Referências visuais

Referência: `Prototipo Licia Analisadora/src/routes/AnalysisPage/components/ChecklistItem.tsx`
— o comentário/observação aparece no corpo do item expandido. O protótipo tem **um** status
por item, então não separa "justificativa da alteração" de "comentário"; a distinção é do
MVP (RF-007 + R-06) e já está materializada no `StatusIaResumo` (REF-07, inspecionada no
RF-007 / TSD-014 §10). Esta slice só **acrescenta uma linha** a esse bloco.

**Divergências intencionais a registrar:** a linha "Justificativa da alteração" não existe no
protótipo (é a materialização da R-06 na tela). Para item divergente, o texto do comentário
aparece no `StatusIaResumo` e **não** na linha "Comentário:" (no protótipo apareceria uma vez
só, sem rótulo específico).

Screenshot obrigatório: requisito divergente expandido com a justificativa visível. Evidência
em `frontend/docs/visual-reference/rf-017/`.

## 11. Rollback

Só `frontend/`. Rollback = remover a linha "Justificativa da alteração" do `StatusIaResumo`,
voltar a condição da linha "Comentário:" do `RequisitoItem` para `{item.comentario && …}` e o
`catch` do toggle para a mensagem genérica, apagar os testes desta slice. Nenhum contrato/tipo
muda.

## 12. Prompt de execução para agente

```text
Leia START_HERE.md, .ai-dev/context-map.md, esta TSD (018), a TSD-008 (backend) e a
TSD-014/016/017 (frontend) e o checkpoint. Implemente só o escopo, em frontend/, na branch
frontend/rf-017-comentario. Não faça merge sem instrução.

StatusIaResumo: quando diverge e item.comentario?.trim(), renderiza
"Justificativa da alteração: <texto>" abaixo de "Parecer atual — alterado na revisão".
RequisitoItem: a linha "Comentário:" passa a ser condicionada a !diverge; no catch do
toggle de verificado, se o erro é AnaliseValidacaoError usa erro.motivos[0], senão a
mensagem genérica. Importar AnaliseValidacaoError de @/lib/data.

Escreva os testes previstos (§7.1). Rode npm run ci e registre a saída real. Screenshot do
requisito divergente expandido com a justificativa. Rode o Agente Crítico. Atualize
roadmap, checkpoint, .ai-dev/audit.md, frontend/README.md. Push da branch + merge na main +
push da main.
```
