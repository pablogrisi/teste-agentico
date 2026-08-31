# Documento de Decisões — Analisadora-API (persistência)

## 1. Propósito

Este documento é um registro do **o quê** e do **porquê** da API de persistência da LicIA Analisadora. Ele não descreve o **como** — a implementação, os contratos de endpoint e o detalhamento técnico ficam para os PRDs/specs derivados daqui. O objetivo é que qualquer pessoa (ou sessão futura de escrita de spec) consiga reconstruir por que o sistema tem a forma que tem, sem precisar reviver a discussão. As decisões estão numeradas (D1…D8) para referência cruzada nos PRDs.

## 2. Contexto e problema

A LicIA Analisadora apoia analistas da Central de Licitação na verificação de conformidade de processos licitatórios. O analista cadastra uma análise (NUP, objeto e um PDF), e o sistema confronta cada **requisito** normativo contra o conteúdo do documento, sugerindo um status por requisito. O analista revisa, ajusta o que discordar e conclui.

Premissas centrais:

- **A inteligência é externa a este serviço.** Esta API cuida de persistência; a análise por IA acontece em outro microsserviço. Essa separação é premissa, não detalhe de implementação.
- **O processamento por IA é demorado por natureza.** Um PDF de até 200 páginas passando por LLM leva minutos. Tratar isso de forma síncrona está fora de cogitação (timeout de gateway/proxy). O assincronismo é premissa.
- **A identidade do usuário já é um problema resolvido no ecossistema Licia.** Existe um serviço de usuários dedicado (`users-api`) e um padrão de autenticação de borda estabelecido. A Analisadora **consome** esse padrão, não o reinventa.

O que este sistema **é**: a fonte única de verdade persistida da Analisadora — o cadastro das análises, o catálogo de requisitos e os pareceres (sugestão da IA + decisão do humano), além do estado do processamento.

O que este sistema **não é**:

- **Não é o motor de análise.** Não chama LLM, não faz OCR, não avalia requisito contra documento. Isso é o microsserviço FastAPI, que tem documento de decisões próprio (*Serviço de IA da Analisadora*).
- **Não é provedor de identidade.** Não emite nem valida JWT, não gerencia usuários. Isso é a `users-api`.
- **Não gera artefatos.** No MVP não há exportação de parecer/relatório (ver §4).

## 3. Decisões

### D1 — O motor de análise mora fora desta API

**Descrição.** A Analisadora é composta por dois serviços: a **Analisadora-API** (NestJS), responsável por persistência e por ser a dona única do schema; e um **microsserviço de IA** (FastAPI), responsável pela análise. Esta sessão desenhou apenas o primeiro; o segundo terá documento próprio.

**Racional.** As responsabilidades têm ciclos de vida e perfis operacionais diferentes: persistência é estável, previsível e crítica; o motor de IA é volátil, dependente de LLM e tolerante a falha/retry. Mantê-los separados permite evoluir e escalar cada um sem contaminar o outro, e mantém a API de persistência livre de dependência de LLM no caminho crítico.

**Alternativas descartadas.** Serviço único (persistência + orquestração da IA no mesmo deployável): descartado porque acoplaria a estabilidade da persistência à volatilidade do motor de IA e traria a dependência de LLM para dentro do serviço que precisa ser o mais confiável.

**Reversibilidade.** One-way. A fronteira entre os dois serviços é um contrato inter-serviços; fundi-los ou movê-la depois é custoso.

---

### D2 — Modelo de dados: três tabelas, evidência inline

**Descrição.** Três tabelas: `processo` (o cadastro da tela inicial — NUP, objeto, arquivo, dono, timestamps, estado do processamento; a tabela guarda o processo licitatório, e "análise" é a atividade sobre ele), `requisito` (catálogo fixo de regras — texto do requisito + `aba` + `secao`) e `parecer` (o cruzamento processo × requisito). A evidência (páginas do PDF) é um **`jsonb` nullable** no `parecer` (nullable porque um não-conforme por ausência de peça não tem página). Há `UNIQUE(processo_id, requisito_id)` no `parecer`.

**Racional.** `requisito` é catálogo global e fixo (a "base de dados de regras" do discovery); separá-lo da instância evita repetir metadado de regra em cada linha de parecer e é o que a IA confronta contra o documento. `aba`/`secao` não definem a regra — são metadado de apresentação que a UI usa para desenhar abas e seções; ficam como colunas porque queremos adicionar requisitos por dado (nas visitas à PGE) sem mexer em código. A evidência inline se justifica pelo volume baixo e por dispensar join; o `UNIQUE` além de integridade serve de idempotência no write-back (ver D4).

**Alternativas descartadas.**

| Alternativa | Motivo da rejeição |
|---|---|
| Tabela `analista` | Identidade vive na `users-api`; o dono da análise é lido do header de identidade (D5), não modelado aqui. |
| Tabela `evidencia` separada | Volume baixo; array inline resolve inclusive intervalos não contíguos (`p. 23–31; p. 90–97`). Tabela só se pagaria para consulta por página ou destaque de trecho (deferido, §4). |
| Campos `ordem` / `ativo` em `requisito` | `ordem` desnecessária no MVP; `ativo` só serve para aposentar requisito sem apagá-lo, e hoje os requisitos só crescem. |
| Campo `metadados jsonb` em `requisito` | Removido por não ter propósito definido — `jsonb` é additivo, dá para recolocar sem migração quando houver um uso concreto. Se fosse guardar a peça-alvo do requisito, colidiria com o D6 do documento do FastAPI (o requisito só enuncia a regra e não sabe a peça). |

**Reversibilidade.** O schema em si é one-way (migração). A escolha de evidência inline é reversível para tabela caso a consulta por página passe a importar.

**Princípio inviolável.** O `parecer` guarda dois status de veredito distintos — a sugestão da IA (`status_ia`) e a decisão final do humano (`status_final`) — nunca colapsados num único campo. Ambos são **nullable**: o veredito só existe quando o processamento daquele requisito deu certo (ver D7/D8); um requisito que falhou não tem veredito, apenas estado de falha.

---

### D3 — Processamento assíncrono com Postgres como fila

**Descrição.** O gatilho de análise retorna imediatamente (`202 Accepted`); o trabalho roda em background no FastAPI. O enfileiramento usa o **próprio Postgres** como fila no MVP — o estado do job vive na linha do `processo` (ver D7), não há tabela de fila nem broker. O transporte da fila fica **encapsulado atrás de uma abstração de enfileiramento**.

**Racional.** Síncrono está fora de cogitação (gateway/proxy derrubam conexões longas). Entre as formas de entregar trabalho de modo durável, o Postgres já existe, o volume do MVP é baixo (um analista por vez) e o estado do job já precisa ser persistido de qualquer forma — então a fila não custa infra nova. O encapsulamento é o que torna o porte futuro barato: no dia de trocar por um broker, reescreve-se só o adapter.

**Alternativas descartadas.**

| Abordagem | Durável? | Infra nova | Veredito |
|---|---|---|---|
| HTTP fire-and-forget | Não | Zero | Descartada — sem retry, uma queda do FastAPI perde a análise. |
| **Postgres como fila** | Sim | Zero | **Escolhida** para o MVP. |
| Broker dedicado (RabbitMQ/Redis/SQS) | Sim | Um broker a operar | Deferida — ver §4. |

**Reversibilidade.** Additiva. Por estar atrás de abstração, o porte para RabbitMQ troca só o transporte; o resto do código não sabe que a fila mudou.

**Princípio inviolável.** Nenhum código de negócio consulta o estado da fila diretamente (`SELECT ... WHERE status_processamento = ...` espalhado); todo acesso passa pela abstração de enfileiramento.

---

### D4 — Write-back via HTTP; NestJS é dono único do schema

**Descrição.** Ao concluir a análise, o FastAPI **chama a API do NestJS** (endpoint interno de gravação de pareceres) via HTTP. O FastAPI **nunca** escreve direto no Postgres.

**Racional.** Escrita direta criaria um segundo dono do schema: toda migração de tabela viraria mudança coordenada entre dois repositórios que precisariam subir juntos. Com o write-back por HTTP, o contrato entre os serviços é a *API*, não o *layout do banco* — e API se versiona e evolui com muito mais folga que schema compartilhado. O contra-argumento (um hop de latência a menos) não se sustenta: o write-back ocorre uma vez, ao fim de um job que já durou minutos.

**Alternativas descartadas.** FastAPI escreve direto no Postgres: descartado por criar segundo dono do schema e acoplar os deploys dos dois serviços.

**Reversibilidade.** One-way na prática — é o contrato central entre os serviços.

**Princípio inviolável.** O NestJS é o único serviço que executa DDL/DML no schema da Analisadora. A idempotência do write-back é garantida por `UNIQUE(processo_id, requisito_id)` (D2): reprocessar o mesmo job faz upsert, não duplica parecer.

---

### D5 — Autenticação de usuário: seguir o forward-auth existente da Licia

**Descrição.** A Analisadora-API **não valida JWT**. Ela entra como mais um consumidor de identidade de borda, no mesmo padrão da `executora-api` e da `elaboradora-api`: o gateway (Traefik) faz o forward-auth e injeta os headers `X-User-*`; um `IdentityGuard` no NestJS lê esses headers e popula a identidade da requisição. O dono da análise (`id_usuario`) vem do `X-User-Id`. A autorização é por **ownership**: toda query de negócio filtra pelas análises do próprio usuário, exatamente como a `executora` faz. O `X-User-Role` chega, mas não gateia rotas — o produto só tem o perfil analista.

**Racional.** O padrão de autenticação de borda já está estabelecido e testado nos outros serviços da Licia (segredo JWT confinado à `users-api`, validação única no gateway, identidade propagada por header). Reimplementar validação de token na Analisadora violaria a decisão arquitetural do ecossistema e espalharia o segredo. Ownership por `id_usuario` é o mecanismo já usado pela `executora` e atende ao requisito do discovery ("cada analista só vê as análises que iniciou").

**Alternativas descartadas.** Validação de JWT no próprio serviço: descartada por contrariar o modelo de borda da Licia e espalhar o segredo de assinatura.

**Reversibilidade.** Additiva no serviço — se o ecossistema mudar o padrão de identidade, muda-se o `IdentityGuard`, não a lógica de negócio.

**Princípio inviolável.** A identidade do usuário vem exclusivamente dos headers injetados pelo gateway; a Analisadora não conhece JWT. Nenhuma query de negócio retorna análises de outro `id_usuario`.

---

### D6 — Autenticação serviço→serviço: token por-job de uso único

**Descrição.** O write-back do FastAPI é autenticado por um **token por-job**: o NestJS gera um token no momento do enfileiramento, entrega-o ao FastAPI junto do payload da análise, e o valida no write-back verificando que corresponde àquele `processo`. É de **uso único** — invalidado quando o write-back conclui (ou quando um retry gera um novo, D8). Essa comunicação trafega pela **rede interna** e fica **fora do forward-auth do gateway** — não é tráfego de usuário e não deve dar a volta pela borda pública.

**Racional.** Auth de serviço é distinta de auth de pessoa: o write-back age em nome do sistema, não de um analista — modelá-lo como "usuário de sistema" obrigaria a inventar um usuário fake com permissões estranhas. O token por-job é mais forte que uma API key estática global: um token vazado não vira chave-mestra do endpoint, só consegue escrever no job para o qual foi emitido. E como o NestJS é quem inicia o job (D3), emitir o token no enfileiramento sai de graça — ele mora na mesma linha do `processo`.

**Alternativas descartadas.**

| Abordagem | Motivo |
|---|---|
| "Usuário de sistema" pelo fluxo de login humano | Serviço não é pessoa; distorce autorização e auditoria. |
| API key estática global | Chave única vazada abre o endpoint inteiro; o token por-job limita o dano a um job. |
| mTLS / JWT M2M (OAuth2 client-credentials) | Rigor além do necessário para o MVP; exigem CA/rotação ou authz server. Deferidos. |

**Reversibilidade.** O *mecanismo* é additivo (trocar por mTLS/JWT reescreve só o guard). A *topologia* — endpoint interno fora da borda — é bom fixar desde já; espalhar endpoints internos entre os públicos depois é chato de desfazer.

**Princípio inviolável.** A comunicação serviço→serviço nunca passa pelo forward-auth do gateway; usa token por-job na rede interna, validado contra o `processo` correspondente.

---

### D7 — Máquina de estados do processamento na linha do processo

**Descrição.** O `processo` carrega `status_processamento` com **cinco** estados — `pendente → processando → processada | processada_parcial | erro` — **ortogonal** à conclusão humana, que é representada por `concluida_em IS NOT NULL` (o boolean `concluida` foi descartado como redundante; a conclusão humana ocorre quando todos os requisitos estão `verificado`). O estado do job, o token por-job (D6) e o `erro_detalhe` de nível processo vivem na mesma linha do `processo`.

**Racional.** O ciclo da IA e o ciclo do humano são dois ciclos de vida distintos; colapsá-los é erro de modelagem. Os estados `erro` e `processada_parcial` precisam existir desde o dia 1: sem terminal de falha, um job quebrado fica preso em `processando` para sempre; sem o parcial, não há como representar uma análise que produziu vereditos mas teve requisitos que falharam (consequência direta da falha granular, D8). `erro_detalhe` é guardado porque analisar falhas é objetivo explícito do MVP.

**Estados, com a fronteira semântica que importa:**

- `pendente` — enfileirado; o consumer busca por ele.
- `processando` — pego por um worker; trava contra processamento duplo.
- `processada` — **todos** os requisitos processados com sucesso; o analista abre a tela completa.
- `processada_parcial` — os pareceres existem e a maioria tem veredito, mas **alguns requisitos falharam**. O analista tem trabalho útil + cards de falha a re-tentar (D8). Não prende o analista, porque o retry é granular.
- `erro` — falhou **antes de produzir parecer útil** (tipicamente a segmentação do documento quebrou, no FastAPI). Não há pareceres para mostrar; motivo em `processo.erro_detalhe`.

A fronteira `erro` × `processada_parcial` é o que diz ao analista o que ele vai encontrar: `erro` = nada útil, falha pré-parecer; `parcial` = há resultado, faltam alguns itens.

**`erro_detalhe` existe em dois níveis.** No `processo` (falha de segmentação, antes de existir qualquer parecer) e no `parecer` (falha de verificação de um requisito — ver D8). São falhas de naturezas diferentes e cada uma tem sua casa.

**Agregado armazenado, não derivado.** `processada` vs `processada_parcial` é derivável dos `status_ia_processamento` dos pareceres filhos, mas é **armazenado** no `processo`. Isso é seguro — apesar de ser desnormalização — porque o write-back é de uma vez só (D4): há um **ponto de escrita único e atômico** desse agregado, sem risco de drift entre vários lugares recalculando. Se o write-back fosse incremental, o correto seria derivar.

**Reversibilidade.** O conjunto de estados é additivo (adicionar um estado novo não quebra os existentes).

**Princípio inviolável.** `status_processamento` (job/IA) e `concluida_em` (humano) são campos distintos e nunca colapsados. A linha do `processo` é a fonte única de verdade do job.

---

### D8 — Retry in-place e granular, no grão do requisito

**Descrição.** O retry é **in-place** (sobrescreve, sem histórico de tentativas) e **granular por requisito**, não por análise. Quando um processo termina em `processada_parcial`, o analista re-dispara apenas os requisitos que falharam: cada `parecer` em falha volta a ser processado, os que já têm veredito ficam intocados. O contador `tentativas INT NOT NULL DEFAULT 1` e o `erro_detalhe` vivem no **`parecer`** (grão do requisito), não no `processo`. O token por-job é novo a cada disparo (uso único, D6).

**Racional.** A unidade de retry acompanha a unidade de trabalho: como a análise da IA é feita requisito a requisito (ver D2 do documento do FastAPI), re-disparar a análise inteira reprocessaria os requisitos que já deram certo — desperdício de LLM e, pior, risco de sobrescrever vereditos que o analista já revisou. Granular re-executa só o que falhou. O contador no `parecer` dá granularidade máxima do erro ("qual requisito falhou, quantas vezes, e por quê") e preserva a frequência de falha sem tabela de histórico. In-place mantém a simplicidade (um parecer, uma linha).

**Alternativas descartadas.**

| Alternativa | Motivo |
|---|---|
| Retry no grão da análise (in-place no `processo`) | Reprocessa requisitos que já passaram; re-paga LLM e pode sobrescrever revisão humana. |
| Contador `tentativas` no `processo` | Mede "quantas análises re-tentaram", mas perde "qual requisito falhou". Granularidade menor do que a falha granular exige. |
| Tabela de histórico de tentativas | Único que guarda *qual* erro em cada tentativa intermediária, mas custa tabela. Deferido (§4) — dado não coletado agora não é recuperável, decisão de olhos abertos. |

**Reversibilidade.** O contador é additivo. A ausência de histórico completo **não** é reversível retroativamente: tentativas intermediárias sobrescritas não voltam. A falha de segmentação (nível processo) não tem contador no MVP — só estado `erro` + `processo.erro_detalhe`; adicionar `processo.tentativas` é additivo se medir falha de segmentação passar a importar.

**Princípio inviolável.** O retry re-executa somente os pareceres em falha; nunca reprocessa requisitos que já têm veredito.

## 4. Fora de escopo

### Descartado

- **Serviço único (persistência + IA)** — acoplaria estabilidade a volatilidade (D1).
- **Tabelas `analista` e `evidencia`** — identidade vem da borda; evidência cabe inline (D2).
- **Análise síncrona** — timeout de gateway; fragilidade (D3).
- **Fila fire-and-forget** — sem durabilidade (D3).
- **FastAPI escrevendo direto no Postgres** — segundo dono do schema (D4).
- **Validação de JWT na Analisadora** — contraria o modelo de borda da Licia (D5).
- **Auth de serviço como usuário de sistema** — serviço não é pessoa (D6).

### Deferido (com gatilho de reavaliação)

- **Porte da fila para RabbitMQ** — gatilho: necessidade de múltiplos workers concorrentes puxando da mesma fila, back-pressure ou retry sofisticado. Enquanto um worker e a latência de polling/`LISTEN-NOTIFY` bastarem, Postgres aguenta.
- **Histórico completo de tentativas** — gatilho: quando analisar *qual* erro ocorreu em tentativas intermediárias passar a importar mais que a frequência.
- **mTLS / JWT M2M no write-back** — gatilho: rede não confiável, muitos serviços, ou exigência de compliance.
- **Destaque de trecho na evidência** — gatilho: quando página + comentário não bastarem para usabilidade (discovery já classificou como v2).
- **Relatório final / "dump" da tela** — gatilho: decisão de produto sobre gerar um artefato de saída (levantada no discovery, sem resolução). Se confirmada, é additiva: uma coluna de URL de relatório no `processo`.

## 5. Riscos conhecidos e mitigações

| Risco | Mitigação |
|---|---|
| Postgres como fila não escala para volume maior | Transporte encapsulado (D3); porte para RabbitMQ é additivo. Aceito para o MVP. |
| Retry in-place perde *qual* erro ocorreu em tentativas intermediárias | Aceito conscientemente; `tentativas` preserva a frequência. Histórico completo é deferido (§4). |
| Confiança cega nos headers `X-User-*` | Herdado do modelo da Licia: depende de o `strip-identity` limpar headers do cliente e de os backends não serem alcançáveis fora da rede interna (só o gateway é exposto). Se a Analisadora-API for exposta diretamente, o modelo quebra — vale o mesmo para o endpoint interno de write-back (D6). |
| Requisito que falha não tem veredito para gravar | **Resolvido no schema.** `status_ia` e `status_final` são nullable; o `parecer` carrega estado de processamento próprio (`status_ia_processamento` = `pendente`/`ok`/`falha`) + `erro_detalhe`, separado do veredito. Um requisito em falha grava estado de falha, sem veredito. Isto fecha a pendência de schema que o documento do FastAPI (D4) havia deixado explícita. |
| Agregado `processada_parcial` pode divergir dos pareceres filhos (desnormalização) | Ponto de escrita único e atômico no write-back (D4/D7); sem múltiplos recalculadores, sem drift. Só se torna risco se o write-back virar incremental — nesse caso, derivar em vez de armazenar. |

## 6. Próximos passos como fatias verticais (candidatos a PRD)

1. **Cadastro e listagem de análises** — cadastro (NUP, objeto, upload do PDF para o storage) e listagem com ownership. Depende de D1, D2, D5.
2. **Catálogo de requisitos** — seed e gestão do catálogo fixo (`requisito`). Depende de D2.
3. **Enfileiramento e máquina de estados** — gatilho assíncrono (`202`), `status_processamento`, emissão do token por-job. Depende de D3, D6, D7.
4. **Endpoint interno de write-back** — gravação idempotente dos pareceres vinda do FastAPI, com auth de serviço. Depende de D4, D6, D2.
5. **Tela de análise** — leitura dos pareceres, alteração de `status_final`, checkbox `verificado`, conclusão da análise. Depende de D2, D5.
6. **Retry granular** — re-disparo dos requisitos em falha de um processo `processada_parcial` (contador por `parecer`, novo token), sem tocar os que já têm veredito. Depende de D7, D8.

## 7. Princípios de engenharia (para a Constitution / AGENTS.md)

Escritos como asserções verificáveis:

- O NestJS é o único serviço que executa DDL/DML no schema da Analisadora. Nenhum outro serviço abre conexão de escrita a este Postgres.
- A Analisadora-API não valida JWT. A identidade do usuário vem exclusivamente dos headers `X-User-*` injetados pelo gateway.
- Toda query de negócio filtra por `id_usuario`; nenhuma retorna análises de outro usuário.
- Nenhuma análise é processada de forma síncrona no ciclo de vida do HTTP: o gatilho retorna `202` e o trabalho roda em background.
- O estado da fila é acessado apenas através da abstração de enfileiramento; nenhum `SELECT` sobre `status_processamento` aparece em código de negócio.
- A comunicação serviço→serviço nunca passa pelo forward-auth do gateway; usa token por-job de uso único na rede interna, validado contra o `processo` correspondente.
- `status_processamento` (job) e `concluida_em` (humano) são campos distintos e nunca colapsados.
- O write-back é idempotente: reprocessar o mesmo job não duplica pareceres, garantido por `UNIQUE(processo_id, requisito_id)`.
- Falha e retry são no grão do requisito: um `parecer` em falha carrega seu próprio estado e contador; o retry re-executa somente os pareceres em falha, nunca os que já têm veredito.
- `status_ia` e `status_final` só têm valor quando o processamento do requisito deu certo; um requisito em falha não tem veredito, apenas estado de falha.
- O estado agregado do processo (`processada` vs `processada_parcial`) é gravado num único ponto atômico (o write-back), nunca recalculado em espalhado.