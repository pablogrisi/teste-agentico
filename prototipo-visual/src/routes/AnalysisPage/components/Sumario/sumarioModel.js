/**
 * Regras do sumário, separadas da tela para poderem ser conferidas sozinhas.
 *
 * Invariante do caderno: toda página entre o primeiro e o último documento tem
 * dono — um documento ou um trecho fora do escopo. Nenhuma operação daqui pode
 * abrir buraco.
 */

export const isPlaced = (d) => d.startPage !== null && d.endPage !== null;
export const isLocated = (d) => d.state !== "foraEscopo" && d.startPage !== null;

/** Converte o texto do campo em página válida dentro do documento. */
export function parsePage(value, totalPages) {
  const n = Number(String(value).replace(/\D/g, ""));
  return n >= 1 && n <= totalPages ? n : null;
}

/** Trecho fora do escopo cobrindo `startPage`–`endPage`. */
export function outOfScope(startPage, endPage) {
  return {
    id: `fora-${startPage}`,
    name: "Trecho fora do escopo",
    shortName: "fora do escopo",
    startPage,
    endPage,
    state: "foraEscopo",
  };
}

/**
 * Reordena a lista pela posição no caderno e junta trechos fora do escopo que
 * ficaram colados. Os não localizados não têm páginas, então vão para o fim na
 * ordem em que já estavam.
 */
export function normalize(list) {
  const placed = list.filter(isPlaced).sort((a, b) => a.startPage - b.startPage);
  const unplaced = list.filter((d) => !isPlaced(d));

  const merged = [];
  for (const doc of placed) {
    const last = merged[merged.length - 1];
    const contiguous =
      last &&
      last.state === "foraEscopo" &&
      doc.state === "foraEscopo" &&
      last.endPage + 1 === doc.startPage;
    if (contiguous) merged[merged.length - 1] = { ...last, endPage: doc.endPage };
    else merged.push(doc);
  }
  return [...merged, ...unplaced];
}

/**
 * Remover um documento não o tira do sumário: ele volta para os não localizados.
 * A lista é o checklist do que o processo precisa ter — o documento continua
 * sendo esperado, o usuário só está dizendo que não é aquele trecho do caderno.
 *
 * As páginas liberadas viram trecho fora do escopo, senão abriria buraco.
 * Documento já não localizado não tem o que remover: a lista volta intacta.
 */
export function removeDocument(docs, doc) {
  if (!isPlaced(doc)) return docs;

  return normalize(
    docs.flatMap((d) => {
      if (d.id !== doc.id) return [d];
      return [
        { ...d, startPage: null, endPage: null, state: "ausente" },
        outOfScope(d.startPage, d.endPage),
      ];
    }),
  );
}

/** Recorta de um trecho fora do escopo as páginas `startPage`–`endPage`. */
function carve(stripe, startPage, endPage) {
  if (endPage < stripe.startPage || startPage > stripe.endPage) return [stripe];

  const pieces = [];
  if (stripe.startPage < startPage) pieces.push(outOfScope(stripe.startPage, startPage - 1));
  if (stripe.endPage > endPage) pieces.push(outOfScope(endPage + 1, stripe.endPage));
  return pieces;
}

/**
 * Dá páginas a um documento — tanto ao localizar um ausente quanto ao corrigir
 * o intervalo de um já localizado — e devolve a lista na ordem do caderno.
 *
 * Os trechos fora do escopo abrem espaço para o intervalo novo, e as páginas
 * que o documento deixou para trás viram fora do escopo. Assim nenhuma página
 * fica órfã nem com dois donos por causa da sobra.
 *
 * Sobreposição com outro documento não é impedida aqui: quem chama mostra o
 * aviso nas duas linhas e o usuário decide qual dos dois corrigir.
 */
export function placeDocument(docs, doc, startPage, endPage) {
  // Sem páginas válidas o documento volta a ser esperado, não localizado.
  if (startPage === null) return removeDocument(docs, doc);

  const freed = isPlaced(doc)
    ? carve(outOfScope(doc.startPage, doc.endPage), startPage, endPage)
    : [];

  return normalize([
    ...docs.flatMap((d) => {
      if (d.id === doc.id) return [{ ...d, startPage, endPage, state: "idle" }];
      return d.state === "foraEscopo" ? carve(d, startPage, endPage) : [d];
    }),
    ...freed,
  ]);
}

/**
 * Documentos que dividem páginas entre si, por id. Trechos fora do escopo não
 * entram: eles são a sobra, e `placeDocument` já os recorta.
 */
export function overlapsById(docs) {
  const placed = docs.filter((d) => d.state !== "foraEscopo" && isPlaced(d));
  const map = new Map();

  const add = (id, other) => map.set(id, [...(map.get(id) ?? []), other]);

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a.startPage <= b.endPage && b.startPage <= a.endPage) {
        add(a.id, b);
        add(b.id, a);
      }
    }
  }
  return map;
}
