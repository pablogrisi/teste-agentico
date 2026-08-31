# Workflow de referência visual

Este workflow define como TSDs que alteram interface visível devem usar uma referência visual formal (Figma ou outra ferramenta de design, um protótipo navegável, ou imagens fornecidas por quem pediu o projeto) durante especificação, implementação e validação. Existe para reduzir deriva entre o que foi projetado e o que foi implementado, sem transformar a referência visual em fonte de arquitetura, domínio ou contratos de dados.

Só se aplica a projetos que tenham uma referência visual formal. Se o projeto não tiver nenhuma ainda, pule este arquivo — não invente uma referência que não existe, e não bloqueie a implementação por causa dele.

## Princípio

A referência visual é fonte de verdade visual e de composição de interface para slices de UI. Arquitetura, contratos de domínio, fronteira de adapter/serviço, regras de produto e limitações de escopo continuam sendo definidos por PRD, SDD, checkpoint e pela TSD ativa — nunca pela referência visual.

Quando houver conflito entre a referência visual e a documentação de produto/arquitetura:

- não assuma mudança de comportamento automaticamente;
- registre a divergência na TSD;
- pergunte ou sinalize necessidade de decisão antes de implementar comportamento novo;
- implemente apenas ajustes visuais quando a slice for de fidelidade de interface.

## Fluxo obrigatório para TSDs de interface

Toda TSD que altere interface visível deve conter a seção "Referências visuais" (ver `.ai-dev/templates/technical-slice.md`), preenchida por elemento de referência (tela, estado, modal, variação) com, no mínimo:

- papel do elemento na aplicação;
- link ou localização da referência;
- nome/identificação na ferramenta de origem;
- estados relevantes representados (vazio, erro, carregando, preenchido);
- screenshots obrigatórios para comparação pós-implementação;
- lacunas conhecidas entre a implementação atual e a referência.

Quando a slice envolver mais de um estado visual relevante (tela principal, modal, estado vazio, filtros ativos, paginação, versão mobile), registre um elemento de referência por estado, em vez de usar só a tela principal.

Antes de implementar uma TSD de interface:

1. ler o checkpoint, a TSD ativa, PRD/SDD apenas quando necessário, e este workflow;
2. inspecionar a referência visual selecionada;
3. antes de ativar a TSD no checkpoint, preencher a seção de referências visuais com os dados observados;
4. definir quais diferenças em relação ao que já existe implementado são apenas visuais e quais podem representar comportamento de produto novo;
5. se houver comportamento novo não coberto por PRD/SDD/TSD, parar e pedir decisão antes de implementar;
6. implementar somente o escopo visual/comportamental autorizado pela TSD;
7. capturar screenshots pós-implementação;
8. comparar screenshots com a referência visual;
9. registrar resultado, gaps remanescentes e validações no checkpoint e na TSD.

## Regras de implementação

- Usar a referência visual como fonte primária para layout, hierarquia, espaçamento, estados visuais, textos visíveis e padrões de interação já confirmados.
- Não copiar código, CSS, estrutura rígida do protótipo, nomes internos de camadas/componentes da ferramenta de design, ou posicionamentos absolutos, sem adaptação técnica ao projeto real.
- Não permitir que a referência visual substitua os contratos de domínio ou a fronteira de adapter/serviço já definidos nas specs anteriores.
- Não introduzir autenticação real, backend real, upload real ou qualquer fluxo fora do escopo da TSD só porque aparece sugerido na referência.
- Elementos de chrome da ferramenta de design ou do protótipo (molduras, barras de janela, wrappers de apresentação, nomes internos de camada) não são UI de produto, salvo decisão explícita em contrário.
- Registrar explicitamente qualquer diferença intencional entre implementação e referência.

## Gate

Uma TSD de interface não deve ser ativada no checkpoint nem implementada enquanto a seção "Referências visuais" não estiver preenchida e revisada. Isso não é burocracia — é o que impede a implementação de começar a partir de memória ou suposição sobre como a tela deveria ficar, em vez da referência real.

## Validações visuais mínimas

- screenshot antes (se a tela já existir) e depois da implementação;
- comparação visual manual (ou automatizada, se houver ferramenta disponível) com a referência;
- checagem de que a UI preserva a fronteira de dados definida no SDD/contratos (não importa fixtures ou implementação mockada diretamente);
- registro de gaps visuais remanescentes, se houver, no checkpoint e na TSD.
