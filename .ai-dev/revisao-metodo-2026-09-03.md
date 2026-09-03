# Revisão do método de agentes — sessão de 02–03/09/2026

Nota de sessão. **Não é ciclo de feature.** Registro de uma conversa de retrospectiva
sobre o fluxo `.ai-dev` de agentes, depois de rodar 11 ciclos de frontend (RF-002 → RF-016).
Serve para retomar o assunto depois de reiniciar a máquina.

## 1. O que foi entregue nesta sessão (antes da revisão)

- **RF-012 / TSD-020 (frontend)** — botão "Concluir análise" + modal de confirmação —
  ciclo completo dos 6 papéis, Crítico ✅, `npm run ci` verde (240 testes), smoke conjunto
  contra o NestJS real. Mergeado na `main` (`aa9bb3f`).
- **RF-016 / TSD-021 (frontend)** — botão "Baixar relatório" na análise concluída —
  ciclo completo, Crítico ✅, `npm run ci` verde (250 testes), smoke conjunto real.
  Mergeado na `main` (`b6e7f0f`, `03f40f8`). **Fecha o MVP frontend.**
- **`main` está em `03f40f8`, igual a `origin/main` — tudo empurrado.** Nada pendente de commit.
- Branch `chore/frontend-brasao-ceara` foi criada (troca do placeholder do brasão pelo SVG
  `governodoestado.svg` que o usuário mandou) e **revertida** a pedido do usuário — o SVG
  **não** está no repo, o `CearaLogo.tsx` segue placeholder.
- Dois artifacts publicados no claude.ai:
  - **Bastidores do Front LicIA** — https://claude.ai/code/artifact/3b8b1bc1-075e-4be8-9b36-310daf0b9657
  - **Divergências App × Protótipo** — https://claude.ai/code/artifact/95022502-daaa-4894-bd24-bafa492cd8d8

## 2. Diagnóstico do método (o que está torto)

1. **Só há 1 portão humano por ciclo, e é no começo.** Depois de aprovar Story+TSD, roda
   Dev → Testes → Crítico → Documentador → merge sem toque humano.
2. **Os 2 portões pré-Dev (Story, TSD) colapsaram num só.** 11/11 RFs de frontend têm um
   commit único "PM+Engenheiro: RF-XXX — User Story + TSD (aguardando validação)". Você nunca
   pôde rejeitar o *recorte* da Story antes da TSD ser escrita. A guia de subagente do próprio
   método (`agent-roles.md`, "Observação sobre subagentes") empurra pra isso.
3. **Nenhum gate revisa o *plano* (a TSD).** A única checagem da TSD é a aprovação humana
   corrida. O Crítico é bom, mas só roda **depois** do código existir.
4. **Divergências do protótipo são *documentadas*, não *perguntadas*.** A §10 de cada TSD é
   escrita pelo Engenheiro como "vamos divergir, eis o porquê" — não há checkbox "o humano viu
   essa divergência e aprovou". Foi assim que a seta ← de voltar (virou breadcrumb) e o cromo
   do visor passaram sem consulta.
5. **O "resumo" que o usuário lê para aprovar não é papel do método.** É o orquestrador (a
   sessão principal) escrevendo na conversa, depois do ciclo — sem template, sem conteúdo
   obrigatório, sem revisor. E carrega os pontos cegos de quem construiu.
6. **O merge não é responsabilidade de papel nenhum.** `workflow.md §1.7` (Documentador) não
   menciona merge. A frase "merge na `main` quando o Documentador fecha" está no
   `docs/engineering/checkpoint.md §1` — convenção do projeto, não do método. Nesta sessão o
   merge foi o orquestrador rodando `git merge --ff-only` direto na `main`.
7. **O Documentador é o papel de maior output e o menos revisado.** Ele escreve
   checkpoint/roadmap/audit/README (as docs "fonte de verdade"). O Crítico confere que a doc
   *foi atualizada*, não que está *certa*. Ex.: TSD-019 §10 diz "o 'voltar' já está no
   `AnaliseHeader`" como se fosse equivalente à seta do protótipo.
8. **Método pesado para projeto solo.** 6 papéis × 11 RFs. Sem faixa leve além do escape
   "Ajustes pequenos" (tudo-ou-nada).

**O que funciona bem:** o gate anti-alucinação (Agente de Testes separado, output real colado);
o Crítico como subagente de contexto frio (pegou o `focus()` com ref nula, o `aria-describedby`
faltando, um teste parametrizado); rastreabilidade completa (roadmap → TSD → commits →
screenshots → audit); a disciplina do *seam* de dados (0 componente falando HTTP direto);
teste de contrato + ler o backend real por endpoint.

## 3. Melhorias acordadas

### 3.1 Separar os dois portões pré-Dev

PM apresenta a **Story** e **para**. Só no "ok" o Engenheiro começa a **TSD**. Dois commits,
duas aprovações — como o `workflow.md` já desenha, mas na prática nunca aconteceu.

### 3.2 §9 (decisões a validar) apresentada como pergunta

Não prosa na TSD. "São N decisões. Para cada: opção A (recomendada) / opção B. Sua escolha."
**Divergência do protótipo entra na §9 como pergunta**, não só na §10 como registro.

### 3.3 Portão 3 — Aceite humano (NOVO), entre o Crítico e o Documentador

```
... → Crítico APROVADO → ACEITE HUMANO → Documentador fecha → humano mergeia
```

- O **Engenheiro** escreve, na TSD, uma nova seção **§8.1 "Roteiro de aceite"**: os critérios
  §8 reescritos como "faça X → veja Y", + um item obrigatório "comparar lado a lado com o
  protótipo" para slice de tela, + um item "liste as divergências que você está aceitando".
- Você **aprova esse roteiro no Portão 2** (junto com a TSD) e pode **estendê-lo**.
- No **Portão 3**, você abre a branch **rodando contra o backend real** e desce o roteiro.
  Tudo ✓ → segue pro Documentador. Falhou item N → volta pro Dev (ou vira mini-RF de acabamento).
- Funciona contra o problema dos "pontos cegos" porque o roteiro é escrito **antes** do código,
  ancorado em PRD/Story/protótipo (não na memória de quem construiu). Você não revisa o meu
  resumo — você **opera o sistema** contra uma lista pré-acordada.
- **Slice sem tela / trivial:** o roteiro diz "nada a conferir na mão, ver a evidência do
  smoke + relatório do Crítico" — aí o portão é você lendo e dando o ok, não vira cerimônia.

### 3.4 Merge é humano

O Documentador termina com "**push da branch + abre o PR; não faz merge**". Novo passo
**1.9 Merge — humano**. Nenhum agente mergeia. Um agente pode *preparar* o pacote (rebase, CI
final) — mas quem aperta o botão é pessoa.

### 3.5 `implementada` só depois do aceite

O Documentador só marca a feature como `implementada` no roadmap **após o aceite humano
registrado**. Hoje `implementada` significa "dois agentes concordaram"; passa a significar
"o humano abriu, testou pelo roteiro que ele mesmo aprovou, e aceitou".

## 4. Onde mexer (mapa de arquivos)

| Arquivo | Mudança |
|---|---|
| `.ai-dev/workflow.md` | Diagrama §1: nós "Aceite humano" (entre Crítico-aprovado e Documentador) e "Merge — humano". Nova **§1.7 Aceite** (Documentador vira §1.8). Nova **§1.9 Merge — humano**. A frase "Cada 'APROVAÇÃO' é um ponto de parada" passa a nomear os 4 portões (Story, TSD, aceite, merge). |
| `.ai-dev/agent-roles.md` | Linha do ciclo no topo: `... → Crítico → **aceite humano** → Documentador`. Seção "## Aceite (humano — não é agente)". "## Agente Engenheiro" ganha o roteiro de aceite como entrega. "## Agente Documentador" ganha "abre o PR, não mergeia" + "só marca `implementada` após o aceite". |
| `.ai-dev/templates/technical-slice.md` | Nova seção **§8.1 Roteiro de aceite** depois dos Critérios de aceite (§8): tabela `# / faça / resultado esperado`, + item "comparar lado a lado com o protótipo" para slice de tela. |
| `.ai-dev/quality-gates.md` | Nova seção "Para aceite humano": a branch roda contra o backend real, o humano desce o §8.1, registra ✓/✗ + "aceito por X em data" ou "devolvido: item N". |
| `.ai-dev/visual-reference-workflow.md` | Em "Validações visuais mínimas": tornar explícito "o aceite inclui comparação lado a lado com o protótipo, feita pelo humano". |
| `.ai-dev/agents/engenheiro.md` **+ os 3 adaptadores** (`.claude/agents/engenheiro.md`, `.gemini/agents/engenheiro.md`, `.codex/agents/engenheiro.toml`) | + escreve o roteiro de aceite (§8.1). |
| `.ai-dev/agents/documentador.md` **+ os 3 adaptadores** | + "abre o PR, não mergeia" + "só `implementada` após o aceite". |
| `.ai-dev/templates/roadmap.md` | Nota no cabeçalho de status: `implementada` pressupõe aceite humano. |
| `docs/engineering/checkpoint.md §1` | "merge na `main` quando o Documentador fecha" → "o Documentador abre o PR ao fechar; **o merge é humano**". |
| `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` (idênticos) | O parágrafo "Papéis de agente (v2)": "cada um com um ponto de aprovação humana" → "**pontos** de aprovação humana (Story, TSD, aceite, merge)". "Não pule o ponto" → "os pontos". |

**Não** criar `.ai-dev/agents/aceite.md` — não há agente. Aceite e merge são passos humanos;
só precisam estar **nomeados** no `workflow.md` e no `agent-roles.md` para não serem puláveis.

Regra de sincronia (`.ai-dev/agents/README.md`): mexer no comportamento de um papel = editar
os **4 arquivos** (o de `.ai-dev/agents/` + os 3 adaptadores). Aqui vale para Engenheiro e
Documentador — 8 arquivos de adaptador no total, além dos de método.

## 5. Divergências app × protótipo (levantadas nesta sessão)

Ver o artifact **"Divergências App × Protótipo"** (link no §1). São 14 divergências,
agrupadas por tela (análise / listagem / topbar), cada uma com etiqueta de quem decidiu:

- **RF** (exigência): visor mostra o PDF real (RF-014); "Responsável/Iniciada em" no cabeçalho
  (RF-013); coluna "Status" na listagem (RF-002/contrato); 3 status de requisito (PRD §8);
  aba Técnica com badge (P-04); botão "Baixar relatório" (RF-016).
- **DEV** (minha escolha, registrada na §9/§10, não perguntada): seta ← → breadcrumb;
  toolbar do visor mais crua; alerta sintético do visor não replicado; filtro = chips vs
  botão+painel; coluna "Adicionado por" **removida** (vs mantida com nome único);
  "Adicionado em" → "Iniciada em"; sem toasts de sucesso.
- **VOCÊ** (instrução explícita): modal de conclusão em alta fidelidade ao `CompletionModal`
  ("Siga o protótipo de alta fidelidade", 02/09).
- **FUNDAÇÃO** (TSD-002, §10 revisada): brasão via URL do Figma → placeholder;
  sem trava `min-width: 1440px`.

## 6. Estado dos processos (morrem no restart — sem problema)

- **Backend NestJS `:3000`** — `cd backend && npm run start:dev`. Precisa do PostgreSQL 17 no
  `:5432` (serviço do Windows `postgresql-x64-17`, sobe sozinho no boot). Banco `licia` já
  criado, migrations + seed já rodados.
- **Frontend dev `:3201`** — `cd frontend && npm run dev -- -p 3201`. O `frontend/.env.local`
  (gitignored, persiste no disco) tem `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`.
  **Rodar na `:3201`**, não na `:3001` — o backend que estava rodando ficou com o CORS preso
  na origem `:3201` (de um smoke antigo). Alternativa: reiniciar o backend **sem** `CORS_ORIGINS`
  (o `backend/.env` já tem `CORS_ORIGINS=` vazio, que reflete qualquer origem).
- Havia também `frontend-licia-1` (`:3001`) e `frontend-licia` (vite `:5173`) rodando — são
  **outros projetos** do usuário, não este.

## 7. Próximo passo

1. Aplicar as mudanças do §4 no método (não é ciclo de feature — é edição de processo).
2. Depois, se quiser, um ciclo de **acabamento frontend** rodando o método já revisado
   (com o Portão 3), cobrindo os follow-ups do `checkpoint.md §5`: A11y dos botões
   desabilitados, re-sync de `?requisitos=` no back/forward, contraste AA do chip "Não se
   aplica", brasão oficial, fallback "abrir o PDF", smoke de `/` + "Nova análise" contra o
   backend real, e a seta ← de voltar.
