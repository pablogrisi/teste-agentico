# Quality gates

Quality gates são validações mínimas antes de considerar uma mudança pronta. Este arquivo precisa ser preenchido com os comandos reais do stack de {{NOME_DO_PROJETO}} antes do início da implementação — a estrutura abaixo é um ponto de partida, não uma lista fixa.

## Tipos de teste, e o que cada um significa neste projeto

O Agente Engenheiro declara, por TSD (seção 7.1 de `.ai-dev/templates/technical-slice.md`), quais destes tipos se aplicam a cada feature. Preencha a coluna "comando/local" com o que é real neste projeto — enquanto estiver `<preencher>`, nenhuma TSD pode considerar esse tipo coberto.

| Tipo | O que prova | O que NÃO prova | Comando/local neste projeto |
|---|---|---|---|
| Unitário | Lógica isolada está correta, com dependências mockadas. | Que os módulos reais realmente conversam entre si, ou que uma dependência externa real se comporta como o mock assume. | `<preencher>` |
| Integração | Módulos/camadas reais funcionam juntos (ex.: aplicação real contra banco de teste). | Que um serviço externo que seu time não controla continua compatível. | `<preencher>` |
| Contrato | O formato de entrada/saída entre dois serviços que não sobem juntos no mesmo teste continua compatível. | Que o serviço remoto se comporta corretamente além do formato — só a forma, não o conteúdo. | `<preencher>` |
| Smoke/validação manual contra dependência externa real | Que a integração funciona de fato contra o sistema real (custo, latência, comportamento real da API). | Não substitui os outros três — é caro/lento demais para rodar toda hora, então não cobre regressão contínua. | `<preencher>` |

Um teste unitário com tudo mockado não é evidência de que a integração real funciona — trate como categorias diferentes, nunca como substitutas uma da outra. Se um projeto tiver uma dependência externa cara ou instável (ex.: uma API de IA paga), diga isso explicitamente aqui, porque é o tipo de lacuna que fica fácil de esquecer até virar pendência tardia.

## Para documentação/processo

- Links internos apontam para arquivos existentes.
- O texto deixa claro fonte de verdade, próximo passo e responsabilidade.
- Não contradiz PRD, SDD ou checkpoint.
- Quando altera o método, atualiza `START_HERE.md` ou o `.ai-dev/` correspondente.

## Para implementação (preencher por stack)

Substitua os comandos abaixo pelos reais do projeto. Exemplos de referência:

```text
# Node/TypeScript (Next.js, NestJS)
npm run lint
npm run typecheck
npm run test
npm run build

# Python (FastAPI, Flask)
ruff check .
mypy .
pytest

# outro stack
<preencher>
```

## Para testes e cobertura

Defina aqui o comando de cobertura e o formato esperado (ex.: `lcov.info` para integração com SonarQube), se aplicável.

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
