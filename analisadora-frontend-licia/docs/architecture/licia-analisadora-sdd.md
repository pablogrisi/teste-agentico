---
title: SDD - LicIA Analisadora
type: sdd
status: draft
created: 07/07/2026 - 10:45 // Rolf Matela
updated: 05/08/2026 - 20:19 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
related (external files):
- decisoes-analisadora-api.md
---

# SDD — LicIA Analisadora

## 1. Objetivo da solução

LicIA Analisadora precisa viabilizar, tecnicamente, uma jornada completa de análise assistida por IA para documentos de processos licitatórios. A solução deve permitir:

- criar e listar análises por analista;
- receber upload manual de PDFs;
- armazenar ou controlar a persistência dos arquivos de entrada;
- processar o PDF de forma assíncrona, dado que a análise pode levar minutos;
- comparar o documento enviado com um catálogo fixo de requisitos normativos, jurídicos e técnicos;
- persistir a sugestão de status da IA e a decisão final do analista para cada requisito;
- suportar a revisão humana, a marcação de requisitos verificados e a conclusão da análise;
- preservar evidência mínima por referência de página do PDF;
- manter explícitas as decisões de produto e arquitetura que ainda seguem em aberto, sem forçar soluções prematuras.

## 2. Contexto técnico atual

- Sistema atual: a LicIA Analisadora está sendo desenhada como um produto/sistema novo e separado, com backend próprio e fronteiras técnicas próprias.
- Stack-alvo: frontend em React/Next; gateway público; Users API para autenticação JWT; backend em NestJS; banco de dados PostgreSQL; armazenamento de arquivos em MinIO; autorização por ownership aplicada no backend; processamento documental pelo serviço de análise.
- Módulos envolvidos: aplicação frontend do analista; API de persistência e estado de negócio; serviço de análise por IA; catálogo de requisitos; armazenamento de arquivos; mecanismo de fila/estado de processamento baseado em PostgreSQL no MVP.
- Integrações: File API para processamento de documentos; comunicação interna entre API NestJS e serviço de IA. Integrações externas de negócio estão fora do MVP.
- Limitações conhecidas: processamento de PDF é lento e precisa ser assíncrono; o relatório PDF final ainda não está confirmado; a estratégia final de retenção/persistência de arquivos ainda precisa de fechamento; o modelo mínimo de auditoria além da linha de base do MVP segue em aberto.

### Estado atual implementado no frontend

- O frontend usa Next.js App Router, com grupos de rota públicos e autenticados que organizam layouts sem alterar as URLs.
- `/login` é pública. `/` e `/analise/[id]` compartilham um layout autenticado responsável pelo Topbar e pelo shell da aplicação.
- O código de análises está organizado por feature, com fronteiras próprias para listagem, workspace e mocks do protótipo.
- Layouts, páginas e composições não interativas permanecem Server Components por padrão. Client Components ficam concentrados na criação real, paginação, polling do detalhe, opiniões read-only e revisão local ainda não integrada.
- A autenticação usa a Users API somente pela entrada pública do gateway. O Next.js atua como BFF, mantém access e refresh tokens em cookies `HttpOnly` e centraliza login, refresh único e logout no servidor.
- A listagem de análises usa `GET /analisadora-api-licia/processes` pelo gateway e recebe somente processos filtrados por ownership no backend. Busca, ordenação e filtros não suportados permanecem desabilitados.
- A criação usa `POST /analisadora-api-licia/processes` pelo BFF, com multipart streaming one-shot, refresh preventivo e persistência real pela API em PostgreSQL e MinIO.
- Detalhe e estados de processamento são reais. Opiniões reais são apresentadas read-only em processos `processed` e `partially_processed`, sem agrupamento de produto ou mutações.
- Worker, visualizador PDF, revisão persistida e conclusão continuam não integrados no frontend.

O PRD já define o escopo funcional do MVP. O documento de decisões da API já fixa decisões relevantes sobre persistência, separação de serviços, modelo de dados base, autenticação presumida, idempotência de write-back, fila no PostgreSQL e estados de processamento.

No desenho atual, é importante separar três camadas de responsabilidade:

- o BFF do frontend mantém tokens fora do runtime cliente e acessa somente os paths públicos allowlisted do gateway;
- o gateway valida access tokens pela Users API e injeta identidade confiável na API de negócio;
- o backend NestJS aplica autorização por ownership em toda consulta e mutação de negócio;
- a comunicação interna entre o serviço de IA e a API NestJS não representa uma ação de usuário e deve usar validação/autenticação própria de serviço.

## 3. Escopo técnico

### Dentro do escopo

- Aplicação frontend para a jornada do analista.
- Backend NestJS para persistência, regras de negócio e controle de estado.
- Schema em PostgreSQL para análises, requisitos e pareceres.
- Armazenamento em MinIO para PDFs de entrada e possíveis arquivos futuros.
- Orquestração assíncrona do processamento de análise.
- Fronteira explícita entre API de persistência e serviço de IA.
- Write-back interno do serviço de IA para a API NestJS.
- Controle de acesso baseado em ownership.
- Modelagem do ciclo de processamento e da linha de base de retry do MVP.

### Fora do escopo

- Contratos detalhados de endpoints.
- Migrations e modelagem física detalhada de banco em nível de implementação.
- Detalhes de implementação próprios de TSD.
- Integrações externas de negócio no MVP.
- Fluxo de aprovação, assinatura ou dupla revisão.
- Versionamento de documentos.
- Destaque avançado de trecho específico no PDF.
- Broker dedicado no MVP.
- Histórico detalhado de retries.
- Geração de relatório PDF final, salvo decisão posterior que o confirme.

## 4. Estratégia da solução

A solução adota uma arquitetura separada em camadas e serviços com responsabilidades distintas:

- o frontend React/Next conduz a jornada do analista e atua como BFF para sessão e consumo do gateway;
- o gateway público é a única entrada downstream do frontend e usa a Users API para autenticação central;
- a API NestJS é a dona do estado de negócio e da persistência;
- o PostgreSQL armazena dados de produto e o estado do processamento no MVP;
- o MinIO armazena os PDFs de entrada e, se necessário no futuro, arquivos de saída;
- o serviço de IA processa PDFs de forma assíncrona usando File API;
- o serviço de IA não escreve diretamente no banco, e devolve resultados por um contrato interno exposto pela API NestJS;
- o write-back interno do serviço de IA deve ser protegido por um mecanismo próprio de validação/autenticação entre serviços;
- o analista revisa e finaliza os resultados no frontend;
- decisões ainda não confirmadas permanecem documentadas como abertas ou diferidas, em vez de serem resolvidas por suposição arquitetural.

Essa estratégia separa claramente o ciclo de vida de processamento por IA do ciclo de revisão humana, evita múltiplos donos do schema de persistência e permite evolução incremental do MVP sem acoplar o backend transacional à volatilidade do motor de IA.

## 5. Arquitetura proposta

```text
Analyst Browser
└── React/Next Frontend
    ├── BFF / sessão server-only
    │   └── Access e refresh tokens em cookies HttpOnly
    └── Gateway público
        ├── Users API
        │   └── Login, refresh e validação JWT
        └── NestJS Analisadora API
            ├── PostgreSQL
            │   ├── analise
            │   ├── requisito
            │   └── parecer
            ├── MinIO
            │   └── PDFs de entrada / possíveis arquivos de saída
            ├── Abstração de fila/processamento
            │   └── fila/estado baseado em PostgreSQL no MVP
            └── Contrato interno de write-back
                └── Serviço de Análise por IA
                    └── File API
```

Pontos estruturais da arquitetura:

- O navegador não recebe tokens em JavaScript nem chama APIs downstream diretamente.
- O BFF usa somente os paths públicos do gateway e não funciona como proxy arbitrário.
- Uploads multipart são encaminhados como stream e não são repetidos após o consumo do body.
- O gateway remove headers de identidade fornecidos pelo cliente e injeta a identidade validada pela Users API.
- A API NestJS é a única dona das escritas em PostgreSQL.
- A API NestJS deve aplicar ownership em toda query e mutação de negócio.
- O serviço de IA não escreve diretamente no banco.
- O serviço de IA não atua como usuário do sistema.
- O serviço de IA devolve resultados por um contrato interno de write-back para a API NestJS.
- O write-back interno é comunicação sistema→sistema e deve ser protegido por validação/autenticação própria.
- O status de processamento e a conclusão humana são estados separados.

## 6. Componentes principais

| Componente | Responsabilidade | Observações |
|---|---|---|
| React/Next frontend | Suportar a jornada do analista: criação, listagem, revisão e conclusão de análises | Interface principal do produto no MVP |
| BFF / sessão Next.js | Manter tokens em cookies `HttpOnly`, renovar uma vez e expor somente operações allowlisted ao navegador | Listagem permite um retry após refresh; upload é one-shot e renova preventivamente antes do stream |
| Gateway público | Ser a única entrada downstream, validar access token e propagar identidade confiável | A paridade entre a configuração local Traefik e o Istio do ambiente precisa ser validada |
| Users API | Autenticar usuários, emitir/renovar JWTs e validar identidade para o gateway | Logout atual descarta cookies no frontend; não há revogação server-side |
| NestJS Analisadora API | Persistir dados, aplicar regras de negócio, controlar estados e expor contratos internos/externos necessários | Fonte de verdade persistida do sistema e responsável por enforcement de ownership |
| PostgreSQL | Armazenar análises, requisitos, pareceres e estado de processamento | Também funciona como mecanismo de fila/estado no MVP |
| MinIO | Armazenar PDFs de entrada e, futuramente, possíveis arquivos de saída | Estratégia de retenção e lifecycle ainda está em aberto |
| Catálogo de requisitos | Representar a base fixa/persistida de verificações normativas, jurídicas e técnicas | Estrutura exata ainda aberta no nível de modelagem detalhada |
| Estado/fila de processamento | Representar o lifecycle assíncrono da análise | No MVP, suportado por PostgreSQL e abstraído do restante da lógica |
| Serviço de análise por IA | Processar o PDF e comparar o conteúdo com o catálogo de requisitos | Componente separado da API de persistência |
| File API | Suportar o processamento documental utilizado pelo serviço de IA | Dependência externa de processamento |
| Contrato interno de write-back | Receber resultados do serviço de IA na API NestJS de forma idempotente | Não deve ser tratado como endpoint público de usuário e deve usar validação/autenticação própria |
| Guard de ownership / controle de acesso | Garantir que cada analista só acesse análises iniciadas por ele | Deve ser aplicado consistentemente em leitura e escrita em toda query de negócio |
| Mecanismo de retry | Permitir novo processamento após erro com controle mínimo no MVP | Histórico detalhado de retries fica diferido |

## 7. Fluxos técnicos principais

### Fluxo - Criar análise e enviar PDF

1. O navegador monta `nup`, `contractObject` e `file` e envia o multipart somente para o BFF same-origin.
2. O BFF renova a sessão, se necessário, antes de consumir o body e encaminha o stream uma única vez pelo gateway público.
3. O gateway valida o access token, remove identidade forjada e injeta a identidade confiável do analista.
4. A API valida campos, conteúdo e tamanho do PDF, armazena o objeto no MinIO e registra a análise no PostgreSQL com estado `pending`.
5. O BFF aceita somente o retorno `202` esperado; o frontend apresenta sucesso e recarrega a primeira página da lista.

### Fluxo - Enfileirar processamento assíncrono

1. Após a criação da análise, a API NestJS registra o estado inicial de processamento como parte do ciclo de vida da `analise`.
2. A API prepara o payload necessário para processamento e o entrega à abstração de fila/processamento do MVP.
3. O trabalho fica disponível para consumo assíncrono pelo serviço de análise por IA.

### Fluxo - Serviço de IA processa PDF e devolve resultados

1. O serviço de análise por IA recebe um trabalho pendente pela abstração de processamento definida para o MVP e obtém a referência do PDF e do conjunto de requisitos aplicável.
2. O serviço usa a File API para processar o documento.
3. O serviço produz sugestões de status por requisito, com evidência mínima por página quando disponível.
4. O serviço envia os resultados para a API NestJS por um contrato interno de write-back.
5. A API NestJS persiste os resultados de forma idempotente, sem permitir escrita direta do serviço de IA no banco.
6. A análise passa ao estado de processamento correspondente ao resultado do job.

Observação: o detalhe exato do mecanismo de autenticação/validação do write-back interno pertence ao TSD, mas a necessidade dessa proteção já é decisão arquitetural deste SDD.

### Fluxo - Analista abre análise processada e revisa requisitos

1. O BFF do frontend busca a análise pelo gateway usando o access token da sessão.
2. A API retorna apenas dados da análise pertencente àquele analista.
3. O frontend apresenta inicialmente os itens não conformes sugeridos pela IA.
4. O analista navega livremente entre seções/abas e revisa os requisitos.

### Fluxo - Analista altera status final e marca requisitos como verificados

1. O analista consulta a sugestão da IA e a evidência mínima disponível.
2. O analista mantém ou altera o status final do requisito.
3. O analista marca o requisito como verificado.
4. A API persiste o status final humano e o estado de verificação sem sobrescrever a sugestão original da IA.

### Fluxo - Conclusão da análise

1. O frontend solicita a conclusão da análise.
2. A API verifica se todos os requisitos estão marcados como verificados.
3. Se a condição for atendida, a API registra a data/hora de conclusão e consolida a análise como concluída no ciclo humano.
4. O estado de conclusão humana permanece distinto do estado de processamento por IA.

### Fluxo - Erro de processamento e retry

1. Se o processamento falhar, a análise recebe estado de erro no ciclo de processamento.
2. O erro fica associado à `analise` com detalhe mínimo para operação.
3. O analista ou o sistema pode reacionar o retry conforme a política do MVP.
4. O retry reaproveita a mesma análise, incrementa contador mínimo de tentativas e reinsere o trabalho no ciclo assíncrono.

## 8. Dados e contratos

| Entidade/Contrato | Responsabilidade | Observações |
|---|---|---|
| `analise` | Representar a unidade principal de trabalho do analista | Inclui metadados de criação, ownership, ciclo de processamento e conclusão humana |
| `requisito` | Representar o catálogo fixo de verificações normativas, jurídicas e técnicas | É um catálogo persistido e reutilizável; estrutura detalhada ainda aberta |
| `parecer` | Representar a relação entre uma análise e um requisito | Deve preservar, separadamente, o status sugerido pela IA e o status final humano |
| Objeto PDF de entrada em MinIO | Representar o arquivo-base usado na análise | Estratégia final de retenção e lifecycle ainda está em aberto |
| Status de processamento | Representar o ciclo assíncrono do job de análise | No MVP: `pending`, `processing`, `processed`, `partially_processed`, `error` |
| Evidência / referência de página | Representar o vínculo mínimo entre requisito e documento | No MVP, pode ficar inline no `parecer` por referência de página |
| Payload interno de write-back | Transportar os resultados do serviço de IA para a API NestJS | Deve ser idempotente, autenticado/validado no contexto interno e não expor o schema de banco como contrato externo |
| Contexto de identidade/ownership do analista | Garantir que a análise pertença a um único analista | Deve ser aplicado de forma consistente em criação, leitura, revisão e conclusão |

## 9. Decisões técnicas relevantes

| Decisão | Motivo | Consequência |
|---|---|---|
| Frontend em React/Next | Alinhar a aplicação do analista a uma stack web moderna com bom suporte a sessão e fluxo de produto | O frontend concentra a jornada do analista e integra com a camada de autenticação/sessão |
| Backend em NestJS | Ter uma API transacional estruturada para regras de negócio e persistência | A API NestJS vira a dona do estado e dos contratos de escrita |
| PostgreSQL como persistência relacional | Necessidade de dados estruturados, relações claras e consistência transacional | Análises, requisitos, pareceres e estado de processamento ficam centralizados em banco relacional |
| MinIO para arquivos | Necessidade de armazenar PDFs de entrada com estratégia controlada | O sistema passa a depender de política de storage, retenção e segurança de objetos |
| Serviço de IA separado | Separar persistência estável da volatilidade do processamento por IA | A arquitetura passa a operar com fronteira explícita entre API de persistência e motor de análise |
| Processamento assíncrono | O processamento de PDFs pode levar minutos | O fluxo de usuário não pode depender de resposta síncrona fim a fim |
| PostgreSQL como fila/estado no MVP | Reduzir complexidade e infra adicional no início | Pode ser suficiente no MVP, mas exige reavaliação se volume e concorrência crescerem |
| NestJS como dono único do schema | Evitar múltiplos donos do modelo persistido | O serviço de IA não escreve diretamente no banco |
| Write-back do serviço de IA via API NestJS | Preservar fronteira entre serviços e desacoplar o motor de IA do schema | O contrato interno precisa ser estável e idempotente |
| Dois status no `parecer` | Separar sugestão da IA de decisão humana | Colapsar esses campos seria erro crítico de modelagem |
| Evidência por página inline no MVP | Atender rastreabilidade mínima com baixa complexidade | Destaque avançado de trecho fica diferido |
| Controle de acesso por ownership | Atender à regra de que cada analista vê apenas suas análises | Toda query e mutação precisa aplicar filtro de ownership corretamente |
| Autenticação própria no write-back interno | Separar autenticação de usuário da comunicação interna entre serviços | O serviço de IA não pode ser tratado como usuário e o contrato interno precisa de proteção dedicada |
| Retry in-place com contador | Entregar baseline operacional simples para falhas de processamento | Histórico detalhado de tentativas fica diferido |
| Broker dedicado diferido | Evitar infra adicional prematura no MVP | Pode ser introduzido depois, se volume, concorrência ou back-pressure exigirem |
| Relatório final diferido/em aberto | A decisão de produto ainda não está fechada | A arquitetura não deve assumir esse artefato como componente obrigatório do MVP |

## 10. Riscos técnicos

| Risco | Impacto | Mitigação |
|---|---|---|
| Fila baseada em PostgreSQL não escalar com aumento de volume | Alto | Manter a abstração de fila desacoplada para permitir porte posterior a broker dedicado |
| Processamento por IA ser lento ou falhar com frequência | Alto | Modelar processamento assíncrono, estado de erro explícito e retry mínimo no MVP |
| Estratégia de persistência de arquivos afetar storage, retenção e segurança | Alto | Fechar política de MinIO, retenção e acesso antes da implementação detalhada |
| Decisão tardia sobre relatório final impactar modelo de dados | Médio | Manter a geração de relatório como capacidade diferida e projetar extensão sem acoplá-la ao núcleo do MVP |
| Enforcement inconsistente de ownership | Alto | Centralizar e validar o controle de acesso em todas as consultas e mutações |
| Confundir status sugerido pela IA com status final humano | Alto | Manter campos separados em `parecer` e reforçar a distinção em backend e frontend |
| Write-back interno não ser idempotente | Alto | Definir contrato interno idempotente e garantir unicidade do par análise × requisito |
| Lifecycle de objetos em MinIO seguir indefinido | Médio | Fechar regra de retenção, descarte e acesso antes de produção |
| Suposições de auth/sessão não se sustentarem na topologia final | Médio | Validar arquitetura de autenticação e sessão junto da estratégia de deploy |
| Regras do gateway local não estarem reproduzidas no Istio | Alto | Validar rewrite, forward-auth, remoção de `X-User-*` e bloqueio de superfícies internas no ambiente-alvo |
| Tokens vazarem pelo runtime cliente ou cache compartilhado | Alto | Usar somente cookies `HttpOnly`, BFF allowlisted e respostas privadas `no-store` |
| Upload grande exceder timeout ou body size do gateway/Istio | Alto | Alinhar limites externos acima de 50 MiB mais overhead e validar upload lento antes de Release |
| Uploads concorrentes pressionarem a memória da API | Alto | A API materializa o arquivo em memória; executar teste de capacidade e definir limites operacionais |
| Repetição de criação produzir duplicidade | Alto | Não repetir multipart automaticamente; definir idempotência antes de permitir replay |
| Item recém-criado não ocupar posição determinística em empate | Médio | Usar o `202` como confirmação e não prometer a posição até existir desempate estável no backend |
| Proteção insuficiente do write-back interno | Alto | Definir mecanismo próprio de validação/autenticação entre serviços antes do TSD |
| Ausência de histórico detalhado de auditoria ser insuficiente para compliance | Médio | Validar expectativa mínima de auditoria antes do TSD e registrar limitação explicitamente |

## 11. Estratégia de validação

- [ ] Validar a arquitetura com a pessoa desenvolvedora de backend responsável.
- [x] Validar a fronteira frontend/backend e a responsabilidade de cada camada.
- [ ] Validar o modelo de persistência contra o PRD.
- [ ] Validar de ponta a ponta o ciclo assíncrono de processamento (`pending`, `processing`, `processed`, `partially_processed`, `error`).
- [x] Validar o comportamento de ownership e controle de acesso por analista.
- [x] Validar a criação multipart, o estado inicial `pending` e a persistência local em PostgreSQL/MinIO.
- [ ] Validar a separação entre autenticação de usuário e autenticação interna de serviço.
- [ ] Validar a estratégia de persistência de PDFs em MinIO.
- [ ] Validar, em alto nível, o contrato interno de write-back do serviço de IA.
- [ ] Validar o comportamento de retry e tratamento de erro no MVP.
- [ ] Validar as decisões em aberto que precisem estar fechadas antes do TSD.
- [ ] Confirmar que o documento não prescreve implementação de código prematuramente.

## 12. Questões em aberto

- [ ] O relatório PDF final entra no MVP ou permanece diferido?
- [ ] Qual é o período de retenção e o lifecycle dos PDFs de entrada?
- [ ] Se houver relatório final, arquivos de saída também devem ser persistidos?
- [ ] Qual será a estrutura exata do catálogo de requisitos?
- [ ] Qual será o contrato interno exato de write-back?
- [ ] Qual será o mecanismo exato de validação/autenticação do write-back interno entre serviços?
- [ ] Como o serviço de IA receberá as referências do PDF e o payload de requisitos?
- [ ] A fila baseada em PostgreSQL é suficiente para o volume esperado do MVP?
- [ ] Qual é o modelo mínimo aceitável de auditoria?
- [ ] Quais métricas devem ser capturadas para tempo de processamento, frequência de retry e divergência IA/humano?
- [ ] Qual topologia de deploy vai expor ou proteger a comunicação interna entre serviços?
