# Tokens — LicIA

Fundações do design system. Três arquivos, duas camadas, uma regra.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `primitives.css` | Cor, espaçamento, raio e sombra — **valores crus** |
| `semantics.css` | Cor, espaçamento, raio e elevação — **intenção de uso** |
| `typography.css` | As duas camadas de tipografia (o prefixo já as separa) |

O ponto de entrada é `../index.css`: ele importa os três na ordem certa e define
o reset global. Importe **só ele** na aplicação.

## Camadas

```
primitivas  →  semânticas  →  componente
  #26a736      surface-brand    background
```

**Regra de consumo: componente só usa a camada semântica.** Se você precisou
escrever `--color-verde-1000`, `--space-16`, `--radius-8`, `--shadow-sm` ou
`--font-size-sm` dentro de um componente, está faltando um token semântico —
crie ele em `semantics.css` ou `typography.css`.

| Camada | Prefixos |
| --- | --- |
| Primitiva | `--color-<familia>-<step>`, `--space-*`, `--radius-*`, `--shadow-*`, `--font-*` |
| Semântica | `--color-<categoria>-<papel>`, `--inset-*`, `--inline-*`, `--stack-*`, `--section-*`, `--corner-*`, `--elevation-*`, `--type-*` |

`--color-` é o único prefixo nas duas camadas. Nele quem separa é o **segundo
segmento**: família (`verde`, `cinza`) é primitiva, categoria (`text`,
`surface`, `border`, `action`) é semântica.

### Duas exceções sancionadas

1. **Override de peso.** Quando só o peso muda e o resto vem herdado, use o
   primitivo direto — é para isso que ele existe:
   ```css
   .tabela th { font-weight: var(--font-weight-semibold); }
   ```
2. **Estilo parcial.** Quando o componente só define parte da tipografia, use os
   tokens atômicos do papel em vez do atalho, que resetaria o que faltou:
   ```css
   .paragrafo { font-size: var(--type-caption-md-size); }
   ```

## Cor

Quatro categorias, só: `text`, `surface`, `border`, `action`. Estado e marca são
papéis **dentro** delas, com o mesmo sufixo nas três primeiras — trocar a cor de
um componente é trocar o último segmento em todas as propriedades de uma vez.

Não existe família `icon-*`: ícone monocromático sai de `text-*` e chega sozinho
pelo `currentColor`.

### Rampa invertida

Aqui o step **maior** é o mais **escuro** e o principal é sempre o `1000` — o
inverso do Material, onde 500 é o principal. É consistente nas oito famílias.

### Contraste — o que passa e o que não passa

Medido contra branco (`#ffffff`).

| Token | Valor | Razão | Serve para |
| --- | --- | --- | --- |
| `text-heading` | `preto-1000` | 13.95:1 | tudo |
| `text-primary` | `cinza-1000` | 7.65:1 | tudo |
| `text-neutral` | `azulado-700` | 4.05:1 | ícone, contorno |
| `text-danger` | `vermelho-1000` | 3.16:1 | ícone, contorno |
| `text-brand` / `text-success` | `verde-1000` | 3.15:1 | ícone, contorno |
| `text-secondary` | `cinza-800` | 3.03:1 | ícone, contorno |
| `text-info` | `azul-1000` | 2.85:1 | **nada** — nem contorno |
| `text-warning` | `laranja-1000` | 2.19:1 | **nada** — nem contorno |
| `text-placeholder` | `cinza-600` | 1.85:1 | dica transitória (reprova de propósito) |

Mínimos da WCAG 2.1: **4.5:1** para texto normal, **3:1** para texto grande
(≥24px, ou ≥19px em negrito) e para contorno que identifica um controle
(SC 1.4.11).

Consequência prática: **nenhuma cor de marca ou estado serve corpo de texto
hoje.** Onde `text-warning` e `text-info` aparecem, o contorno ou a cor não pode
ser o único sinal — acompanhe de ícone ou de texto. Ver Pendências > Cor.

### Renomeações desta reescrita

| Antes | Agora |
| --- | --- |
| `--color-text-title` | `--color-text-heading` |
| `--color-text-body` | `--color-text-primary` |
| `--color-icon-*` | `--color-text-*` (família eliminada) |
| `--color-bg-*` | `--color-surface-*` |
| `--color-brand-default` | `--color-surface-brand` / `--color-text-brand` / `--color-border-brand` (pela propriedade) |
| `--color-brand-active` | `--color-surface-brand-pressed` |
| `--color-*-subtle` | `--color-surface-*` |
| `--color-*-text` | `--color-text-*` |
| `--color-error-*` | `--color-*-danger` |
| `--color-topbar-*` | `--color-surface-gov-*` / `--color-border-gov-*` |
| `--color-obs-accent` | `--color-border-neutral` |
| `--color-border-viewer` | `--color-border-default` (era o mesmo valor) |
| `--radius-N` | `--corner-<escala>` |
| `--shadow-card/menu/modal` | `--elevation-raised/overlay/modal` |

## Tipografia

`--font-*` é primitivo; `--type-*` é semântico. Cada papel expõe 4 tokens: os 3
atômicos (`-size`, `-line-height`, `-weight`) e o atalho sem sufixo para a
propriedade `font`.

O atalho é shorthand: **reseta `font-style`, `font-variant` e `font-stretch`**.
Em elemento itálico, use as 3 propriedades atômicas ou reponha o `font-style`
depois da linha do shorthand, nunca antes.

### Regra de peso

Vale em `body`, `label` e `caption` igualmente:

- sem sufixo → `regular` (400)
- `-strong` → `semibold` (600)
- `-bold` → `bold` (700)

`heading` e `display` não seguem: o peso deles é parte do papel e vem fixo do
Figma.

### Mapa Figma → código

Mão única por enquanto: o Figma ainda usa os nomes antigos e será atualizado
depois. Esta tabela é o contrato dessa migração.

| Text style no Figma | Medida | Papel(éis) |
| --- | --- | --- |
| Headline/H1 | 52/82 light | `display-lg` |
| Headline/H2 | 40/64 medium | `display-md` |
| Headline/H3 | 32/52 semibold | `heading-xl` |
| Headline/H4 | 26/40 semibold | `heading-lg` |
| Headline/H5 | 20/32 semibold | `heading-md` |
| Texto/Texto grande | 20/32 regular | `body-lg` |
| Texto/Texto corrido | 16/24 regular | `body-md` |
| Texto/Texto corrido semibold | 16/24 semibold | `heading-sm`, `body-md-strong` |
| 32/52, 26/40, 20/32 semibold | `heading-xl`, `heading-lg`, `heading-md` |
| Texto/Texto corrido bold | 16/24 bold | `body-md-bold` |
| Texto/Texto menor | 14/20 regular | `body-sm`, `label-md` |
| Texto/Texto menor semibold | 14/20 semibold | `heading-xs`, `body-sm-strong`, `label-md-strong` |
| Texto/Texto menor bold | 14/20 bold | `body-sm-bold` |
| Legenda/Legenda | 12/16 regular | `caption-md` |
| Legenda/Legenda semibold | 12/16 semibold | `caption-md-strong` |
| Legenda/Legenda bold | 12/16 bold | `caption-md-bold` |
| Legenda/Legenda menor | 10/14 regular | `caption-sm` |

Essa coluna traz os nomes **antigos** dos text styles. Eles já foram renomeados
para os papéis — `Headline/--text-h1` virou `Display/lg`, `Texto/--text-body`
virou `Body/md`, e assim por diante. A tabela fica como registro da tradução.

**O débito é do código, não do Figma.** `--text-caption-semibold` e
`--text-caption-bold` sempre existiram como text style; o CSS é que nunca
declarou os tokens correspondentes — `--text-caption-semibold-size` era chamado
por três arquivos e caía para o tamanho herdado. `caption-md-strong` e
`caption-md-bold` fecham essa lacuna.

`body-md-bold` e `body-sm-bold` eram o caso inverso — existiam no CSS sem style
no Figma. Os dois foram criados na segunda rodada.

### Colisões conhecidas

| Medida | Papéis |
| --- | --- |
| 16/24 semibold | `heading-sm`, `body-md-strong` |
| 32/52, 26/40, 20/32 semibold | `heading-xl`, `heading-lg`, `heading-md` |
| 14/20 regular | `body-sm`, `label-md` |
| 14/20 semibold | `heading-xs`, `body-sm-strong`, `label-md-strong` |

14/20 é o degrau mais disputado por ser a medida padrão da interface. Não é
duplicação acidental: a escala tem 9 degraus e a interface tem mais papéis que
isso. Ficam separados para poder mudar um sem caçar ocorrência de "14px" — se o
botão crescer para 16, só `label-md-strong` muda.

**Como escolher:** quebra em várias linhas → `body`. Linha única dentro de um
controle → `label`. Nomeia o bloco abaixo dele → `heading`.

### 12/16 e 10/14 têm dono

Os dois degraus pequenos pertencem a `caption`. Não existe `body-xs` nem
`label-sm` para disputar a medida. Chip, badge e controle compacto usam
`caption-md-strong`.

## Espaçamento

Quatro famílias, pela **relação** entre os elementos — nunca pelo tamanho:

| Família | Relação | Propriedade |
| --- | --- | --- |
| `--inset-*` | dentro de um componente | `padding`, `top`/`right`/`bottom`/`left` |
| `--inline-*` | entre itens lado a lado | `gap`, `margin` no eixo horizontal |
| `--stack-*` | entre itens empilhados | `gap`, `margin` no eixo vertical |
| `--section-*` | entre blocos de página | `gap`, `margin` |

Dois itens lado a lado usam `inline` mesmo que o valor coincida com um `stack`.
`inline` e `stack` são os eixos das propriedades lógicas do CSS: `inline` = linha
de texto, `stack` = bloco.

### Um sufixo, um valor

**Aqui o mesmo sufixo vale a mesma medida nas três famílias.** `inset-md`,
`inline-md` e `stack-md` são todos 16px. Só a família muda o papel, nunca o
tamanho.

| Sufixo | 3xs | 2xs | xs | control | sm | md | lg | xl | 2xl | 3xl | 4xl | 5xl |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| px | 2 | 4 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 |
| `inset` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `inline` / `stack` | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — |

`inset-3xs` e `inset-5xl` nasceram da migração do Figma: o arquivo tinha 61 nós
com padding de 2px e 8 com padding de 64px, medidas que a escada do CSS não
cobria porque nenhum componente da aplicação as usava.

`section` é a única com escala própria: `sm` 32, `md` 40, `lg` 48, `xl` 64.

Na dúvida entre `stack-2xl` e `section-sm` (ambos 32px): mesmo bloco → `stack`,
blocos distintos → `section`.

### `--inset-control` é a única exceção à base 4

10px existe por uma conta só:

```
10  +  20 (linha do label-md sobre 14px)  +  10  =  40px
```

40px é a altura de controle do sistema. Use o 10 **só no eixo vertical de
controle** — nunca em gap nem entre blocos.

## Raio

Escolha pela **escala do componente**. Na dúvida entre `md` e `sm`, o critério é
a altura: abaixo de ~28px use `sm`.

| Token | px | Onde |
| --- | --- | --- |
| `corner-none` | 0 | barra de topo, divisor, filho de pai arredondado |
| `corner-xs` | 2 | badge, barra de progresso fina |
| `corner-sm` | 4 | tag, chip, tooltip, input pequeno |
| `corner-md` | 8 | **padrão** — botão, input, card, painel |
| `corner-lg` | 12 | card grande, painel de conteúdo |
| `corner-xl` | 16 | modal, bottom sheet |
| `corner-pill` | 9999 | avatar, switch, badge de contagem, loader |

`px`, não `rem` — é a única quebra da regra de unidade do sistema. Raio é forma,
não legibilidade: em `rem`, a fonte a 200% transformaria todo controle de 40px em
pílula.

`9999px` em vez de `50%` porque `50%` deforma em elipse quando o elemento não é
quadrado.

**Não aninhe arredondado dentro de arredondado.** O raio interno correto é o
externo menos o padding: com `corner-md` (8) e `inset-xs` (8) o interno dá 0.
Filho colado na borda usa `corner-none` e o pai recorta com `overflow: hidden`.

Foco não tem token de raio: `outline` respeita `border-radius` sozinho.

## Elevação

Nomeia a **altura na pilha**, não a aparência.

| Token | Quando |
| --- | --- |
| `elevation-raised` | descolou da página mas ainda pertence a ela (documento) |
| `elevation-overlay` | flutua por cima e fecha ao clicar fora (dropdown, toast) |
| `elevation-modal` | bloqueia a página inteira — sempre com `surface-overlay` |

Card comum **não** leva sombra: separa-se da página por `surface-card` +
`border-default`.

## Tema escuro

Não existe hoje. Entra como um segundo bloco redeclarando os mesmos tokens
semânticos — nenhum componente muda. É o motivo de a camada semântica não conter
um único hex.

## Sincronia com o Figma

Arquivo: **LicIA Analisadora — Design** (`MvuYdZpVqYtMLqBfM9co3f`).

Três coleções de variáveis espelhando os três arquivos deste diretório:

| Coleção no Figma | Qtd | Espelha |
| --- | --- | --- |
| Primitivas | 123 | `primitives.css` (`Color/`, `Space/`, `Radius/`, `Font/`) |
| Semânticas | 103 | `semantics.css` (`Color/`, `Inset/`, `Inline/`, `Stack/`, `Section/`, `Corner/`) |
| Tipografia | 61 | `typography.css`, camada `--type-*` |

Mais 20 text styles (um por papel, vinculados à coleção Tipografia) e 3 effect
styles de elevação. As coleções `Espaçamento` e `Border Radius` não existem
mais.

### O caminho da variável É o nome do token

A barra vira hífen. O Dev Mode do Figma gera exatamente o nome que está no CSS,
sem tradução mental:

| Variável no Figma | Token no CSS |
| --- | --- |
| `Color/text/heading` | `--color-text-heading` |
| `Color/surface/gov-pill` | `--color-surface-gov-pill` |
| `Inset/control` | `--inset-control` |
| `Corner/pill` | `--corner-pill` |
| `Type/heading/sm/size` | `--type-heading-sm-size` |

### Cinco divergências que não são erro

O Figma não consegue representar tudo que o CSS representa. Nenhuma dessas muda
o resultado renderizado:

1. **Entrelinha em px, não em razão.** `Font/line-height/sm` é `20`; o CSS é
   `1.42857`. O Figma não tem entrelinha sem unidade. Mesmo pixel no fim.
2. **Peso como texto, não como número.** `Font/weight/semibold` é `"SemiBold"`,
   o nome do corte da Kanit; o CSS é `600`. O Figma liga `fontStyle`, não um
   peso numérico.
3. **Elevação não existe como variável.** Os tipos de variável do Figma são
   COLOR, FLOAT, STRING e BOOLEAN — sombra não está entre eles. `--elevation-*`
   fica sem par até virar *effect style* (Pendências > F2).
4. **Alfa é valor literal, não alias.** `Color/surface/overlay` e os dois
   `Color/action/overlay-*` guardam o hex com opacidade direto, porque o Figma
   não deriva alfa de outra variável.
5. **O atalho `font:` não tem par.** No Figma quem carrega os três atributos
   juntos é o *text style*, não a variável.

### Text styles

Vinte styles, um por papel, com o mesmo caminho das variáveis `Type/*`:

| Grupo | Styles |
| --- | --- |
| `Display/` | `lg`, `md` |
| `Heading/` | `xl`, `lg`, `md`, `sm`, `xs` |
| `Body/` | `lg`, `md`, `md-strong`, `md-bold`, `sm`, `sm-strong`, `sm-bold` |
| `Label/` | `md`, `md-strong` |
| `Caption/` | `md`, `md-strong`, `md-bold`, `sm` |

Cada um liga `fontFamily`, `fontSize`, `lineHeight` e `fontStyle` às variáveis —
mudar um degrau da escala propaga sozinho para todo style e todo nó.

Os três styles de 14/20 semibold (`Heading/xs`, `Body/sm-strong`,
`Label/md-strong`) são visualmente idênticos no picker. É o custo consciente da
paridade com o código; a diferença está no papel, não na medida.

### Elevação

Três effect styles, `Elevation/raised`, `Elevation/overlay` e
`Elevation/modal`. O alfa é literal em todos, porque o Figma não deriva
opacidade de outra variável.

### O que foi feito nesta rodada

- 67 primitivas de cor renomeadas para `Color/<familia>/<step>`; 12 cores fora
  de rampa adicionadas (`azul/250`, `azulado/700`, `amarelo/100`, `preto-puro`,
  `neutro/*`, `gov/*`).
- `Space/*`, `Radius/*` e `Font/*` criados como primitivas.
- 27 semânticas renomeadas, 36 criadas, 38 de espaço/raio criadas.
- **`Icon/*` eliminada.** As 9 variáveis tinham 331 vínculos; cada nó foi
  religado ao `Color/text/*` de mesmo valor antes da deleção. Zero mudança
  visual, zero vínculo perdido. É a fusão do `currentColor` expressa no arquivo.
- `Color/text/*` recebeu o escopo `SHAPE_FILL` além de `TEXT_FILL` — é o que
  deixa um ícone vetorial consumir cor de texto.
- Tokens ambíguos foram renomeados pelo papel **dominante** nos vínculos reais
  (`--color-error-default` tinha 82 fills em TEXT, virou `Color/text/danger`) e
  a minoria foi religada ao papel correto (strokes → `Color/border/danger`,
  fills fora de texto → `Color/surface/danger-strong`).

**Segunda rodada — espaçamento, raio, tipografia e elevação:**

- **3543 vínculos religados** em Design (3031) e nos componentes reais de
  Componentes (512): `padding*` → `Inset/*`, `itemSpacing` → `Inline/*` ou
  `Stack/*` conforme o eixo do auto-layout, `*Radius` → `Corner/*`. Zero
  propriedade sem mapeamento. `height` ligado a espaçamento foi para a
  primitiva `Space/*`: altura de divisor é dimensão crua, não papel.
- **As coleções `Espaçamento` e `Border Radius` foram deletadas.** A API do
  Figma não move variável entre coleções, então a consolidação exigiu religar
  nó a nó. A página Rascunhos ficou fora do escopo e perdeu 347 vínculos — os
  valores numéricos seguem lá, sem token por trás.
- Os 4 painéis de documentação (`.`, `Typography`, `Guia de Cores` ×2) ficaram
  de fora da migração: vão ser refeitos numa página Foundations. Não custou
  nada — os quatro tinham **zero** vínculo de espaçamento ou raio.
- 14 text styles renomeados para os papéis, 6 criados, todos os 20 vinculados às
  variáveis.
- Rótulos dos painéis corrigidos, e os 12 espécimes de tipografia passaram a
  **aplicar** os styles que documentam. Antes eram órfãos: apontavam para IDs de
  style inexistentes e renderizavam Bold por conta própria, o que é quase
  certamente a origem do `Bold` que estava no `typography.css`. Como
  `Heading/*` e `Display/*` têm zero uso em componente real, a correção para
  SemiBold não mudou nenhuma tela.
- Corrigido um erro pré-existente no guia semântico: `--color-border-default`
  estava rotulado `#E6EBEB / Cinza/400`, mas a variável sempre apontou para
  `cinza/500` (`#CDD6D7`).

---

# Pendências

## Cor

**C1 — Nenhuma família de estado serve texto.** Todas param entre 2.19:1 e
3.16:1 no branco. Falta um step escuro por família. Proposta calculada
preservando matiz e saturação, escurecendo só a luminosidade até cruzar 4.5:1:

| Família | `1000` atual | Razão | Proposto | /branco | /`100` |
| --- | --- | --- | --- | --- | --- |
| verde | `#26a736` | 3.15 | `#1f882c` | 4.55 | 4.08 |
| laranja | `#f49c00` | 2.19 | `#a56a00` | 4.51 | 4.23 |
| azul | `#54a5af` | 2.85 | `#408088` | 4.51 | 4.19 |
| vermelho | `#fc5757` | 3.16 | `#ee0404` | 4.51 | 4.02 |

Repare que nenhum dos propostos chega a 4.5:1 **sobre o próprio `100`** — o par
"fundo suave + texto de estado" continua reprovando. Resolver de vez pede
escurecer o texto ou clarear o fundo, decisão de marca. Nada disso foi aplicado:
é decisão de design, não de código.

**C2 — `text-placeholder` empata com `text-disabled`.** Ambos são `cinza-600`
(1.85:1). Dica de campo e campo morto ficam visualmente iguais. O certo é
`cinza-700` ou mais escuro para o placeholder — mantido igual ao anterior para
esta reescrita não mexer em pixel.

**C3 — `text-secondary` a 3.03:1** reprova AA em corpo de texto. Hoje é
`cinza-800`; `cinza-900` (`#63777f`) daria 4.69:1 e resolveria.

**C4 — Faltam famílias.** Roxo e rosa não existem. `azulado`, `amarelo` e
`neutro` são steps únicos fora de rampa.

**C5 — Não há forma preenchida de estado com texto.** `surface-*-strong` existe
para marca gráfica sem texto (ponto de status, trilho de progresso). Não ponha
`text-inverse` por cima: nenhuma cor de estado chega a 4.5:1 contra branco.

## Tipografia

**T1 — Não existe família monoespaçada.** NUP, hash e número alinhado em tabela
pedem uma. Falta `--font-family-mono`.

**T2 — `CompletionModal .title` usa `body-md-bold` como título.** Os styles
`Body/md-bold` e `Body/sm-bold` agora existem no Figma, então a lacuna de token
fechou — mas continua estranho um título sair de um papel de corpo de texto. Ou
o componente passa a `heading-sm` (semibold), ou nasce um heading bold nesse
degrau.

**T3 — `DocumentCard` compacto pedia 12/20**, par que não existe na escala.
Normalizado para `caption-md` (12/16); o bold volta por override explícito,
porque o atalho `font` zera o peso. Diferença de 4px de entrelinha no card
compacto — verificar visualmente.

**T5 — Sete regras ganharam entrelinha declarada** onde antes era `normal`
(≈1.5 na Kanit): `.gov`, `.section`, `.blockHeading`, `.signatureName` e
`.alertTitle` em `DocumentCard`, e `.title` e `.confirm` em `CompletionModal`.
Aperto de 1 a 2px cada. É o preço de o sistema declarar o par tamanho/entrelinha
em vez de deixar para o navegador — mas vale conferir o documento simulado.

**T4 — `display-lg`, `display-md`, `heading-xl`, `heading-lg` e `heading-md` não
têm uso na aplicação.** Vêm do Figma e ficam reservados. Se seguirem sem uso
depois da próxima tela, considerar cortar da biblioteca.

## Espaçamento

**E1 — O modelo DTEC não usa "um sufixo, um valor"** (lá `inset-xs` é 8 e
`inline-xs` é 4). Se as duas bibliotecas forem conviver, a divergência precisa
estar documentada nos dois lados.

**E2 — Os degraus 80, 96 e 128 foram cortados** por uso zero. Se voltarem,
entram como `section-*`.

## Raio

**R1 — `radius-24` foi cortado** (uso zero). `corner-xl` (16) segue declarado e
sem uso.

## Sombra

**S1 — A sombra de card mudou de `rgba(0, 51, 51, .12)` para `preto-1000` a
12%** (`#003234`, ou seja `rgb(0, 50, 52)`). Dois canais de diferença sob 12% de
alfa: invisível. Foi feito para a sombra sair da paleta em vez de um hex solto.

## Figma

**G1 — Rascunhos ficou para trás.** A página tem 347 nós cujo espaçamento e
raio perderam o vínculo quando as coleções legadas foram apagadas. Os valores
numéricos estão certos; falta religá-los a `Inset/*`, `Inline/*`, `Stack/*` e
`Corner/*` se a página for aproveitada.

**G2 — Os painéis de documentação estão corretos porém incompletos.** O guia
semântico mostra 27 swatches para os 63 tokens de cor que existem hoje, e o
painel de tipografia mostra 12 espécimes para os 20 papéis. Faltam também
swatches para as cores fora de rampa (`azulado`, `amarelo`, `neutro/*`,
`gov/*`, `preto-puro`). A reconstrução é trabalho da futura página Foundations.

**G3 — `Color/surface/brand` ainda carrega vínculos de fill em INSTANCE** que
podem ser conceitualmente de borda ou de texto. Só o que era VECTOR e stroke foi
religado; instâncias precisam de inspeção caso a caso.

**G4 — Nenhum nó consome os effect styles de elevação.** Os três foram criados
mas o arquivo ainda desenha sombra solta. Falta aplicá-los onde há sombra.

**G5 — `--color-surface-inverse` só existe no código.** Criado para o tooltip
(fundo escuro, único do sistema que aguenta `--color-text-inverse`: 13.9:1).
Falta criar `Color/surface/inverse` na coleção Semânticas apontando para
`Color/preto/1000` — até lá são 104 tokens no código contra 103 no Figma.

**G6 — `Sumário/Peça-número` tem uma variante `confirmada` órfã.** O
`Sumário/Linha-peça` perdeu o estado `confirmada` na revisão da tela de sumário
e o código acompanhou; o componente do círculo manteve a variante. Nada a usa.
Apagar quando houver certeza de que a confirmação não volta.

## Foco

**F1 — Não há estilo de foco global.** `--color-border-focus` está declarado e
não é consumido por ninguém. Navegação por teclado depende hoje do outline
padrão do navegador. É a lacuna de acessibilidade mais barata de fechar.

**F2 — Resolvido.** Os três effect styles de elevação existem (ver G4 para a
aplicação nos nós).
