# Perguntas e respostas — LicIA Analisadora

Registro cronológico de toda pergunta feita ao responsável pelo projeto e a resposta dada, com a decisão que cada uma gerou e onde ela ficou documentada.

Serve de trilha de "por que decidimos assim": o `questoes-abertas.md` lista o que ainda está aberto, o `audit.md` narra o que foi feito, e **este arquivo guarda o input humano que dirigiu as decisões**.

## Como manter

- A cada rodada de perguntas (qualquer papel: PM, Engenheiro, ou pergunta pontual), adicionar uma seção nova ao final, com data.
- Registrar a pergunta como foi feita, as opções oferecidas (quando múltipla escolha), a resposta literal ou resumida, e a decisão resultante.
- Quando a resposta foi "você decide", registrar também **o que a IA decidiu** em seguida.
- Nunca reescrever uma entrada antiga; se uma decisão mudar depois, adicionar uma entrada nova apontando para a anterior.

---

## 31/08/2026 — Início do projeto

**P:** O "novo projeto" é um projeto diferente da LicIA Analisadora, ou é a própria LicIA?
Opções: (a) projeto novo, limpar o exemplo; (b) projeto novo, manter o exemplo; (c) é a LicIA Analisadora.
**R:** É a LicIA Analisadora.
**Decisão:** Não entrevistar do zero — revisar o PRD existente e seguir o roteiro de fundação a partir dele.

---

## 31/08/2026 — Etapa 1 do bootstrap (PRD)

**P:** Posso tomar o PRD atual como baseline confirmado do MVP (movendo as 12 questões em aberto para `questoes-abertas.md`), ou algo no escopo mudou?
Opções: aceitar como está / aceitar mas revisar RFs / escopo mudou.
**R:** Aceitar como está.
**Decisão:** PRD marcado `aprovado`; seção 12 movida para `docs/product/questoes-abertas.md` (P-01…P-09, A-01…A-06).

**P:** Alguma das questões em aberto você quer resolver agora, já que afetam a arquitetura (persistência do PDF, autenticação, backend novo)?
Opções: deixar para a Etapa 2 / decidir agora.
**R:** Quero decidir agora.

**P (detalhada, alimentando SDD e quality-gates):**
1. Stack técnica (linguagem, framework, banco, infra)?
2. Depende de outros sistemas/serviços já existentes?
3. Limitações técnicas já conhecidas?
4. Decisões de arquitetura já tomadas a preservar?
5. Persistência do PDF de entrada (RF-018)?
6. Estratégia de autenticação?
7. Processamento síncrono ou assíncrono?
8. Estrutura da base de requisitos?
9. Relatório PDF final entra no MVP?

**R:**
1. Sem stack fechada. O time já usa **Node.js/TypeScript** (frontend em Next.js). Framework de backend, banco e deploy a critério da IA — propor no SDD.
2. Duas dependências reais: **serviço de identidade/usuários já em produção** (consumir a identidade validada, não reimplementar cadastro/login/token); **capacidade de análise assistida por IA** que gera a sugestão de status por requisito a partir do PDF (consumir/acionar, não é o núcleo).
3. Três limitações: processamento do PDF **não é instantâneo** (minutos) → não pode ser síncrono numa requisição HTTP, precisa de acompanhamento de status; documentos de órgão público → **controle de acesso importa desde o MVP**; **volume baixo** (ferramenta interna) → não desenhar para escala alta.
4. Nenhuma decisão de arquitetura pré-definida.
5. Fazer **o mais simples para o MVP**.
6. **Sem autenticação** no MVP.
7. (coberto no item 3 — assíncrono).
8. **Propor** no SDD.
9. **Entra** no MVP.
**Decisão:** RF-016 → Must/MVP; RF-018 → Must (persistir, filesystem, simples); SDD proposto com NestJS + Prisma + PostgreSQL, worker assíncrono em processo, portas para IA e (futura) identidade. Registrado em `questoes-abertas.md` R-01/R-02.

---

## 31/08/2026 — Etapa 2 do bootstrap (SDD)

**P:** O SDD está aprovado como baseline da arquitetura, ou tem ajuste?
Opções: aprovado, seguir / revisar antes / ajustes pontuais.
**R:** Aprovado, seguir.

**P:** Sobre "sem autenticação no MVP": interpretei como — o projeto não constrói login/token, mas recebe a identidade do analista já validada via header do serviço de identidade (com fallback em dev), e ainda aplica o escopo "só vejo minhas análises" (RF-003). Está certo?
Opções: sim, é isso / não — zero identidade no MVP.
**R:** Não — zero identidade no MVP.
**Decisão:** MVP roda com **analista único e fixo por configuração**. RF-003 e o estado "sem permissão" viram pós-MVP (P-10). SDD passa a usar `AnalistaAtualProvider` (sem header). As queries já filtram por `analista_id` para a troca futura ser barata.

**P:** Framework de backend: mantenho NestJS ou prefere Fastify puro?
Opções: NestJS / Fastify puro / decide você.
**R:** Decide você.
**Decisão da IA:** **NestJS**, registrado em `docs/engineering/decisions/001-framework-backend-nestjs.md` (Fastify como alternativa descartada).

---

## 31/08/2026 — Etapa 6 do bootstrap (roadmap + TSD-001)

**P:** A sequência do roadmap está aprovada?
**R:** "Divida em duas frentes: backend e frontend. Eu fico responsável pelo back, o Vinicius pelo front. Vou subir a fundação no GitHub, ele pega lá, abre uma branch e trabalha no frontend, eu sigo no backend, e depois juntamos."
**Decisão:** Roadmap reestruturado em duas tabelas de sequenciamento (Frente Backend / Frente Frontend). Monorepo com `backend/` e `frontend/`.

**P:** A TSD-001 (fundação técnica) está aprovada para implementação?
Opções: aprovada, pode implementar / aprovada mas não implemente ainda / tenho ajustes.
**R:** Aprovada, mas não implemente ainda.

**P:** Como fica o código no repositório, com as duas frentes em paralelo?
Opções: mesmo repo `backend/` e `frontend/` / mesmo repo agora, separar depois / repos separados já.
**R:** Mesmo repo, `backend/` e `frontend/`.

**P:** A fundação técnica do frontend deve ser uma TSD própria?
Opções: TSD-002 separada / uma TSD-001 cobrindo as duas / só backend por enquanto.
**R:** "Faça o que achar melhor para que eu e o Vinicius consigamos trabalhar independente."
**Decisão da IA:** **TSD-002 separada** para a fundação do frontend (máxima independência entre as frentes).

**P:** A TSD-002 (fundação frontend) está aprovada?
Opções: aprovada / tenho ajustes.
**R:** Aprovada.

**P:** Quer que eu prepare o commit da fundação agora?
Opções: não, eu faço / prepare o commit sem push.
**R:** "Pode commitar e fazer o push pro GitHub, que vou dizer pro Vinicius clonar lá e continuar a parte dele."
**Decisão:** Fundação commitada e empurrada para `main` no GitHub.

---

## 31/08/2026 — Ciclo RF-006 (base fixa de requisitos), Agente PM

**P1 — conteúdo do 1º subconjunto (P-07):** já existe a lista real, ou entra um seed-placeholder?
**R1:** Não há lista real fechada. Entra um **seed-placeholder** (8–12 itens), **mas o mecanismo de seed já deve nascer como importador de arquivo externo (CSV)**, não lista digitada em código/JSON. Motivo: caso conhecido de ~12 requisitos estimados virarem 300+ quando a lista real da área jurídica chegou — trocar só o arquivo, não o mecanismo.

**P2 — estrutura (A-03):** os campos bastam, ou faltam campos?
**R2:** `norma_referencia` **estruturada desde já** (lei / artigo / inciso / parágrafo / alínea), não texto livre. Subgrupo/agrupamento visual, severidade/peso e texto de orientação: **não incluir agora** — adicionar depois se um caso real pedir, em vez de campo especulativo.

**P3 — versionamento da base:** precisa registrar qual versão foi usada em cada análise?
**R3:** **Sem coluna de versão.** Regra: requisito publicado tem **texto imutável**; se a regra normativa muda, cria-se um **novo** requisito e o antigo vira **inativo** — nunca reescrever o texto de um requisito existente. Como cada parecer referencia o requisito específico avaliado, isso já é o snapshot histórico.

**P4 — área Técnica (P-04):** mesma tabela ou entidade separada?
**R4:** **Mesma tabela, mesmas colunas**, só o campo `area` diferenciando. Mas **não travar `area` como enum fixo de dois valores** — deixar campo flexível (string ou catálogo à parte), porque o vocabulário deve crescer.

**P5 — endpoint de leitura:** incluir `GET /requisitos` neste slice?
**R5:** **Não.** Só modelo + seed + serviço de leitura interno testável. Endpoint entra no RF-007, quando a tela definir o que consome.

**Decisão:** Tudo aplicado à TSD-003. `questoes-abertas.md`: A-03 fechada; P-04 e P-07 anotadas com a direção.

---

## 31/08/2026 — Ciclo RF-006, Agente Engenheiro (TSD-003)

**P:** No importador, `obrigatorio` / `ordem` / `ativo` são mutáveis num reimport; só `titulo`/`descricao`/`norma*` são imutáveis. Está certo, ou `obrigatorio` também deve ser imutável (por ser efeito normativo)?
Opções: OK, `obrigatorio` mutável / `obrigatorio` também imutável.
**R:** "O que você achar melhor."
**Decisão da IA:** `obrigatorio` **imutável** junto com o texto (bloquear ou não a conclusão é efeito normativo → exige novo `codigo`). Só `ordem` (display) e `ativo` (aposentadoria explícita) ficam mutáveis.

**P:** A TSD-003 está aprovada para o Dev implementar?
Opções: aprovada, pode implementar / tenho ajustes.
**R:** Aprovada, pode implementar.

---

## 31/08/2026 — Ambiente de testes (Docker)

**P (do usuário):** "Você consegue instalar o Docker aqui então?"
**R (da IA):** Não — sem WSL2, sem privilégio de administrador, e Docker Desktop altera configuração de virtualização do sistema (fora do que a IA deve fazer). Alternativa implementada: `embedded-postgres` — sobe um PostgreSQL self-contained para `npm run test:e2e`, sem Docker, sem admin, sem reboot.
**Decisão:** Infra de teste com PostgreSQL embutido; `E2E_EXTERNAL_DB=true` para usar banco externo na CI.

---

## 31/08/2026 — Estratégia de branches

**P (do usuário):** "Faz sentido fazer esse push pra `main`? Pensei em ir desenvolvendo na minha branch, o Vinicius na dele, e juntar só no final."
**R (recomendação da IA):** Não juntar só no final — os documentos vivos do método (`checkpoint.md`, `roadmap.md`, `audit.md`, `questoes-abertas.md`) são fonte de verdade única e branches longas divergentes os inviabilizam. Modelo recomendado: fundação/docs compartilhados integrados rápido no `main`; código de frente em **branch curta por ciclo**, merge no `main` quando o Documentador fecha. Frentes em pastas distintas → merges por ciclo quase não conflitam.
**R (do usuário):** "Faz isso."
**Decisão:** Branch `backend/tsd-001-fundacao-tecnica` mergeada no `main` (fast-forward `0b90f8a..13b111e`). Modelo de branch curta por ciclo adotado.

---

## 31/08/2026 — Ciclo RF-001 + RF-004 + RF-018 (criar análise com PDF), Agente PM

**P1 — "PDF válido" e limite de tamanho:**
Opções: mimetype + magic bytes, 25 MB, recusa com senha / só mimetype + magic bytes, 50 MB, aceita com senha / você decide.
**R1:** Você decide.
**Decisão da IA:** mimetype `application/pdf` + magic bytes `%PDF-`; limite **25 MB** (ajustável por `ANALISE_PDF_TAMANHO_MAX_MB`); **recusa PDF protegido por senha** (heurística: presença de `/Encrypt`).

**P2 — formato do NUP:**
Opções: string livre / validar máscara `NNNNN.NNNNNN/NNNN-NN`.
**R2:** Você decide.
**Decisão da IA:** **string livre** (obrigatória, `trim`, ≤ 60 chars). Máscara vira questão aberta **P-11**.

**P3 — modelagem do `status` da análise:**
Opções: todos os valores do SDD como string + allowlist / só `PENDENTE` por enquanto.
**R3:** Você decide.
**Decisão da IA:** **todos os valores** do SDD §8 (`PENDENTE`, `PROCESSANDO`, `PRONTA_PARA_REVISAO`, `ERRO_PROCESSAMENTO`, `CONCLUIDA`) como **string + allowlist** em `src/analises/status-analise.ts` (padrão do `area` de RF-006). Neste slice só `PENDENTE` é escrito.

**P4 — NUP repetido:**
Opções: permitir (reanálise é legítima) / bloquear ou avisar.
**R4:** Permitir — sem constraint de unicidade.

**Decisão:** Tudo aplicado à TSD-004.

---

## 31/08/2026 — Integração com o serviço de IA

**P (do usuário):** "No final disso [dos ciclos de backend], vou conseguir abrir o produto localmente, enviar um PDF de licitação e visualizar a análise da IA?"
**R (da IA):** O fluxo mecânico ponta a ponta sim (com os 7 ciclos de backend + a frente frontend). Mas a "análise da IA" seria a saída do `StubAdapter` (determinística, não lê o PDF) — para IA de verdade falta o `HttpAdapter` da `AnaliseIaPort` + o A-02, ou construir a chamada ao LLM aqui (fora do escopo como formulado). E os requisitos seriam o placeholder até P-07.
**R (do usuário):** "Vamos deixar essa parte de integração com o serviço de IA pro final."
**Decisão:** Integração com o serviço de IA real (`HttpAdapter` + A-02) adiada para o fim do MVP. Registrado no checkpoint §1/§5/§6.

---

## 31/08/2026 — Ciclo RF-002 (listagem de análises), Agente PM (P-06)

**P1 — escopo da listagem no MVP:**
Opções: contrato completo (busca + filtro status + ordenação + paginação) / mínimo (traz todas, data desc) / você decide.
**R1:** Você decide.
**Decisão da IA:** **contrato completo**. `GET /analises` com `q` (busca textual em `nup` + `objeto`, contém, sem distinção de maiúsculas), `status` (multi-seleção), `ordenarPor` (`iniciadaEm` | `nup`, default `iniciadaEm`), `ordem` (`asc` | `desc`, default `desc`), `pagina` + `tamanho`.

**P2 — campos por linha:**
Opções: `id, nup, objeto, status, iniciadaEm, concluidaEm` / + contagem de requisitos e de não conformes.
**R2:** Você decide.
**Decisão da IA:** `id, nup, objeto, status, iniciadaEm, concluidaEm`. Sem contagens (dependem de RF-007; entram depois).

**P3 — paginação:**
Opções: offset/limit (`pagina` + `tamanho`) / sem paginação.
**R3:** Você decide.
**Decisão da IA:** **offset/limit** — `pagina` (1-based, default 1), `tamanho` (default 20, máx 100). Resposta: `{ itens, total, pagina, tamanho }`.

**Decisão:** P-06 fechado; tudo aplicado à TSD-005.
