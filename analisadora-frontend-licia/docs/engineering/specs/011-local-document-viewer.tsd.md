---
title: TSD - Local Document Viewer and Page References
type: tsd
status: completed
created: 17/08/2026 - 03:10 // Rolf Matela
updated: 17/08/2026 - 04:30 // Rolf Matela
related (internal files):
- docs/product/licia-analisadora-prd.md
- docs/architecture/licia-analisadora-sdd.md
- docs/engineering/licia-analisadora-engineering-checkpoint.md
- docs/engineering/specs/006-real-read-only-opinions.tsd.md
- docs/engineering/specs/007-real-analysis-workspace-reconciliation.tsd.md
---

# TSD — Local Document Viewer and Page References

## 1. Resumo

Esta slice entrega uma **ponte temporária** para a visualização documental: o PDF exibido vem do próprio navegador do analista, capturado no momento do upload e reaproveitado nas visitas seguintes. Com o documento em tela, as referências de página das evidências passam a abrir o visualizador na posição indicada.

**Esta slice não resolve a pendência "integrar visualização PDF real"**, que continua aberta. Ela cobre a lacuna enquanto a Analisadora API não expõe leitura do arquivo, e foi desenhada para ser removida em bloco quando esse contrato existir.

## 2. O bloqueio que motiva a ponte

A Analisadora API não possui endpoint público de leitura do PDF. A superfície pública é criação, listagem, detalhe, exclusão, opiniões, revisão, conclusão e reprocessamento. A única URL assinada do MinIO é emitida em `POST /internal/jobs/claim`, e o Traefik responde 403 em `/analisadora-api-licia/internal/*`.

Duas decisões de produto do PRD estavam paradas por isso: a visualização documental e as referências de página clicáveis.

**Abordagem rejeitada.** Fazer o BFF falar direto com o MinIO resolveria tecnicamente, mas o `AGENTS.md` proíbe consumir qualquer coisa fora do gateway público, e obrigaria o frontend a reimplementar enforcement de ownership — que as mesmas regras mandam tratar como responsabilidade exclusiva do backend. A regra foi respeitada.

## 3. Escopo

### Incluído

- Armazenamento local dos documentos em IndexedDB, com chave por usuário e processo.
- Captura automática do PDF no upload, em regime best-effort.
- Anexo manual do documento quando não há cópia local.
- Visualizador via `<iframe>` sobre blob URL, usando o visualizador nativo do navegador.
- Remoção manual da cópia local.
- Referência de página como controle, abrindo o documento na página inicial da evidência.
- Purga do armazenamento no logout e na tela de login.
- Descarte de cópias pertencentes a outros analistas do mesmo navegador.

### Não incluído

- Qualquer chamada nova ao gateway; nenhuma rota BFF foi criada ou alterada.
- Leitura do PDF a partir do servidor, do MinIO ou da superfície interna.
- Dependência de renderização de PDF; a disciplina de zero dependências de runtime foi mantida.
- Sincronização entre dispositivos ou entre analistas.
- Verificação de que a cópia local corresponde ao arquivo processado.
- Destaque visual da evidência dentro da página.

## 4. Armazenamento

IndexedDB `licia-analisadora`, object store `documents`, chave `${userId}:${processId}`. O registro guarda o blob, o nome, o tamanho, a data e a origem (`upload` ou `manual`).

A chave inclui o usuário porque dois analistas podem dividir o mesmo navegador: um nunca pode ver o documento do outro.

Toda operação degrada em silêncio quando não há IndexedDB — navegação privativa, storage bloqueado, renderização no servidor — ou quando a cota estoura. A ausência de armazenamento é um estado normal do painel, não uma exceção: o resultado é simplesmente o estado "documento ausente".

A captura no upload é **best-effort por decisão**: a análise já foi aceita pela API quando a gravação local ocorre, então uma falha de armazenamento não pode alterar o resultado apresentado ao analista.

## 5. Fronteira de sessão

Cópias de documentos licitatórios passam a existir em repouso no navegador do analista. Três mecanismos limitam a exposição:

| Momento | Ação |
|---|---|
| Logout pelo menu | `LogoutButton` apaga todo o store antes de submeter a Server Action |
| Abertura da tela de login | `DocumentPurge` apaga todo o store ao montar |
| Entrada no layout autenticado | `ForeignDocumentPurge` descarta o que é de outros usuários |

A purga na tela de login existe porque o logout é uma Server Action e não alcança o IndexedDB, e porque a expiração de sessão redireciona para `/login` a partir dos loaders, sem passar pelo botão de sair.

O `userId` desce ao cliente **exclusivamente como chave de armazenamento**. Ele não participa de nenhuma decisão de autorização: ownership continua sendo resolvido pelo backend, como nas slices anteriores.

## 6. Visualizador

`PdfPanel` passa a ter três estados:

| Estado | Conteúdo |
|---|---|
| Carregando | Consulta ao store local |
| Ausente | O texto honesto sobre não haver contrato de leitura, mais a ação de anexar |
| Presente | `<iframe>` com o documento, nome do arquivo, selo "Cópia local" e remoção |

O anexo aceita apenas `application/pdf` e reaproveita `MAX_PDF_SIZE_BYTES` de `types.ts`. A interface nunca afirma que a cópia corresponde ao processo: o texto declara que ela não é verificada e que a numeração de páginas segue o arquivo anexado.

A blob URL é revogada na desmontagem e a cada troca de documento, e não escapa do provider e do painel.

## 7. Referências de página

`toReviewItem` passa a expor `evidenceStartPage` ao lado do rótulo `pages` que já existia. `ChecklistItem` transforma o rótulo em botão **apenas quando há documento carregado**; sem cópia local, permanece o texto informativo de sempre.

Isso mantém a regra de não apresentar controle funcional sem contrato por trás: o link só existe quando existe para onde ir. O clique não propaga para o acordeão.

O provider guarda a página pedida e o `<iframe>` é remontado por `key`, porque trocar apenas o fragmento de um `src` já carregado não renavega no visualizador nativo. O custo é um recarregamento visível a cada salto.

## 8. Arquivos principais

| Arquivo/Módulo | Responsabilidade |
|---|---|
| `src/features/analyses/documents/localDocuments.ts` | IndexedDB, chaves e purgas |
| `src/features/analyses/documents/DocumentProvider.tsx` | Contexto, blob URL e página pedida |
| `src/features/analyses/documents/DocumentPurge.tsx` | Purga na tela de login |
| `src/features/analyses/documents/ForeignDocumentPurge.tsx` | Descarte de outros usuários |
| `src/components/Topbar/LogoutButton.tsx` | Purga antes do logout |
| `src/features/analyses/workspace/PdfPanel.tsx` | Três estados e visualizador |
| `src/features/analyses/workspace/AnalysisWorkspace.tsx` | Monta o provider sobre os dois painéis |
| `src/features/analyses/workspace/ChecklistItem.tsx` | Referência de página como controle |
| `src/features/analyses/list/NewAnalysisAction.tsx` | Captura no upload |

## 9. Critérios de aceite

- [x] Nenhuma rota BFF criada ou alterada, e nenhuma requisição nova ao gateway.
- [x] O painel não emite rede alguma para obter o documento.
- [x] O documento é capturado no upload e reaproveitado na visita seguinte.
- [x] Sem cópia local, o painel mantém o texto honesto e oferece anexo manual.
- [x] A interface nunca afirma que a cópia local corresponde ao processo.
- [x] Falha de armazenamento não altera o resultado da criação da análise.
- [x] A blob URL é revogada na troca de documento e na desmontagem.
- [x] A referência de página só vira controle quando há documento.
- [x] O `userId` é usado apenas como chave, nunca em decisão de autorização.
- [x] O store é purgado no logout e na tela de login.

## 10. Validação executada

- [x] `npm run lint`, `npm run typecheck` e `npm run build`.
- [x] Inspeção estática: nenhum `fetch` no módulo de documentos nem no `PdfPanel`.
- [x] Inspeção estática: `git diff` sem qualquer alteração em `src/app/api/`.
- [x] Inspeção estática: `userId` aparece apenas na composição da chave e nas purgas.
- [x] Inspeção estática: `objectUrl` não escapa do provider e do painel.
- [x] `/login`, `/` e `/analise/[id]` renderizam com sessão real, sem erro no servidor.
- [x] O bundle cliente publicado contém IndexedDB, `createObjectURL`, `revokeObjectURL` e a interpolação `#page=`.

### Execução em navegador

Executada em 17/08/2026, com a stack local completa e o worker `ms-analisadora` em operação, cobrindo o comportamento interativo que a inspeção estática não alcança:

- [x] Captura no upload e reabertura da análise com o documento presente.
- [x] Análise sem cópia local no estado ausente, com anexo manual funcionando.
- [x] Referência de página abrindo o visualizador na página da evidência.
- [x] Purga do armazenamento no logout e isolamento entre dois analistas no mesmo navegador.
- [x] Ciclo de processamento completo, de `pending` a `processed`, com o painel de revisão assumindo o painel direito.

A matriz detalhada está na seção 12.

## 11. Salto de página: risco verificado

`#page=N` é parâmetro do visualizador nativo, e **seu suporte varia entre navegadores**. Este era o ponto mais incerto da slice, porque a remontagem por `key` contorna o fato de que trocar o fragmento não renavega, mas não garante que o navegador honre o parâmetro.

A verificação em navegador confirmou que **o parâmetro é honrado no navegador alvo**: a referência de página abre o documento na página da evidência.

A dependência do comportamento nativo permanece registrada como limitação: um navegador diferente pode não honrá-lo. Nesse caso, a degradação sem quebrar a disciplina de dependências é manter a referência como texto e exibir o número da página com destaque, deixando a navegação para o próprio visualizador. Adotar `pdfjs-dist` resolveria de forma definitiva, ao custo da primeira dependência de runtime do projeto.

## 12. Matriz de verificação em navegador

Executada em 17/08/2026.

| # | Verificação | Resultado |
|---|---|---|
| 1 | Criar uma análise e reabri-la: o documento aparece sozinho | Passou |
| 2 | Análise sem cópia local: estado ausente e anexo manual funcionando | Passou |
| 3 | Referência de página abre o visualizador na página indicada | Passou |
| 4 | Logout esvazia o armazenamento local | Passou |
| 5 | Segundo analista no mesmo navegador não vê documento do primeiro | Passou |

Permanece sem execução registrada o anexo de arquivo acima de 50 MiB e de arquivo não-PDF, cujas recusas foram verificadas apenas por inspeção do código que reaproveita `MAX_PDF_SIZE_BYTES` e restringe o `accept` a `application/pdf`.

## 13. Limitações

- O documento é local: outro dispositivo ou outro analista não o vê, e o painel volta ao estado ausente.
- Um anexo manual pode ser um arquivo diferente do processado. As referências de página herdam essa incerteza, e por isso o painel declara que a cópia não é verificada.
- Documentos licitatórios passam a ficar em repouso no navegador, mitigado pela purga, pela chave por usuário e pela remoção manual.
- Navegação privativa e cota esgotada degradam para o estado ausente, sem aviso no caso da captura automática.
- O salto de página recarrega o visualizador, perdendo zoom e posição de rolagem.
- A evidência abre na página inicial do intervalo; não há destaque do trecho.

## 14. Rollback e caminho de saída

O rollback remove a pasta `documents/`, o `LogoutButton`, os controles do `PdfPanel` e a referência clicável, restaurando o placeholder da TSD 007.

Quando existir contrato público owner-scoped de leitura do PDF, o caminho é o mesmo: apagar a pasta `documents/` e as purgas, e apontar o `PdfPanel` para o endpoint real. A referência de página clicável sobrevive à troca, porque depende apenas de haver documento em tela.
