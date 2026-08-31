---
title: PRD - LicIA Analisadora
type: prd
status: draft
created: 06/07/2026 - 15:00 // Rolf Matela
updated: 05/08/2026 - 16:05 // Rolf Matela
related (internal files):
- docs/licia-analisadora-product-discovery.md
related (external files):
- decisoes-analisadora-api.md
---

# PRD - LicIA Analisadora

## 1. Resumo

LicIA Analisadora é uma ferramenta de verificação assistida por IA da conformidade de documentos de processos licitatórios. Na primeira versão, um analista técnico cria uma análise informando NUP, objeto/descrição e um PDF. O sistema compara esse documento com uma base fixa e persistida de requisitos normativos, jurídicos e técnicos e sugere um status para cada requisito.

O analista revisa os requisitos, pode alterar o diagnóstico sugerido pela IA, marca cada requisito como verificado e conclui a análise quando todos os requisitos forem revisados. Este PRD cobre o escopo validado do MVP até o momento, identifica funcionalidades parcialmente validadas e mantém explicitamente em aberto as decisões ainda não concluídas.

## 2. Usuários / Personas

| Usuário | Necessidade | Contexto de uso |
|---|---|---|
| Analista técnico | Verificar se cada requisito aplicável está conforme com as normas, com apoio de IA e rastreabilidade mínima por página | Análise individual de processos/documentos licitatórios, sem fluxo de aprovação ou colaboração multiusuário no MVP |

## 3. Problema do usuário

O analista técnico precisa verificar, de forma consistente e rastreável, se um documento de processo licitatório atende a um conjunto fixo de requisitos normativos, jurídicos e técnicos. Hoje, essa verificação tende a ser intensiva em leitura manual, sujeita a variação de interpretação e com baixa padronização no registro dos resultados.

LicIA Analisadora busca reduzir esse esforço ao usar IA para sugerir o status de cada requisito, mantendo a decisão final com o analista humano.

## 4. Objetivos do produto

- Permitir que o analista técnico cadastre e acompanhe suas próprias análises.
- Apoiar a verificação de conformidade requisito a requisito com sugestão inicial de status pela IA.
- Garantir que todos os requisitos do escopo da análise sejam revisados antes da conclusão.
- Fornecer rastreabilidade documental mínima por página do PDF para sustentar a verificação.
- Registrar o resultado final da análise de maneira estruturada e persistida.

## 5. Não objetivos

- Suportar múltiplos papéis de usuário no MVP.
- Implementar fluxo de aprovação, dupla revisão ou assinatura no MVP.
- Integrar com sistemas externos na primeira versão.
- Implementar versionamento de documentos no MVP.
- Implementar workflow de devolução ao órgão dentro da LicIA no MVP.
- Implementar destaque avançado de trecho específico no PDF no MVP.
- Implementar comparação de versões de documentos no MVP.
- Tratar histórico detalhado de todas as alterações humanas como requisito obrigatório do MVP.
- Tratar a sugestão da IA como decisão final do requisito.
- Definir neste momento o valor formal do resultado concluído.

## 6. Jornada principal

1. Usuário acessa a lista de análises iniciadas por ele.
2. Usuário cria uma nova análise informando NUP, objeto/descrição e enviando um PDF.
3. Sistema registra a análise, dispara o processamento do PDF por uma camada de análise assistida por IA e associa o documento a uma base fixa de requisitos.
4. Usuário abre a análise e visualiza primeiro os requisitos não conformes sugeridos pela IA.
5. Usuário navega livremente entre seções/abas e revisa os requisitos um a um.
6. Sistema exibe, para cada requisito, o status sugerido pela IA e a referência mínima de página do PDF.
7. Usuário confirma ou altera o status final de cada requisito e marca o requisito como verificado.
8. Sistema conclui a análise quando todos os requisitos estiverem verificados.

## 7. Requisitos funcionais

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| RF-001 | O sistema deve permitir que o analista crie uma nova análise informando NUP, objeto/descrição e um arquivo PDF. | Must | A análise só pode ser criada quando os campos obrigatórios estiverem preenchidos e um PDF válido tiver sido enviado. |
| RF-002 | O sistema deve registrar a análise criada em uma lista/tabela de análises do próprio analista. | Must | Após criar uma análise, ela deve aparecer na listagem do analista com identificação suficiente para reabertura posterior. |
| RF-003 | O sistema deve restringir a visualização das análises ao analista que as iniciou. | Must | Um analista autenticado não deve visualizar análises iniciadas por outro analista. |
| RF-004 | O sistema deve permitir upload manual de PDF na primeira versão. | Must | O fluxo de criação de análise deve aceitar envio manual de PDF sem depender de integração externa. |
| RF-005 | O sistema deve processar o PDF enviado por uma camada de análise assistida por IA para apoiar a verificação dos requisitos. | Must | Após o upload, a análise deve resultar em requisitos avaliáveis com sugestão inicial de status pela IA. |
| RF-006 | O sistema deve usar uma base fixa e persistida de requisitos normativos, jurídicos e técnicos. | Must | Cada análise deve ser avaliada contra um conjunto de requisitos previamente definido e persistido pelo sistema. |
| RF-007 | O sistema deve sugerir, para cada requisito, um dos seguintes status: Conforme, Não conforme ou Não se aplica. | Must | Todo requisito exibido na tela de análise deve apresentar exatamente um status inicial sugerido pela IA dentre os três valores permitidos. |
| RF-008 | O sistema deve permitir que o analista defina o status final de cada requisito, podendo alterar a sugestão da IA. | Must | O analista deve conseguir salvar status final diferente do status sugerido pela IA. |
| RF-009 | O sistema deve iniciar a tela de análise priorizando a visualização de requisitos não conformes. | Must | Ao abrir a análise, a primeira visão apresentada ao analista deve destacar ou filtrar inicialmente os itens não conformes. |
| RF-010 | O sistema deve permitir navegação livre entre seções e abas da análise. | Must | O analista deve conseguir mudar de seção/aba sem precisar concluir uma ordem fixa de revisão. |
| RF-011 | O sistema deve permitir marcar cada requisito como verificado, inclusive quando o status final for Não se aplica. | Must | Cada requisito deve possuir um controle explícito de verificação acionável pelo analista. Alterar o status final de um requisito também deve registrá-lo como verificado. |
| RF-012 | O sistema deve permitir uma única confirmação global para concluir a análise somente quando todos os requisitos obrigatórios estiverem verificados. | Must | Enquanto existir requisito obrigatório não verificado, incluindo requisitos com status Não se aplica, a conclusão global deve permanecer bloqueada. |
| RF-013 | O sistema deve registrar o analista responsável, a data/hora de início, a data/hora de conclusão e o status final de cada requisito. | Must | Esses dados devem permanecer associados à análise concluída e disponíveis para consulta posterior. |
| RF-014 | O sistema deve apresentar rastreabilidade documental mínima por referência de página do PDF para cada requisito. | Must | Quando existir referência, o analista deve conseguir acessá-la de forma clicável e abrir a página correspondente do PDF. Quando a referência não existir ou não for aplicável, sua ausência deve ser apresentada claramente. |
| RF-015 | O sistema deve permitir a conclusão interna da análise sem depender de aprovação, assinatura ou dupla revisão. | Must | O analista deve conseguir concluir a análise sozinho quando todos os requisitos forem verificados. |
| RF-016 | [Parcialmente validado] O sistema deve permitir gerar um relatório PDF final da análise, caso essa funcionalidade entre no MVP. | Should | Se a decisão for confirmada para o MVP, o analista deve conseguir gerar um relatório contendo, no mínimo, identificação da análise e status final dos requisitos. |
| RF-017 | [Parcialmente validado] O sistema deve exigir comentário nas ações de revisão definidas para o MVP. | Must | Comentários integram o MVP e são obrigatórios. As ações exatas que exigirão comentário ainda devem ser consolidadas antes da implementação da revisão persistida. |
| RF-018 | [Decisão crítica em aberto] O sistema deve definir uma estratégia para persistência ou descarte controlado do PDF de entrada. | Should | A decisão deve especificar se o PDF será persistido, onde será armazenado, por quanto tempo ficará disponível e como será associado à análise. |

## 8. Regras de negócio

- O único usuário previsto para o MVP é o analista técnico.
- Cada analista visualiza apenas as análises que iniciou.
- A criação de uma análise exige NUP, objeto/descrição e PDF.
- O PDF de entrada é enviado manualmente na primeira versão.
- A primeira versão não depende de integração com sistemas externos.
- Todo requisito pertence a uma base fixa e persistida de verificações normativas, jurídicas e técnicas.
- Os únicos status válidos para requisitos no MVP são: **Conforme**, **Não conforme** e **Não se aplica**.
- A IA sugere o status inicial, mas o status final é sempre definido pelo analista.
- A ordem de revisão dos requisitos é livre.
- Checklist e Técnica permanecem, provisoriamente, como áreas separadas e obrigatórias; a semântica definitiva da área Técnica ainda precisa ser validada.
- Legislação e Outros permanecem indisponíveis no MVP atual.
- Busca, filtros, ordenação e paginação fazem parte do MVP, mas seus contratos e suas semânticas ainda precisam ser definidos.
- A tela de análise deve iniciar pela visualização prioritária dos itens não conformes.
- Cada requisito precisa ser marcado como verificado pelo analista, inclusive quando seu status final for Não se aplica.
- Alterar o status final de um requisito também o registra como verificado.
- A análise somente pode ser concluída após todos os requisitos obrigatórios serem verificados e o analista realizar uma única confirmação global.
- O MVP não inclui fluxo de aprovação, assinatura ou dupla revisão.
- A rastreabilidade mínima validada para o MVP é uma referência de página clicável que leve ao ponto correspondente do PDF.
- Um requisito pode permanecer sem referência de página quando a evidência não existir ou não for aplicável, desde que essa ausência seja apresentada claramente.
- Relatório PDF final, persistência do PDF de entrada e auditoria expandida continuam como pontos abertos ou parcialmente validados.
- Comentários integram o MVP e são obrigatórios, mas as ações exatas que exigirão comentário ainda precisam ser consolidadas.

## 9. Estados de erro e vazio

| Situação | Comportamento esperado |
|---|---|
| Sem dados | Se o analista ainda não tiver análises, a listagem deve mostrar estado vazio com orientação clara para criar uma nova análise. |
| Nenhum item não conforme | Se a visão inicial priorizar não conformes e nenhum item estiver nesse estado, o sistema deve informar isso claramente e permitir acesso fácil aos demais requisitos. |
| PDF inválido | O sistema deve informar que o arquivo enviado não atende ao formato esperado e impedir a criação da análise até que um PDF válido seja enviado. |
| Erro no upload do PDF | O sistema deve informar que o arquivo não foi recebido/processado e permitir novo envio sem perda desnecessária do restante dos dados já informados. |
| LLM/File API indisponível | O sistema deve informar indisponibilidade temporária do processamento, impedir avanço indevido da análise e orientar nova tentativa posterior. |
| Base de requisitos indisponível | O sistema deve informar que não foi possível carregar a base de requisitos e impedir o início ou carregamento correto da análise até a recuperação do serviço ou dado. |
| Erro de carregamento | Se houver falha ao carregar a lista ou a análise, o sistema deve informar o erro e oferecer nova tentativa. |
| Erro no processamento da análise | O sistema deve informar que não foi possível gerar a sugestão inicial dos requisitos e orientar o próximo passo disponível, como tentar novamente ou retornar mais tarde. |
| Tentativa de conclusão com requisitos pendentes | O sistema deve impedir a conclusão da análise e indicar claramente quais requisitos ainda precisam ser verificados. |
| Erro de persistência | O sistema deve informar falha ao salvar análise, revisão ou conclusão e orientar o usuário a tentar novamente sem assumir sucesso da operação. |
| Sem permissão | Se um analista tentar acessar uma análise que não iniciou, o sistema deve negar o acesso e redirecionar para uma tela segura, sem expor dados da análise. |
| Requisito sem referência de página | O sistema deve permitir exibir o requisito mesmo sem página associada, deixando clara a ausência da referência. |

## 10. Critérios de aceite gerais

- [ ] Um analista consegue criar uma análise com NUP, objeto/descrição e PDF sem depender de integração externa.
- [ ] Um analista consegue visualizar apenas as análises iniciadas por ele.
- [ ] Toda análise utiliza uma base fixa de requisitos para gerar sugestões iniciais da IA.
- [ ] Todo requisito apresenta status sugerido pela IA dentro dos três valores permitidos no MVP.
- [ ] O analista consegue alterar o status final de qualquer requisito.
- [ ] Todo requisito, inclusive um requisito com status Não se aplica, pode ser marcado como verificado.
- [ ] Alterar o status final de um requisito também o registra como verificado.
- [ ] A análise só pode ser concluída por uma única confirmação global quando todos os requisitos obrigatórios estiverem verificados.
- [ ] A análise concluída registra, no mínimo, responsável, data/hora de início, data/hora de conclusão e status final de cada requisito.
- [ ] A interface de análise inicia destacando os itens não conformes, sem bloquear navegação livre.
- [ ] O sistema apresenta referência de página clicável quando houver evidência e indica claramente quando a referência estiver ausente ou não for aplicável.
- [ ] Busca, filtros, ordenação e paginação funcionam conforme os contratos aprovados para o MVP, enquanto Legislação e Outros permanecem indisponíveis.
- [ ] Funcionalidades parcialmente validadas ou ainda abertas não são tratadas como obrigatórias do MVP sem decisão explícita.

## 11. Dependências

- Definição e disponibilidade de uma base fixa/persistida de requisitos normativos para a primeira versão.
- Definição do primeiro subconjunto de requisitos do MVP.
- Definição do novo backend responsável por persistir análises, requisitos e resultados.
- Disponibilidade da estratégia de processamento de PDF via LLM/File API.
- Definição da estratégia de autenticação suficiente para identificar o analista e restringir acesso às suas análises.
- Definição da estratégia de persistência dos PDFs de entrada.
- Decisão sobre a entrada ou não de relatório PDF final no MVP.
- Definição do modelo mínimo de auditoria além do registro básico já validado.
- Definição da experiência de listagem e tela de análise em Design.
- Alinhamento com Jurídico/Compliance sobre valor formal do resultado.
- Definição das métricas de impacto e produtividade do produto.

## 12. Questões em aberto

- [ ] O relatório PDF final entra no MVP ou fica para fase posterior?
- [ ] Qual é o valor formal da análise concluída: apoio interno, recomendação operacional ou outro enquadramento?
- [ ] Os PDFs de entrada serão persistidos? Se sim, por quanto tempo e em qual estratégia de armazenamento?
- [ ] Caso exista relatório final, ele também será persistido?
- [ ] O modelo mínimo de auditoria do MVP é suficiente ou será necessário registrar histórico mais detalhado de alterações humanas?
- [ ] Em quais ações de revisão o comentário obrigatório deve ser exigido: confirmação da sugestão da IA, alteração de status, verificação de item técnico ou todas elas?
- [ ] Qual é a semântica definitiva de Checklist e Técnica? Até nova validação, permanecem áreas separadas e obrigatórias.
- [ ] Em quais situações a ausência de referência de página é válida e o analista poderá corrigir as páginas sugeridas pela IA?
- [ ] Quais campos, filtros, colunas, direções de ordenação e regras de busca serão suportados na listagem do MVP?
- [ ] Qual será a estrutura exata da base fixa de requisitos?
- [ ] Quais requisitos entram no primeiro subconjunto do MVP?
- [ ] Quais métricas serão usadas para medir impacto e produtividade da solução?
