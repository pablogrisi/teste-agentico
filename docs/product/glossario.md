# Glossário / linguagem ubíqua — LicIA Analisadora

Define os termos do domínio deste projeto, para evitar que specs, código e conversas usem nomes diferentes para a mesma coisa — ou o mesmo nome para coisas diferentes.

Criado na fundação porque o PRD e o protótipo já usam nomes divergentes para os mesmos conceitos (ex.: "status", "parecer" e "diagnóstico"; 3 vs. 4 situações de requisito). Confirmar e evoluir conforme o desenvolvimento revelar novas ambiguidades.

## Análise

**Definição**: registro de verificação de conformidade de um processo licitatório, criado por um analista a partir de NUP, objeto/descrição e um PDF. Tem um ciclo de vida (`PENDENTE` → `PROCESSANDO` → `PRONTA_PARA_REVISAO` → `CONCLUIDA`, ou `ERRO_PROCESSAMENTO`) e agrega a avaliação de cada requisito.

_Evitar_: "processo" (o processo licitatório é o objeto analisado, não a análise), "auditoria", "parecer" (o parecer, se existir, é um resultado da análise, não a análise).

## NUP

**Definição**: Número Único de Protocolo do processo licitatório ao qual o documento analisado pertence. Campo obrigatório de identificação da análise; não é chave primária interna.

_Evitar_: "número do processo", "protocolo" sozinho.

## Requisito

**Definição**: item da base fixa de verificação (normativa, jurídica ou técnica) contra o qual o documento é avaliado. Pertence a uma área (Checklist ou Técnica), pode ser obrigatório ou não, e tem ordem de exibição.

_Evitar_: "regra", "critério", "checklist item" (um item do checklist é a *avaliação* de um requisito dentro de uma análise, não o requisito em si), "pergunta".

## Base fixa de requisitos

**Definição**: conjunto persistido e versionado de requisitos, igual para todas as análises. Carregada por seed. Estrutura definitiva e primeiro subconjunto ainda em aberto (`questoes-abertas.md` A-03, P-07).

_Evitar_: "template de análise", "checklist padrão".

## Avaliação de requisito

**Definição**: o cruzamento de uma análise com um requisito. Guarda o status sugerido pela IA, o status final do analista, se está verificado, o comentário e a página de referência. É o que o protótipo chama de "item de checklist" / "observação".

_Evitar_: usar "requisito" para se referir à avaliação.

## Status do requisito

**Definição**: situação de conformidade de uma avaliação de requisito. **Os únicos valores no MVP são `Conforme`, `Não conforme` e `Não se aplica`.** Existe um status **sugerido pela IA** e um status **final** (do analista); só o final vale para a conclusão.

_Evitar_: "parecer", "diagnóstico", "situação" como sinônimos soltos — no código e nas specs, usar **status** (e qualificar "sugerido" ou "final"). Evitar **"Com ressalva" / "warning"**: aparece no protótipo, mas **não** faz parte do MVP.

## Parecer

**Definição**: termo do protótipo e da linguagem dos analistas para o status do requisito. Tratar como sinônimo informal de "status final"; não introduzir uma entidade `parecer` separada sem decisão explícita.

_Evitar_: modelar `parecer` como campo distinto de `status_final`.

## Verificado

**Definição**: marca explícita de que o analista revisou aquela avaliação de requisito, inclusive quando o status final é `Não se aplica`. Alterar o status final também marca como verificado (RF-011).

_Evitar_: confundir com "conforme" (verificado é sobre o analista ter revisado, não sobre o resultado).

## Conclusão da análise

**Definição**: ação global única que fecha a análise, permitida só quando todos os requisitos obrigatórios estão verificados (RF-012). Registra `concluida_em`. Não envolve aprovação, assinatura nem dupla revisão no MVP.

_Evitar_: "aprovação", "finalização" com sentido de validação externa, "envio".

## Checklist (área)

**Definição**: área de requisitos com situação de conformidade (status). No protótipo, é a aba com filtros por status.

_Evitar_: usar "checklist" para o conjunto todo de requisitos das duas áreas.

## Técnica (área)

**Definição**: segunda área de requisitos, hoje separada e obrigatória. No protótipo aparece como "observações" neutras, sem status. **A semântica definitiva (tem status? é pass/fail? é só observação?) está em aberto** — `questoes-abertas.md` P-04. Não assumir comportamento antes dessa decisão.

_Evitar_: tratar como resolvida; equiparar silenciosamente a Checklist.

## Analista (técnico)

**Definição**: único usuário do MVP; cria e revisa análises. No MVP é um **analista único e fixo por configuração** — sem login, sem múltiplos analistas (`questoes-abertas.md` P-10).

_Evitar_: "revisor", "auditor", "usuário" genérico nas specs de domínio.

## Capacidade de análise assistida por IA

**Definição**: dependência externa que, a partir do PDF e da base de requisitos, devolve o status sugerido e a página de referência por requisito. Consumida/acionada pela LicIA atrás da `AnaliseIaPort`; contrato em aberto (`questoes-abertas.md` A-02).

_Evitar_: "a LicIA", "o modelo", "o LLM" como se fosse parte interna do sistema; "LLM/File API" nas specs novas — usar o termo acima.

## Referência de página

**Definição**: indicação clicável de em qual página do PDF está a evidência de um requisito (RF-014). Pode não existir para um requisito, e a ausência deve ser mostrada explicitamente.

_Evitar_: "destaque de trecho" (fora do escopo do MVP), "citação".

## Relatório (PDF final)

**Definição**: documento PDF gerado sob demanda a partir de uma análise **concluída**, com identificação, responsável, datas e status final por requisito (RF-016). Não é persistido no MVP (`questoes-abertas.md` A-04).

_Evitar_: confundir com o **PDF de entrada** (o documento analisado). Quando ambíguo, dizer "PDF de entrada" vs. "relatório".

## Como manter

- Ao nomear uma entidade, campo, evento ou rota nova, confira aqui antes de decidir o nome.
- Se o termo já existe em outro sistema da mesma suíte com definição diferente, registre a diferença explicitamente em vez de ignorá-la.
- Termos descontinuados não devem ser apagados — marque como "descontinuado" e aponte para o termo atual.
