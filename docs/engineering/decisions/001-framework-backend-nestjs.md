# Decisão técnica — Framework do backend: NestJS

---
status: accepted
date: 31/08/2026
owners:
- Pablo Grisi
---

## Contexto

O SDD define o backend da LicIA Analisadora em Node.js + TypeScript, mas deixou em aberto o framework. O serviço é pequeno e de baixo volume (ferramenta interna para um time de analistas), porém precisa sustentar o ciclo de seis papéis deste método: cada feature entra por uma TSD que declara tipos de teste, e o Agente de Testes roda os quality gates. Isso pesa a favor de uma base com boa história de testes e fronteiras de módulo explícitas.

## Opções consideradas

1. **NestJS** — framework opinativo com injeção de dependência, módulos, e utilitários de teste de primeira classe (`@nestjs/testing`, integração natural com Jest e Supertest).
2. **Fastify puro** — servidor HTTP enxuto e rápido, sem estrutura de módulos/DI imposta. Menos boilerplate para subir; organização e testabilidade ficam por conta do time.
3. **Next.js API routes** (reaproveitar o stack do frontend) — descartada cedo: o processamento assíncrono com worker não encaixa bem no modelo de rotas serverless, e misturaria as responsabilidades do frontend e do serviço de análise.

## Decisão

Usar **NestJS**.

## Motivos

- Injeção de dependência torna as portas do SDD (`AnaliseIaPort`, `ArmazenamentoPdfPort`, provider de analista atual) triviais de trocar entre adapter stub e real — inclusive nos testes.
- `@nestjs/testing` + Supertest cobrem os testes de integração da API real contra PostgreSQL de teste com pouco esforço de setup.
- Fronteiras de módulo explícitas (Análises, Requisitos/Avaliações, Processamento, Relatório) espelham os componentes do SDD e ajudam o Crítico a checar se a entrega respeitou o escopo da TSD.
- O time já é TypeScript; a curva do NestJS é conhecida no ecossistema.

## Consequências

### Positivas

- Estrutura de teste e de módulos pronta, alinhada ao método.
- Troca de adapters (stub ↔ real) sem refatoração quando os contratos externos (IA, identidade) forem definidos.

### Negativas / riscos

- Mais boilerplate e mais camadas do que um Fastify puro exigiria para um serviço deste tamanho.
- Overhead conceitual (decorators, módulos, providers) para quem só quer um CRUD — mitigado por manter a estrutura mínima e não criar abstração antes da necessidade.
- Se o serviço permanecer minúsculo indefinidamente, parte da estrutura do NestJS ficará subutilizada; aceitável frente ao ganho em testabilidade.

## Impactos documentais

- PRD: nenhum.
- SDD: §2 (Stack) e §9 (Decisões técnicas) já referenciam esta escolha; manter o link para este registro.
- Checkpoint: registrar como decisão de fundação na criação do checkpoint inicial.
- TSD: a TSD-001 cria o projeto NestJS, o `package.json` e os scripts de quality gate.
