// Divide a resposta do assistente em segmentos de texto e links markdown.
// Só caminhos INTERNOS ("/painel", "/modulos/...") viram link — URL externa
// fica como texto puro, pra IA não conseguir apontar o aluno pra fora.

export type Segmento =
  | { tipo: "texto"; texto: string }
  | { tipo: "link"; texto: string; href: string };

const LINK_MD = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

export function segmentarLinks(texto: string): Segmento[] {
  const segmentos: Segmento[] = [];
  let cursor = 0;
  for (const m of texto.matchAll(LINK_MD)) {
    const inicio = m.index ?? 0;
    if (inicio > cursor) {
      segmentos.push({ tipo: "texto", texto: texto.slice(cursor, inicio) });
    }
    segmentos.push({ tipo: "link", texto: m[1], href: m[2] });
    cursor = inicio + m[0].length;
  }
  if (cursor < texto.length) {
    segmentos.push({ tipo: "texto", texto: texto.slice(cursor) });
  }
  return segmentos.length ? segmentos : [{ tipo: "texto", texto }];
}
