---
title: Engineering Checkpoint - LicIA Analisadora
type: checkpoint
status: draft
created: 09/07/2026 - 10:36 // Rolf Matela
updated: 17/08/2026 - 15:45 // Rolf Matela
---

# Engineering Checkpoint — LicIA Analisadora

## 1. Estado atual

O frontend usa Next.js 16, React 19, TypeScript e App Router. O protótipo de alta fidelidade foi incorporado como baseline demonstrativo, incluindo tema, Topbar compartilhado, lista de análises e workspace de revisão.

O código de produto está organizado por feature. As rotas usam os grupos `(public)` e `(authenticated)`: `/login` é pública; `/` e `/analise/[id]` compartilham um layout autenticado. A autenticação usa a Users API pelo gateway público; o Next.js mantém access e refresh tokens somente em cookies `HttpOnly` e atua como BFF.

A listagem, criação, detalhe, opiniões e revisão usam a Analisadora API pelo gateway. O detalhe usa novamente o workspace split-view aprovado no repositório: status reais ocupam o painel direito durante o processamento, o painel de revisão ocupa o mesmo painel nos estados processados e o lado documental permanece um placeholder seguro. O worker foi validado no fluxo assíncrono local completo.

O ciclo de revisão está integrado: o analista verifica requisitos, altera o parecer sugerido pela IA com comentário obrigatório e conclui a análise por uma confirmação global única. Com isso os mocks de análise foram removidos do repositório. Essa integração foi entregue no commit `2fd9feb` sem especificação prévia e está registrada retroativamente na TSD 008.

A validação da TSD 008 contra a stack real foi executada em 16/08/2026. A fronteira do frontend passou em toda a matriz — allowlist, ownership, conflitos, sessão, indisponibilidade e cache. A mesma validação revelou um defeito na Analisadora API que causava perda silenciosa da decisão do analista: qualquer `PATCH` que omita `reviewStatus` apaga o veredito e o comentário humanos já gravados, e o checkbox de verificação enviava exatamente esse formato. O frontend foi mitigado — nenhuma gravação de revisão é parcial, as três chaves viajam sempre — e a TSD 008 está concluída. **A correção definitiva continua pendente na Analisadora API**, que segue defeituosa para qualquer outro cliente.

Sobre esse ciclo, a TSD 009 acrescentou filtro por estado na lista, aplicado pela Analisadora API, uma segunda camada de filtro por verificação nas áreas de revisão e verificação em massa por veredito. A TSD 010 integrou os dois últimos endpoints que existiam sem consumidor: reprocessamento do restante elegível de uma análise parcial e exclusão de um processo, que pela ADR-0001 da API é a única saída para um job travado por worker morto.

A TSD 011 acrescentou uma **ponte temporária** para o painel documental: o PDF exibido vem do navegador do analista, capturado no upload e guardado localmente, e com ele as referências de página passaram a abrir o documento na posição da evidência. A ponte não substitui a integração real — o servidor continua sem contrato de leitura — e foi desenhada para ser removida em bloco quando esse contrato existir.

A TSD 012 habilitou a busca por NUP e objeto na lista, usando a mesma natureza de ponte: como a API não possui parâmetro de busca, o frontend carrega o conjunto completo do analista e filtra localmente, recusando-se a operar acima de um teto de volume em vez de entregar resultado parcial disfarçado de completo. A mesma slice fez os filtros do painel de revisão voltarem ao padrão a cada troca de área.

Continuam fora da integração real do frontend a **leitura do PDF a partir do servidor** e a **busca no servidor**, ambas sem contrato público, e a ordenação da lista, ausente do contrato da API.

## 2. Marcos concluídos

| Marco | Estado | Observação |
|---|---|---|
| Fundação técnica em Next.js, TypeScript e App Router | Concluído | Registrado historicamente na TSD 001 |
| Adoção visual e comportamental do protótipo | Concluído | Preserva o baseline desktop aprovado |
| Organização feature-oriented das análises | Concluído | Listagem, workspace, tipos e acesso a dados possuem ownership da feature |
| Separação de rotas públicas e autenticadas | Concluído | Route groups não alteram as URLs públicas |
| Layout autenticado compartilhado | Concluído | Centraliza Topbar e shell da aplicação |
| Login/logout mock | Substituído | Substituído pela autenticação real e pela sessão BFF na TSD 003 |
| Fronteira de leitura dos mocks | Substituído | Registrado na TSD 002; os mocks foram removidos pela TSD 008 e a fronteira deixou de existir |
| Autenticação real e listagem read-only | Concluído | Registrado na TSD 003; BFF allowlisted, cookies `HttpOnly` e gateway como única entrada downstream |
| Criação multipart real | Concluído | Registrado na TSD 004; upload streaming one-shot, persistência real e ownership validado |
| Detalhe real e status de processamento | Concluído | Registrado na TSD 005; BFF por ID, cinco estados e polling com pausa por visibilidade |
| Opiniões reais read-only | Concluído | Registrado na TSD 006; resultados processados sem PDF ou mutações de revisão |
| Reconciliação do workspace real | Concluído | Registrado na TSD 007; split-view existente com polling e opiniões reais, sem mocks |
| Revisão e conclusão reais | Concluído | Registrado retroativamente na TSD 008; validado na stack real e mitigado contra o defeito de perda de dados da Analisadora API |
| Filtro por estado e verificação em massa | Concluído | Registrado na TSD 009; filtro da lista aplicado pelo backend, segunda camada de filtro e lote por veredito |
| Reprocessamento e exclusão de processo | Concluído | Registrado na TSD 010; `retry` do restante elegível e `delete` disponível em todos os estados |
| Visualizador documental local | Concluído, provisório | Registrado na TSD 011; ponte no navegador enquanto não há contrato de leitura, validada em navegador |
| Busca na lista e reset dos filtros | Concluído, busca provisória | Registrado na TSD 012; busca global por varredura local com teto, e filtros de revisão voltando ao padrão por área |

Não há TSD ativa. As TSDs 001 a 012 estão concluídas e permanecem registros históricos imutáveis.

## 3. Fronteiras atuais

- Layouts, páginas, Topbar, lista, workspace e painel documental são Server Components por padrão.
- As fronteiras Client ficam concentradas na criação real, na paginação e no filtro da lista, no polling do detalhe, nas ações de reprocessamento e exclusão e no painel de revisão. Não há mais painel mock desconectado: o painel de revisão opera sobre dados reais.
- Server Actions são usadas para login e logout reais; operações de negócio continuam fora de Server Actions.
- O layout autenticado compartilha o chrome entre `/` e `/analise/[id]`; `/login` permanece fora desse shell.
- Access e refresh tokens não entram no grafo cliente; ficam em cookies `HttpOnly` e são usados somente pelo BFF.
- `GET` e `POST /api/analyses` são allowlisted, não compartilham cache e encaminham somente para o path público de processos no gateway.
- `GET /api/analyses/[id]` aceita somente ID inteiro positivo e normaliza o detalhe sem expor storage, tokens ou resultados de revisão.
- `GET /api/analyses/[id]/opinions` valida o array integral e expõe somente resultados read-only normalizados.
- O POST encaminha o multipart como stream, renova a sessão antes do body e nunca repete uma tentativa iniciada.
- `analysisQueries.ts` consulta listagem e detalhe reais; nenhuma tela recebe PDF, checklist ou Técnica fictícios.
- O detalhe consulta a cada 10 segundos somente em `pending` e `processing`, pausando quando a aba está oculta.
- Opiniões são consultadas somente em `processed` e `partially_processed`; falhas ficam isoladas do detalhe.
- O detalhe real preserva o split-view atual: placeholder documental à esquerda e dados reais no painel de 596px à direita.
- `PATCH /api/analyses/[id]/opinions/[opinionId]` aceita somente `reviewStatus`, `reviewComment` e `verified`, recusa por inteiro qualquer corpo com chave extra e revalida a resposta da API antes de devolvê-la.
- `POST /api/analyses/[id]/finish` não possui corpo, descarta o `ProcessDetail` devolvido pela API e responde 204; o cliente recarrega o detalhe para obter `finishedAt`.
- Nenhuma gravação é otimista: a tela só muda depois que a API confirma, e cada resposta substitui pontualmente a opinião afetada.
- Mutações existem somente em `processed` e `partially_processed`, espelhando os estados que a API considera parados, e desaparecem quando `finishedAt` existe.
- A conclusão é global e exige todos os requisitos das duas áreas verificados; o bloqueio da UI antecipa o 409 da API sem substituí-lo.
- A divisão Checklist/Técnica é uma convenção do frontend sobre o `type` livre da API; tipo desconhecido permanece visível no Checklist.
- Não existe mais nenhum mock de análise no repositório; `src/features/analyses/mocks/` foi removido.
- O filtro por estado da lista é aplicado pela Analisadora API (`status` repetível), então o total e a paginação refletem o conjunto filtrado; trocar o filtro volta para a primeira página. A ordenação continua visivelmente desabilitada por falta de contrato.
- A lista possui dois modos. Sem busca, o servidor pagina e filtra. Com busca, o frontend varre o conjunto completo do analista — preservando os estados selecionados — e passa a filtrar e paginar localmente, para que o resultado seja global e não um recorte da página carregada. Acima de 500 análises a busca se recusa a operar e diz por quê.
- O conjunto varrido fica em memória, amarrado a uma chave de estados e nova tentativa; trocar de página durante a busca não gera requisição.
- As duas camadas de filtro do painel de revisão voltam ao padrão a cada troca de área, e trocar o parecer devolve a verificação para "Todos".
- As áreas de revisão possuem duas camadas de filtro independentes, parecer e verificação, aplicadas em conjunto. Ambas são locais e operam sobre o conjunto integral de opiniões já carregado.
- A verificação em massa é uma sequência de gravações individuais, restrita à área aberta, e nunca inclui requisitos sem veredito efetivo, que a API recusaria. Uma falha interrompe o lote e informa quantos itens já foram gravados.
- `POST /api/analyses/[id]/retry` não possui corpo e responde 204, descartando o `ProcessDetail` da API; o detalhe é recarregado pelo dono do polling. O reprocessamento só é oferecido em `partially_processed` não concluído, e as três causas de recusa da API chegam como um único 409.
- `DELETE /api/analyses/[id]` responde 204 e não possui 409: a API permite a exclusão em qualquer estado, `processing` incluído. Um 404 é tratado como sucesso, porque o processo já não existe.
- A exclusão exige confirmação explícita, nomeia o NUP e declara a irreversibilidade; a ação fica no cabeçalho do painel documental, preservando a geometria do painel de 596px.
- O documento exibido no painel documental é sempre uma cópia local do navegador, guardada em IndexedDB com chave `${userId}:${processId}`. Nenhuma requisição é feita para obtê-lo, e a interface nunca afirma que a cópia corresponde ao arquivo processado.
- As cópias locais são apagadas no logout e na abertura da tela de login, e as de outros analistas são descartadas ao entrar no layout autenticado. O `userId` desce ao cliente apenas como chave de armazenamento e não participa de nenhuma decisão de autorização.
- A referência de página só se comporta como controle quando existe cópia local; sem documento, permanece texto informativo.

## 4. Validação mais recente

| Validação | Resultado | Observação |
|---|---|---|
| `npm run lint` | Passou | Sem erros de lint |
| `npm run typecheck` | Passou | Sem erros de TypeScript |
| `npm run build` | Passou | Build gerou as páginas e os seis BFFs: lista, detalhe, opiniões, revisão, conclusão e reprocessamento |
| Stack Docker local | Passou | Traefik, Users API, MongoDB, PostgreSQL, MinIO e Analisadora API iniciados; migrations aplicadas |
| Login válido e inválido | Passou | Fluxo do frontend validado contra a Users API real pelo gateway |
| Cookies e exposição de token | Passou | Cookies `HttpOnly`; tokens ausentes de `document.cookie` e do body do BFF |
| Refresh e expiração | Passou | Refresh real pela Users API, um retry, limpeza e redirecionamento quando o refresh falha |
| Logout | Passou | Todos os cookies de sessão removidos |
| Rewrite e forward-auth | Passou | Prefixos públicos removidos e Bearer validado antes da Analisadora API |
| Headers de identidade | Passou | `X-User-Id` forjado foi removido e substituído pela identidade validada |
| Ownership com dois usuários | Passou | 12 processos de A e 1 de B; listas isoladas e acesso cruzado retornando 404 |
| DTO e paginação | Passou | Shape real validado; páginas de 10 itens retornaram 10 e 2 resultados |
| Allowlist e erros | Passou | Query desconhecida 400, sem sessão 401 e backend parado convertido em indisponibilidade |
| Estados da lista | Passou | Loading, populada, vazia, indisponível, sessão expirada e retry verificados |
| Cache | Passou | BFF responde `private, no-store` e `Vary: Cookie` |
| Fronteira BFF | Passou | Navegador chamou somente o BFF; gateway permaneceu downstream server-only |
| Superfícies privadas | Passou | `/analisadora-api-licia/internal/*` e `/docs` retornaram 403 no Traefik |
| Criação multipart real | Passou | UI recebeu `202 pending`, apresentou sucesso e recarregou a página 1 |
| Validação de criação | Passou | PDF inválido 400, sem sessão 401 e acima de 50 MiB 413 |
| Fronteira exata de 50 MiB | Limitação externa | BFF aceitou o body, mas a API retornou 413 para 52.428.800 bytes apesar do contrato inclusivo |
| Upload e sessão | Passou | Refresh preventivo ocorreu antes do stream; clique duplicado gerou um único POST |
| Persistência da criação | Passou | PostgreSQL em `pending`, `job_token`/`finished_at` nulos e PDF presente no MinIO |
| Ownership da criação | Passou | Processo criado por A não apareceu para B; key do objeto permaneceu associada ao usuário validado |
| Indisponibilidade na criação | Passou | Analisadora API parada produziu resultado ambíguo 503 sem retry automático |
| Detalhe real | Passou | Processo próprio abriu com metadados reais e status `pending`, sem workspace mock |
| Ownership do detalhe | Passou | Processo estrangeiro e ID ausente retornaram o mesmo 404 não revelador |
| Polling do detalhe | Passou | Intervalo de 10 segundos, pausa oculta, retomada visível e parada terminal validados |
| Estados de processamento | Passou | Cinco estados e sequência ativa validados sem executar o worker |
| Erros do detalhe | Passou | 401, 404, DTO/timestamp inválido 502, indisponibilidade 503, retry manual e `errorDetail` verificados |
| Cache do detalhe | Passou | BFF responde `private, no-store` e `Vary: Cookie` |
| Opiniões read-only | Passou | Resultados completos/parciais, IA, decisão humana, comentários, verificação e evidência validados |
| Elegibilidade de opiniões | Passou | Somente `processed`/`partially_processed` consultaram; demais estados não chamaram o endpoint |
| Isolamento do painel | Passou | Loading, inconsistência vazia, erro e retry preservaram os metadados do processo |
| Segurança das opiniões | Passou | Ownership, sessão, cache privado, DTO inválido e ausência de chamadas diretas ao gateway validados |
| Worker real integrado | Passou | Dois PDFs reais chegaram a `processed`; cada processo produziu e persistiu 25 veredictos sem falhas |
| Opiniões reais na UI | Passou | Processos 41 e 46 renderizaram 25 cards normalizados, IA/humano separados, cache privado e evidência não interativa |
| Workspace real | Passou | Gap de 16px, painel direito de 596px, placeholder seguro e navegação de retorno validados |
| Contenção do workspace | Passou | Em 1440×900 a página não rolou; opiniões ficaram em lista interna com scroll |
| Ausência de mocks/mutações | Passou | Válido até a TSD 007; a TSD 008 introduziu deliberadamente Checklist/Técnica, verificação, alteração de parecer e conclusão |
| Allowlist e erros das mutações | Passou | ID, query e corpo fora do contrato recusados com 400 sem alcançar a API; 401 sem sessão; 405 em método errado |
| Revisão persistida | Passou | Verificação, desverificação e alteração de parecer confirmadas no banco |
| Conclusão da análise | Passou | 409 com 24/25 verificados, 204 com 25/25, `finished_at` persistido e análise congelada |
| Conflitos de estado | Passou | Mutação e conclusão recusadas com 409 em processo `processing` e em análise concluída |
| Ownership das mutações | Passou | Processo alheio, opinião de outro processo, conclusão alheia e processo inexistente retornam o mesmo 404 |
| Sessão e indisponibilidade nas mutações | Passou | Refresh inválido retorna 401 e limpa os três cookies; API parada retorna 503 com recuperação |
| Cache das mutações | Passou | `private, no-store` e `Vary: Cookie` em 200, 400, 401 e 204 |
| Fluxo parcial completo | Passou | `partially_processed` concluído após parecer humano nos três requisitos sem resultado da IA |
| Preservação da decisão humana | Passou após mitigação | `PATCH` parcial apagava veredito e comentário; com a tripla completa os dois sobrevivem, verificado no banco |
| Filtro por estado da lista | Passou | Cada estado isolado, combinação de dois, os cinco juntos e repetição deduplicada; total e paginação refletem o conjunto filtrado |
| Recusas do filtro por estado | Passou | Estado desconhecido, estado vazio, chave `statuses` e repetição excessiva retornaram 400 sem alcançar a API |
| Verificação em massa | Passou | Lote "Conforme" atingiu somente os 8 conformes; lote "Todos" pegou os 15 restantes com veredito |
| Exclusão de requisitos sem parecer do lote | Passou | Os 2 sem veredito ficaram de fora e, se enviados, a API os recusa com 400; a conclusão seguiu em 409 |
| Allowlist do reprocessamento e da exclusão | Passou | ID e query fora do contrato em 400, sem sessão 401, `GET` no reprocessamento 405 |
| Ownership do reprocessamento e da exclusão | Passou | Processo alheio e inexistente retornaram o mesmo 404 nas duas rotas |
| Reprocessamento aceito | Passou | `partially_processed` com 3 falhos retornou 204, voltou a `pending` e reenfileirou exatamente os 3, sem redespachar os 22 bem-sucedidos |
| Recusas do reprocessamento | Passou | Estado não parcial, nenhum requisito elegível e análise concluída retornaram 409 |
| Exclusão real | Passou | 204, processo removido, opiniões em cascata e objeto apagado do MinIO; segunda exclusão e detalhe retornaram 404 |
| Cache do reprocessamento e da exclusão | Passou | `private, no-store` e `Vary: Cookie` nas duas rotas |
| Fronteira do visualizador local | Passou | Sem `fetch` no módulo de documentos e no painel, sem alteração em `src/app/api/`, `userId` só como chave e blob URL contida |
| Renderização com o visualizador local | Passou | `/login`, `/` e `/analise/[id]` renderizaram com sessão real, sem erro no servidor |
| Visualizador local em navegador | Passou | Captura no upload, reabertura com documento, anexo manual, salto de página pela evidência, purga no logout e isolamento entre dois analistas |
| Ciclo de processamento com worker | Passou | Com o `ms-analisadora` no ar, um PDF percorreu `pending` → `processed` e o painel de revisão assumiu o painel direito |
| Varredura da busca | Passou | 121 análises semeadas retornaram 50, 50 e 21 itens com `total` estável, preservando o filtro por estado |
| Recusa acima do teto da busca | Passou | Com 521 análises, a primeira resposta traz `total` acima do teto de 500, única entrada da decisão |
| Correspondência da busca | Passou | 11 casos sobre o módulo puro: NUP, acento nos dois sentidos, caixa, hífen, múltiplos termos e ausência de resultado |
| Reset dos filtros em navegador | Passou | As três transições entre áreas e entre camadas se comportaram como especificado |
| Busca em navegador | **Reprovou, corrigida sem re-verificação** | A varredura travava em carregamento e o campo exibia dois controles de limpar; um terceiro defeito, lista em branco acima do teto, veio da releitura. Os três estão na seção 6 da TSD 012 |

As validações da conclusão da TSD 001 permanecem registradas na própria TSD e não devem ser reinterpretadas como validação das funcionalidades posteriores.

A validação da TSD 008 foi executada em 16/08/2026 na stack local, com dois analistas reais e resultados de IA produzidos por execuções anteriores do worker. Permanecem não executados o 502 por DTO incompatível na resposta da mutação, que exigiria gateway controlado, e a inspeção visual dos estados do painel em navegador. A matriz completa está na seção 13 da TSD 008 e o defeito na seção 14.

As validações das TSDs 009 e 010 foram executadas em 16 e 17/08/2026 na mesma stack. Nenhuma delas incluiu execução da interface em navegador, porque não há navegador headless no ambiente: os controles foram validados na fronteira HTTP e, na TSD 009, pela lógica de seleção exercitada com os mesmos dados que a interface consome. O reprocessamento foi validado até o reenfileiramento, sem o worker em execução, então a produção de um novo resultado real não faz parte do registro.

## 5. Limitações e pendências

- [x] Substituir credenciais fixas e cookie mock por autenticação através da Users API e sessão BFF.
- [x] Integrar a listagem ao enforcement de ownership já implementado pela Analisadora API.
- [x] Introduzir uma fronteira controlada de acesso a dados antes de expandir o consumo direto de mocks.
- [x] Validar a configuração local real do gateway/Traefik e o ownership com dois usuários.
- [x] Integrar criação e upload real até o aceite assíncrono `202` e a persistência inicial.
- [x] Integrar detalhe real e acompanhamento read-only dos estados de processamento.
- [x] Integrar resultados/opiniões reais em modo read-only.
- [x] Validar o worker real no ambiente integrado, incluindo write-back e consumo read-only das opiniões.
- [x] Implementar mutações e persistência nos fluxos de revisão, incluindo a conclusão da análise.
- [x] Validar a TSD 008 contra a stack real.
- [x] Mitigar no frontend a perda silenciosa de `reviewStatus`/`reviewComment` em `PATCH` parcial; nenhuma gravação de revisão é parcial.
- [ ] Corrigir na Analisadora API o tratamento de campo ausente como `null`, causado pelo `transform: true` do `ValidationPipe` em `opinion.service.ts`. A mitigação protege esta interface, mas a API continua descartando decisões humanas para qualquer outro cliente.
- [ ] Integrar visualização PDF real. A TSD 011 entregou uma ponte local no navegador, que **não** substitui o contrato de leitura; enquanto ele não existir, um analista só vê o documento no dispositivo onde a análise foi criada ou onde ele anexou o arquivo manualmente.
- [x] Executar em navegador a verificação da TSD 011, incluindo o suporte a `#page=`, honrado no navegador alvo.
- [x] Integrar `POST /processes/:id/retry` para reprocessar requisitos falhos em `partially_processed`.
- [x] Integrar `DELETE /processes/:id`, saída para um processo travado por worker morto.
- [ ] Oferecer a exclusão também a partir da lista; hoje um processo travado precisa ser aberto para ser removido.
- [ ] Confirmar visualmente em navegador os controles das TSDs 009 e 010 ainda não exercitados: filtro por estado, verificação em massa e reprocessamento. A exclusão foi acionada pela interface durante a sessão manual da TSD 011, mas sem registro de verificação formal.
- [ ] Acompanhar um reprocessamento até novo resultado do worker; a validação da TSD 010 parou no reenfileiramento.
- [x] Ligar o filtro por status na lista, aplicado pelo backend.
- [x] Oferecer filtro por verificação e verificação em massa nas áreas de revisão.
- [ ] Re-verificar a busca em navegador depois das correções da seção 6 da TSD 012; é a única funcionalidade do repositório cuja correção não foi confirmada em execução por ninguém.
- [ ] Obter na Analisadora API um parâmetro de busca e outro de ordenação; `ListProcessesQueryDto` aceita apenas `page`, `pageSize` e `status`. A busca da TSD 012 é uma ponte local com teto de 500 análises, que deixa de funcionar conforme a base cresce.
- [ ] Confirmar no PRD a seleção em massa, que o checkpoint registrava como sugestão não aprovada e a TSD 009 implementou por pedido explícito.
- [ ] Introduzir testes automatizados; o repositório não possui nenhum, e toda validação registrada é manual.
- [ ] Alinhar na Analisadora API o contrato de até 50 MiB com a implementação, que rejeita o byte exatamente no limite.
- [ ] Confirmar body size e timeouts de upload no Traefik e no Istio antes de Release.
- [ ] Definir idempotência antes de permitir retry automático de criação; o fluxo atual é one-shot.
- [ ] Definir desempate estável no backend se a posição do item recém-criado precisar ser garantida.
- [ ] Avaliar responsividade; o baseline atual preserva o viewport desktop fixo de 1440px.
- [ ] Automatizar o seed do catálogo no provisionamento local; sem a execução explícita do seed, o worker retorna 503 e não consome a fila.
- [ ] Investigar o panic do Turbopack no WSL (`Next.js package not found`); a build e o servidor de produção funcionam normalmente.
- [ ] Registrar uma referência visual externa rastreável; a TSD 007 foi comparada somente com o workspace atual aprovado no repositório.

Decisões de produto do PRD já aplicadas ao fluxo real pela TSD 008:

- o MVP possui somente os status Conforme, Não conforme e Não se aplica; `warning`/“Com ressalva” foi removido do código;
- requisitos com status Não se aplica também precisam ser verificados;
- alterar o status final de um requisito também o registra como verificado, na mesma gravação;
- a análise possui uma única confirmação global de conclusão;
- Legislação e Outros permanecem visíveis e indisponíveis.

Decisões de produto do PRD parcialmente aplicadas:

- referências de página clicáveis: a TSD 011 as tornou controles, mas **somente quando existe cópia local do documento**; sem ela permanecem texto informativo, e a numeração segue o arquivo anexado, não necessariamente o processado;
- busca, filtros e ordenação da lista fazem parte do MVP; filtro por estado, paginação e busca estão disponíveis, mas a busca é uma ponte local com teto, e a ordenação continua sem contrato.

Decisões que permanecem parcialmente abertas:

- Checklist e Técnica permanecem áreas separadas e obrigatórias, mas a semântica definitiva da área Técnica ainda precisa ser validada. A TSD 008 implementou um mapa de tipos como convenção do frontend sobre um campo livre, o que torna a definição mais urgente, não menos;
- comentários integram o MVP e são obrigatórios. A TSD 008 decidiu, na prática, exigir comentário ao alterar o parecer e dispensá-lo na simples verificação; essa decisão precisa ser confirmada com produto ou corrigida;
- a seleção em massa deixou de ser hipótese: a TSD 009 implementou verificação em lote para os quatro vereditos, por pedido explícito, e o PRD ainda precisa registrar a decisão. Progressão intermediária por etapas continua sendo apenas sugestão;
- a semântica de ordenação ainda precisa ser definida antes da implementação; o filtro por estado está integrado e a busca da TSD 012 fixou a semântica de correspondência por NUP e objeto, ignorando caixa e acentos, que o backend deveria reproduzir ao oferecer o parâmetro.

## 6. Próximo passo recomendado

Reportar ao time da Analisadora API o defeito da seção 14 da TSD 008. A mitigação protege esta interface, mas a API continua apagando decisões humanas para qualquer outro cliente, e a causa raiz está identificada com precisão.

Em paralelo, confirmar com produto as duas decisões que a TSD 008 tomou por conta própria: a obrigatoriedade de comentário por ação e a semântica definitiva da área Técnica.

Todos os endpoints que a Analisadora API oferece hoje estão integrados. O que resta depende de contratos que não existem, e o frontend já acumula **duas pontes** para contorná-los: o visualizador local da TSD 011 e a busca por varredura da TSD 012.

- a leitura do PDF pelo servidor exige um contrato público owner-scoped;
- busca e ordenação exigem parâmetros que o `ListProcessesQueryDto` não aceita.

Cada ponte tem custo de manutenção e uma data de validade implícita — a da busca é literal, porque ela para de funcionar quando a base passa de 500 análises por analista. Vale levar as duas necessidades ao time da API como um pedido só, com a semântica que o frontend já fixou.

Independentemente disso, o investimento com maior retorno é **introduzir testes automatizados**. O repositório não possui nenhum, e as TSDs 008 a 012 só ganharam confiança por rodadas manuais: o defeito de perda de parecer da TSD 008 apareceu numa delas, e a TSD 011 dependeu inteiramente de verificação humana em navegador para sair do estado de risco. A TSD 012 já introduziu um módulo puro e facilmente testável em `analysisSearch.ts` — exercitado por script durante a validação, mas sem nenhuma rede que o proteja daqui em diante.
