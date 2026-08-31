---
title: TSD - List Search and Review Filter Reset
type: tsd
status: completed
created: 17/08/2026 - 10:15 // Rolf Matela
updated: 17/08/2026 - 15:40 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md
- docs/engineering/specs/009-status-filter-and-bulk-verification.tsd.md
- docs/engineering/specs/011-local-document-viewer.tsd.md
---

# TSD — List Search and Review Filter Reset

## 1. Resumo

Duas mudanças independentes na mesma rodada:

1. **Busca por NUP e objeto na lista**, que existia apenas visualmente desde o protótipo. Como a Analisadora API não possui parâmetro de busca, o resultado é obtido carregando o conjunto completo do analista e filtrando no cliente — uma ponte com a mesma natureza da TSD 011.
2. **Reset dos filtros do painel de revisão**, para que uma área nunca abra com o recorte herdado da anterior.

## 2. O bloqueio da busca

`ListProcessesQueryDto` aceita apenas `page`, `pageSize` e `status`, e `process.repository.ts` não aplica nenhum filtro textual. Não há busca no contrato.

O `AGENTS.md` proíbe busca local sobre uma única página quando isso puder induzir o analista a ler o resultado como global. É a regra certa: um falso negativo silencioso — "essa análise não existe", quando ela está na página seguinte — é pior do que não ter busca.

A saída adotada torna a busca **de fato global**: carrega todo o conjunto do analista e filtra sobre ele.

## 3. Os dois modos da lista

| Modo | Origem | Paginação | Filtro por estado |
|---|---|---|---|
| Sem busca | servidor, página a página | servidor | servidor |
| Com busca | conjunto completo carregado | local | servidor, no carregamento |

Ao entrar em busca, o loader pede a página 1 com os estados já selecionados e lê o `total`:

- dentro do teto → varre as páginas restantes, concatena e filtra localmente;
- acima do teto → **não** busca, declara que a busca não cobre o volume e mantém a lista paginada pelo servidor.

O teto é `SEARCH_MAX_ANALYSES = 500`, dez requisições de 50 itens — `SEARCH_PAGE_SIZE = 50` é o maior `pageSize` que o BFF já aceita, então a allowlist da rota não mudou. **Nenhuma rota BFF foi criada ou alterada.**

Recusar acima do teto é deliberado. Entregar os primeiros 500 como se fossem o conjunto inteiro reintroduziria exatamente o falso negativo que a regra proíbe.

### Cache do conjunto

O conjunto varrido fica em memória no cliente, amarrado a uma chave composta pelos estados selecionados e pelo contador de nova tentativa. Quando a chave muda, o conjunto é considerado ausente **por derivação**, sem efeito de invalidação — o que evita renderizações em cascata. Trocar de página durante a busca apenas re-fatia o que já está carregado.

Criar uma análise invalida o conjunto, para que a nova entre no escopo da busca.

### Correspondência

Busca por NUP e objeto, como o campo promete. A comparação ignora caixa e acentos pela mesma técnica de `normalizeType` em `workspace/reviewModel.ts`: decomposição NFD e remoção de diacríticos. Termos separados por espaço precisam casar todos, em qualquer ordem, mas ambos no mesmo registro. A digitação tem debounce de 300 ms.

## 4. Reset dos filtros de revisão

Regra aplicada a todas as áreas, inclusive Legislação e Outros quando existirem:

```
trocar de área       -> parecer = Não-conforme, verificação = Todos
trocar o parecer     -> verificação = Todos
trocar a verificação -> não altera o parecer
```

O parecer é a camada primária: mudá-lo redefine o conjunto em análise, então a verificação volta ao padrão para não esconder parte do novo recorte. O inverso não vale, porque restringir a verificação é um refinamento dentro do parecer escolhido.

O reset incondicional na troca de área **eliminou** o caso especial que antes devolvia o filtro para "Não-conforme" somente quando "Sem parecer" não existia na área de destino. Como o gatilho é a troca de área, a regra já vale para as abas futuras sem código novo.

## 5. Arquivos principais

| Arquivo/Módulo | Responsabilidade |
|---|---|
| `src/features/analyses/list/analysisSearch.ts` | Normalização, correspondência, teto e tamanho de varredura |
| `src/features/analyses/list/AnalysisListLoader.tsx` | Dois modos, varredura do conjunto, cache por chave e fatiamento local |
| `src/features/analyses/list/AnalysisList.tsx` | Campo habilitado, limpar, aviso de teto e estado vazio da busca |
| `src/features/analyses/workspace/ReviewPanel.tsx` | Padrões das duas camadas e regras de reset |

O loader continua entregando `AnalysisListData` nos dois modos, então a lista quase não mudou: em busca, o loader calcula a fatia local e preenche a mesma forma.

## 6. Defeitos encontrados na verificação em navegador

A busca foi entregue quebrada. A verificação humana encontrou dois defeitos, e um terceiro apareceu na releitura do código que se seguiu. Ficam registrados porque o primeiro é uma armadilha genérica de efeito, aplicável a qualquer fronteira client desta base.

### 6.1 Varredura travada em carregamento

O efeito da busca dependia de `activeCorpus.status` — **o mesmo status que ele escreve**:

```ts
useEffect(() => {
  if (!searching || activeCorpus.status !== "idle") return;
  const controller = new AbortController();
  async function loadCorpus() {
    setCorpus({ status: "loading" });   // muda uma dependência do efeito
    ...
  }
  void loadCorpus();
  return () => controller.abort();      // a limpeza aborta o fetch em curso
}, [searching, activeCorpus.status, ...]);
```

Escrever `"loading"` reagendava o efeito; React executava a limpeza; a limpeza abortava o `fetch` no meio da varredura; o `AbortError` era engolido pelo `catch`. O estado ficava em `"loading"` para sempre e a busca nunca retornava nada.

Corrigido em três partes: `activeCorpus.status` saiu das dependências, a guarda passou a olhar apenas os estados terminais — o que torna o efeito auto-recuperável em vez de travável — e um sinalizador `cancelled` acompanha o `AbortController`, para que um cancelamento legítimo não deixe escrita pendente.

**A lição vale além desta slice: um efeito nunca deve depender do estado que ele próprio escreve, sobretudo quando sua limpeza cancela trabalho em andamento.**

### 6.2 Dois controles de limpar

O campo usava `type="search"`, que faz o navegador renderizar seu próprio botão de limpar, somado ao controle da interface. Corrigido para `type="text"`.

### 6.3 Lista em branco acima do teto

O aviso de volume promete que "a lista abaixo continua paginada normalmente", mas o loader passava `data={null}` nesse caso, deixando a lista vazia e contradizendo o próprio aviso. Corrigido com `showingSearch`: a busca só assume a lista quando o conjunto está carregado; acima do teto e durante a varredura, a lista paginada pelo servidor permanece no lugar.

## 7. Critérios de aceite

Os três primeiros só passaram **após** as correções da seção 6; antes delas, a correspondência funcionava como módulo puro, mas a funcionalidade não.

- [x] A busca cobre NUP e objeto, ignorando caixa e acentos.
- [x] O resultado é global, nunca restrito à página carregada.
- [x] Acima do teto a busca se recusa a operar, diz por quê e preserva a lista paginada.
- [x] Busca e filtro por estado se combinam, com total coerente.
- [x] Trocar de página durante a busca não dispara requisição nova.
- [x] Nenhuma rota BFF criada ou alterada.
- [x] O campo de busca oferece um único controle de limpar.
- [x] Trocar de área reseta as duas camadas de filtro.
- [x] Trocar o parecer reseta a verificação; o inverso não ocorre.
- [x] Ordenação continua visivelmente indisponível.

## 8. Validação executada

- [x] `npm run lint`, `npm run typecheck` e `npm run build`.
- [x] Varredura de múltiplas páginas contra a stack real: 121 análises semeadas retornaram 50, 50 e 21 itens com `total` estável em 121.
- [x] Varredura preservando o filtro por estado: `status=error` retornou 1 e `status=processed` retornou 120.
- [x] Recusa acima do teto: com 521 análises, a primeira resposta traz `total` acima de `SEARCH_MAX_ANALYSES`, que é a única entrada da decisão.
- [x] Correspondência exercitada em 11 casos sobre o módulo puro, com Node: prefixo de NUP, NUP específico, acento contra sem-acento nos dois sentidos, caixa alta, hífen, dois termos em qualquer ordem, termos em registros diferentes não casando, entrada só com espaços e busca sem resultado.

As linhas de `process` e `opinion` foram copiadas antes da semeadura e restauradas ao final, sem perda. A semeadura usou `processed` e `error` de propósito: `pending` seria consumido pelo worker, que está no ar, gastando cota da OpenAI.

### Verificação em navegador

- [x] **Reset dos filtros** — as três transições foram exercitadas e se comportaram como especificado.
- [x] **Busca** — exercitada e reprovada: os defeitos 6.1 e 6.2 vieram desta verificação.

### Não executado

- [ ] **Re-verificação da busca em navegador depois das correções.** As três correções da seção 6 passam por lint, typecheck e build, mas o caminho interativo não voltou a ser exercitado. O defeito 6.3 nunca foi visto em execução, nem antes nem depois.
- [ ] Debounce, aviso de teto e estado vazio da busca.

Esta é a lacuna mais relevante da slice: a busca é a única funcionalidade do repositório cuja correção não foi confirmada em execução por ninguém.

## 9. Limitações

- A busca é uma ponte. O lugar correto é um parâmetro na API, que resolveria paginação, contagem e volume de uma vez, e tornaria este código removível.
- Acima de 500 análises a busca não opera. É honesto, mas é uma limitação real de produto que cresce com o uso.
- Entrar em busca custa até dez requisições numa conta cheia.
- A busca não cobre outros campos além de NUP e objeto, que são os que o campo promete.
- A ordenação continua indisponível, sem contrato na API.
- O reset de filtros é deliberado, mas descarta a seleção anterior: um analista que alternava entre áreas mantendo o mesmo recorte precisará refazê-lo.

## 10. Rollback

O rollback remove `analysisSearch.ts`, devolve o campo de busca ao estado desabilitado e restaura o modo único do loader. O reset de filtros é independente e pode ser revertido isoladamente, restaurando o caso especial de "Sem parecer" em `selectTab`.
