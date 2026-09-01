# Comparação visual — RF-002 (listagem de análises)

Evidência da validação visual do ciclo RF-002 frontend (`.ai-dev/visual-reference-workflow.md`).
Capturado em 01/09/2026, viewport 1440×900, via Chrome (playwright-core), contra
`npm run build && npm run start` do frontend.

| Arquivo                      | O que é                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `lista.png`                  | `/` — 1ª página (24 análises, tamanho 20), ordem padrão `iniciadaEm` desc                             |
| `pagina-2.png`               | `/?pagina=2` — 2ª página; "primeira/anterior" viram link, "próxima/última" desabilitam                |
| `busca-filtro-ordenacao.png` | `/?q=material&status=CONCLUIDA&ordenarPor=nup&ordem=asc` — busca + chip de status + ordenação por NUP |
| `vazio-sem-resultado.png`    | `/?q=zzznaoexiste` — estado vazio "sem-resultado" (com "Limpar busca e filtros")                      |
| `prototipo-home.png`         | Referência REF-03 (`Prototipo Licia Analisadora`, rota `/`)                                           |

## Resultado da comparação (REF-03 — HomePage)

**Enquadramento:** ✓ igual — Topbar institucional, breadcrumb "Início" + título com regra de
marca, campo de busca à esquerda, tabela com cabeçalho cinza, paginador alinhado à direita
("Mostrando X–Y de N" + botões circulares + página ativa).

**Divergências intencionais em relação ao protótipo** (registradas na TSD-011 §10.2):

- **Coluna "Status"** adicionada à tabela (o protótipo não a tinha; RF-002 exige exibir o
  status de cada análise — PRD).
- **Coluna "Adicionado por" removida** — MVP tem analista único fixo (glossário; `context-map.md`).
- **Filtro por status como chips inline** em vez do botão "Filtros" + modal do protótipo — cobre
  o parâmetro `status` do contrato TSD-005; um painel de filtros consolidado pode vir depois.
- **Botão "Nova análise" desabilitado** — a criação (modal) é o ciclo de RF-001 (frontend).
- **Seletor de tamanho de página** do protótipo não incluído (tamanho fixo 20; `tamanho` continua
  aceito na URL).
- Sem trava `min-width: 1440px` (herdado da TSD-002).

Sem gaps de enquadramento remanescentes para o escopo desta slice.
