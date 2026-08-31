# Questões em aberto — LicIA Analisadora

Índice consolidado de decisões de produto e arquitetura ainda pendentes, hoje possivelmente espalhadas entre PRD, SDD, decision records e checkpoint. Confira aqui antes de assumir que um ponto em aberto já foi resolvido — e mantenha isto sincronizado quando uma questão for fechada.

O histórico das perguntas já feitas ao responsável e das respostas que as fecharam está em `docs/perguntas-e-respostas.md`.

## Produto

| # | Questão | Onde apareceu | Status |
|---|---|---|---|
| P-01 | Qual é o valor formal da análise concluída (apoio interno, recomendação operacional, outro enquadramento)? | PRD §12 | aberta |
| P-02 | O modelo mínimo de auditoria do MVP (responsável, início, conclusão, status final por requisito) é suficiente, ou será necessário histórico detalhado de alterações humanas? | PRD §12, RF-013 | aberta |
| P-03 | Em quais ações de revisão o comentário obrigatório deve ser exigido: confirmação da sugestão da IA, alteração de status, verificação de item técnico, ou todas? | PRD §12, RF-017 | aberta |
| P-04 | Qual é a semântica definitiva de Checklist e Técnica (tem status? é observação? é pass/fail)? Até nova validação, permanecem áreas separadas e obrigatórias. | PRD §8, §12 | aberta — modelagem: mesma tabela, `area` como campo flexível (não enum fixo), decidido no ciclo de RF-006 |
| P-05 | Em quais situações a ausência de referência de página é válida, e o analista poderá corrigir as páginas sugeridas pela IA? | PRD §12, RF-014 | aberta |
| P-06 | Quais campos, filtros, colunas, direções de ordenação e regras de busca serão suportados na listagem do MVP? | PRD §8, §12 | **fechada** (ciclo RF-002 / TSD-005) — ver Resolvidas R-05 |
| P-07 | Quais requisitos entram no primeiro subconjunto da base fixa no MVP (lista real, da área jurídica)? | PRD §11, §12 | aberta — MVP entra com seed-placeholder (8–12 itens) via importador de arquivo externo; trocar o arquivo quando a lista real chegar (ciclo RF-006) |
| P-08 | Quais métricas serão usadas para medir impacto e produtividade da solução? | PRD §12 | aberta |
| P-09 | Por quanto tempo o PDF de entrada persistido deve ficar disponível (política de retenção/expiração)? | PRD §12, RF-018 | aberta — direção parcial: ver A-05 |
| P-10 | Quando e como entra identidade real (login/token do serviço de identidade), múltiplos analistas e a separação de acesso por analista (RF-003)? O MVP roda com analista único fixo. | Sessão de bootstrap; PRD RF-003 | aberta |
| P-11 | O NUP precisa de validação de formato (máscara `NNNNN.NNNNNN/NNNN-NN` do Processo Administrativo)? O MVP (TSD-004) aceita string livre não-vazia até 60 chars. | Ciclo RF-001 (TSD-004) | aberta |

## Arquitetura

| # | Questão | Onde apareceu | Status |
|---|---|---|---|
| A-01 | Formato exato do token/header de identidade do serviço de identidade do ecossistema (nome do header, claims, validação). Só relevante quando P-10 for endereçada — fora do MVP. | SDD (fundação), sessão de bootstrap | aberta — pós-MVP |
| A-02 | Contrato exato da capacidade de análise assistida por IA: campos de entrada/saída, autenticação, timeout, política de retry, e se o projeto **aciona** um serviço externo ou **consome** um resultado já produzido. | PRD §11, SDD (fundação) | aberta |
| A-03 | Estrutura definitiva da base fixa de requisitos. | PRD §11, §12 | direção fechada no ciclo de RF-006: `codigo` único, `area` (campo flexível), `titulo`, `descricao`, `obrigatorio`, `ordem`, `ativo`, referência normativa **estruturada** (lei/artigo/inciso/parágrafo/alínea). Sem versão explícita — imutabilidade + novo requisito + `ativo=false`. Sem campos especulativos (subgrupo/severidade/orientação). Resta o conteúdo real (P-07). |
| A-04 | O relatório PDF final gerado será persistido, ou sempre gerado sob demanda a partir da análise concluída? MVP propõe geração sob demanda. | PRD §12 | aberta — direção parcial no SDD |
| A-05 | Estratégia definitiva de armazenamento do PDF de entrada: migração de filesystem para object storage (S3/Blob) e criptografia at-rest. MVP usa o mais simples. | PRD §12, RF-018 | aberta — direção parcial no SDD |
| A-06 | Fila/worker dedicado (ex.: Redis + BullMQ) para o processamento assíncrono, caso o volume cresça. MVP usa processamento em processo com status persistido. | Limitações técnicas (bootstrap) | aberta — direção parcial no SDD |

## Como usar

- Ao abrir uma questão nova durante qualquer sessão, registre aqui, mesmo que ainda não tenha dono ou prazo.
- Ao fechar uma questão, mova para a seção "Resolvidas" com a data e o link do decision record ou da atualização de PRD/SDD que a resolveu, em vez de simplesmente apagar a linha.

## Resolvidas

| # | Questão | Resolução | Data | Referência |
|---|---|---|---|---|
| R-01 | O relatório PDF final entra no MVP ou fica para fase posterior? | Entra no MVP. RF-016 promovido de "[Parcialmente validado] / Should" para requisito confirmado. | 31/08/2026 | Sessão de bootstrap; PRD RF-016 |
| R-02 | Os PDFs de entrada serão persistidos? | Sim, serão persistidos e associados à análise. Estratégia do MVP: a mais simples (armazenamento em filesystem/volume, referenciado no banco), sem política de retenção definida ainda (ver P-09) nem object storage (ver A-05). | 31/08/2026 | Sessão de bootstrap; PRD RF-018; SDD §9 |
| R-03 | Estratégia de autenticação do MVP. | O MVP **não tem autenticação nem identidade**: roda com um analista único e fixo, definido por configuração. Toda análise é registrada sob esse analista (RF-013). Identidade real, múltiplos analistas e separação de acesso (RF-003) ficam para uma fase posterior — ver P-10. | 31/08/2026 | Sessão de bootstrap; SDD §2, §9 |
| R-04 | Stack e infraestrutura do backend. | Node.js + TypeScript (consistência com o ecossistema). Framework: **NestJS** (ver `docs/engineering/decisions/001-framework-backend-nestjs.md`). Banco PostgreSQL + Prisma; deploy em contêiner único + Postgres gerenciado. SDD §2/§9. | 31/08/2026 | Sessão de bootstrap; SDD; DR-001 |
| R-05 | Contrato da listagem do MVP (P-06). | `GET /analises`: busca `q` (`nup`+`objeto`, contém, case-insensitive), filtro `status` (multi), `ordenarPor` (`iniciadaEm` default \| `nup`), `ordem` (`desc` default), paginação `pagina`/`tamanho` (20, máx 100). Resposta `{ itens, total, pagina, tamanho }`; itens com `id`, `nup`, `objeto`, `status`, `iniciadaEm`, `concluidaEm`. Contagem de requisitos por linha adiada (pós-RF-007). | 31/08/2026 | Ciclo RF-002; TSD-005; SDD §7 |
