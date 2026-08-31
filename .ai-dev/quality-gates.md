# Quality gates

Quality gates são validações mínimas antes de considerar uma mudança pronta. Os comandos abaixo são os do stack definido no SDD (Node.js + TypeScript + NestJS + Prisma + PostgreSQL). Enquanto o projeto não tiver `package.json` (antes da TSD-001), os comandos ainda não existem — a TSD-001 é quem os cria e confirma.

## Tipos de teste, e o que cada um significa neste projeto

O Agente Engenheiro declara, por TSD (seção 7.1 de `.ai-dev/templates/technical-slice.md`), quais destes tipos se aplicam a cada feature. Preencha a coluna "comando/local" com o que é real neste projeto — enquanto estiver `<preencher>`, nenhuma TSD pode considerar esse tipo coberto.

| Tipo | O que prova | O que NÃO prova | Comando/local neste projeto |
|---|---|---|---|
| Unitário | Lógica isolada está correta, com dependências mockadas. | Que os módulos reais realmente conversam entre si, ou que uma dependência externa real se comporta como o mock assume. | Jest (`npm run test`) — serviços de domínio com portas mockadas. Local: `test/unit/` ou `*.spec.ts` ao lado do código. |
| Integração | Módulos/camadas reais funcionam juntos (ex.: aplicação real contra banco de teste). | Que um serviço externo que seu time não controla continua compatível. | Jest + Supertest contra a app NestJS real e um **PostgreSQL embutido** (`embedded-postgres`, sem Docker — o `globalSetup` sobe e o `globalTeardown` derruba). Usa o `StubAdapter` da `AnaliseIaPort`. Comando: `npm run test:e2e`. Local: `test/integration/` e `test/e2e/`. Para usar banco externo (CI): `E2E_EXTERNAL_DB=true` + `DATABASE_URL`. |
| Contrato | O formato de entrada/saída entre dois serviços que não sobem juntos no mesmo teste continua compatível. | Que o serviço remoto se comporta corretamente além do formato — só a forma, não o conteúdo. | Teste de contrato da `AnaliseIaPort` (e, quando A-02 fechar, do serviço de IA real). Comando: `npm run test:contract`. Local: `test/contract/`. |
| Smoke/validação manual contra dependência externa real | Que a integração funciona de fato contra o sistema real (custo, latência, comportamento real da API). | Não substitui os outros três — é caro/lento demais para rodar toda hora, então não cobre regressão contínua. | Roteiro manual documentado na TSD: uma análise real ponta a ponta contra a **capacidade de IA real**, quando disponível. Sem comando automatizado; registrar evidência no relatório de sessão. |

Um teste unitário com tudo mockado não é evidência de que a integração real funciona — trate como categorias diferentes, nunca como substitutas uma da outra.

**Dependências externas caras/instáveis neste projeto:**

- **Capacidade de análise assistida por IA** — potencialmente paga, lenta (minutos) e ainda sem contrato fechado (`questoes-abertas.md` A-02). Todo teste automatizado usa o `StubAdapter`. O comportamento real só é exercitado por smoke manual. Nenhuma TSD pode declarar a integração real coberta com base em teste com stub.
- *(Pós-MVP)* **Serviço de identidade do ecossistema** — fora desta versão (MVP roda com analista único fixo; ver `questoes-abertas.md` P-10). Quando entrar, tratar como dependência externa com teste de contrato + smoke manual.

## Para documentação/processo

- Links internos apontam para arquivos existentes.
- O texto deixa claro fonte de verdade, próximo passo e responsabilidade.
- Não contradiz PRD, SDD ou checkpoint.
- Quando altera o método, atualiza `START_HERE.md` ou o `.ai-dev/` correspondente.

## Para implementação (comandos do projeto)

Monorepo com duas frentes: `backend/` e `frontend/`. Cada uma tem seu próprio `package.json` e roda isolada. Sempre rodar os comandos de dentro do diretório da frente.

### Backend (`backend/`) — Node.js + TypeScript + NestJS

```text
npm run lint            # ESLint (@typescript-eslint) + Prettier check
npm run typecheck       # tsc --noEmit
npm run test            # Jest — testes unitários
npm run test:e2e        # Jest + Supertest contra app real + PostgreSQL de teste
npm run test:contract   # testes de contrato das portas (AnaliseIaPort etc.)
npm run build           # nest build (tsc)
npx prisma migrate deploy   # aplica migrations no banco alvo
npx prisma validate         # valida o schema.prisma
```

Proporcionalidade: mudança só de domínio isolado pode exigir apenas `lint` + `typecheck` + `test`; mudança que toca API, banco ou portas exige também `test:e2e` (e `test:contract` quando a porta muda). Esses comandos passam a existir com a **TSD-001**. `test:e2e` **não exige Docker** — usa PostgreSQL embutido.

### Frontend (`frontend/`) — Next.js + TypeScript

```text
npm run lint        # ESLint (next/core-web-vitals) + Prettier check
npm run typecheck   # tsc --noEmit
npm run test        # Vitest + React Testing Library
npm run build       # next build
```

Proporcionalidade: mudança só de componente/apresentação pode exigir `lint` + `typecheck` + `test`; slice de interface exige também screenshots antes/depois e comparação com a referência visual (`.ai-dev/visual-reference-workflow.md`). Esses comandos passam a existir com a **TSD-002**.

Antes da TSD-001 / TSD-002, os respectivos `package.json` não existem e nada roda — criá-los e confirmá-los é escopo dessas TSDs.

## Para testes e cobertura

- Backend — cobertura via Jest: `npm run test -- --coverage`; formato `lcov.info` em `backend/coverage/`, pronto para SonarQube se/quando integrado. Meta a definir na TSD-001 (sugestão inicial: linhas ≥ 80% nos módulos de domínio; não exigir cobertura de adapters triviais).
- Frontend — cobertura via Vitest (`--coverage`, provider v8), em `frontend/coverage/`. Meta a definir na TSD-002.

## Para mudanças de produto

- O comportamento está previsto no PRD ou a lacuna foi registrada em `docs/product/questoes-abertas.md`.
- Estados vazios, erro, carregamento e permissões foram considerados quando aplicável.
- A decisão final humana continua preservada quando envolver sugestão de IA.

## Para mudanças de arquitetura

- O SDD foi consultado.
- Fronteiras entre os componentes/serviços do sistema foram respeitadas.
- Decisões abertas não foram fechadas implicitamente sem registro.

## Para mudanças de interface visual (se o projeto tiver referência visual formal)

Siga `.ai-dev/visual-reference-workflow.md`. Resumo mínimo:

- A TSD tem a seção "Referências visuais" preenchida e sem campos pendentes antes de ser ativada.
- A referência visual foi inspecionada antes da implementação.
- Screenshots antes/depois foram capturados e comparados com a referência.
- Elementos de chrome do protótipo/ferramenta de design (molduras, nomes internos de camada) não foram implementados como produto.

## Exceções

Se uma validação não puder ser executada, registre o motivo em `.ai-dev/audit.md` ou no relatório de sessão.
