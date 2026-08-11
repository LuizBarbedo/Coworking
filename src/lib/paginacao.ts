// Janela de páginas do paginador — lógica pura, testável sem DOM.
// "Anterior/Próxima" sozinhos escondem o tamanho da lista: com os números
// o master sabe onde está e pula direto pro fim.

export type ItemDePagina = number | "…";

/**
 * Monta a régua de páginas mantendo sempre a primeira, a última e uma
 * vizinhança da atual, com "…" no lugar do que foi cortado.
 *
 * @param maximo quantos itens numéricos cabem na régua (mínimo prático: 5)
 */
export function janelaDePaginas(
  pagina: number,
  paginas: number,
  maximo = 7,
): ItemDePagina[] {
  if (paginas <= 1) return [];

  const atual = Math.min(Math.max(1, pagina), paginas);
  if (paginas <= maximo) {
    return Array.from({ length: paginas }, (_, i) => i + 1);
  }

  // A régua sempre gasta o orçamento inteiro: quando a atual encosta numa
  // ponta, a janela desliza pro lado que sobra em vez de encolher.
  const lados = Math.max(1, Math.floor((maximo - 4) / 2));
  const faixa = (de: number, ate: number) =>
    Array.from({ length: ate - de + 1 }, (_, i) => de + i);

  if (atual <= maximo - 3) {
    return [...faixa(1, maximo - 2), "…", paginas];
  }
  if (atual >= paginas - (maximo - 4)) {
    return [1, "…", ...faixa(paginas - maximo + 3, paginas)];
  }
  return [1, "…", ...faixa(atual - lados, atual + lados), "…", paginas];
}
