# Comparação visual — RF-001 + RF-004 (modal "Nova análise")

Evidência da validação visual do ciclo RF-001 + RF-004 frontend
(`.ai-dev/visual-reference-workflow.md`). Capturado em 01/09/2026, viewport 1440×900, via
Chrome (playwright-core), contra `npm run build && npm run start` do frontend e `npm run dev`
do protótipo.

| Arquivo                  | O que é                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `modal-vazio.png`        | Modal recém-aberto (Confirmar desabilitado)                                                           |
| `modal-com-arquivo.png`  | NUP + objeto preenchidos + PDF anexado (faixa verde, Confirmar habilitado)                            |
| `modal-erro-arquivo.png` | Arquivo não-PDF anexado — faixa vermelha + "O arquivo precisa estar em PDF." + Confirmar desabilitado |
| `prototipo-modal.png`    | Referência REF-05 (`NewAnalysisModal` do protótipo)                                                   |

O estado **erro de envio** (banner "O servidor recusou os dados…" / "Não foi possível criar a
análise…", com os campos preservados) é coberto por `test/unit/nova-analise-modal.test.tsx`
("no erro do servidor, mostra banner, não navega e preserva os dados digitados") — não há
ambiente com o backend no ar para capturá-lo ao vivo.

## Resultado da comparação (REF-05)

**Enquadramento:** ✓ igual — overlay escurecido, card ~752px, header "Nova análise" + × na
cor de marca com regra inferior, campo NUP (input), Objeto (textarea), Arquivo (dropzone
tracejada com ícone + "Clique aqui ou arraste e solte"), rodapé "Cancelar" (outline) +
"Confirmar" (verde, desabilitado até válido); estado com arquivo = faixa verde com check,
nome (ellipsis), tamanho formatado e lixeira.

**Divergências intencionais** (TSD-012 §10.2):

- Dica do upload diz **"PDF, até 25 MB"** (protótipo: "Arquivo em PDF e tamanho máximo de 50MB")
  — o limite real do backend é 25 MB (`ANALISE_PDF_TAMANHO_MAX_MB`).
- **Mensagens de erro** adicionadas (o protótipo não tem): erro por campo, faixa do arquivo
  fica **vermelha** quando o arquivo é inválido, e banner de erro de envio acima do rodapé
  (PRD §9).
- **Sem** a tela "Processando documento…" do protótipo — `POST /analises` responde `201` na
  hora (análise nasce `PENDENTE`); o modal fecha e navega para `/analise/[id]`.
- Campos/anexo mapeados para o contrato (`objeto`, `arquivo`), não `subject`/`file`.

Sem gaps de enquadramento remanescentes para o escopo da slice.
