/**
 * Divide um texto longo em trechos (~`max` caracteres) para indexação/recuperação.
 * Preserva limites de parágrafo quando possível; parágrafos muito grandes são
 * quebrados por frase e, no pior caso, por corte rígido de tamanho.
 */
export function dividirEmTrechos(texto: string, max = 700): string[] {
  const limpo = texto.replace(/\r\n/g, "\n").trim();
  if (!limpo) return [];

  const paragrafos = limpo
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const trechos: string[] = [];
  let atual = "";

  const empurrar = () => {
    if (atual.trim()) trechos.push(atual.trim());
    atual = "";
  };

  for (const paragrafo of paragrafos) {
    if (paragrafo.length > max) {
      empurrar();
      for (const pedaco of quebrarLongo(paragrafo, max)) trechos.push(pedaco);
      continue;
    }
    if (atual && (atual.length + 2 + paragrafo.length) > max) {
      empurrar();
    }
    atual = atual ? `${atual}\n\n${paragrafo}` : paragrafo;
  }
  empurrar();

  return trechos;
}

/** Quebra um bloco maior que `max` por frases; se ainda passar, corta no tamanho. */
function quebrarLongo(bloco: string, max: number): string[] {
  const frases = bloco.split(/(?<=[.!?])\s+/);
  const saida: string[] = [];
  let atual = "";

  for (const frase of frases) {
    if (frase.length > max) {
      if (atual.trim()) {
        saida.push(atual.trim());
        atual = "";
      }
      for (let i = 0; i < frase.length; i += max) {
        saida.push(frase.slice(i, i + max));
      }
      continue;
    }
    if (atual && atual.length + 1 + frase.length > max) {
      saida.push(atual.trim());
      atual = frase;
    } else {
      atual = atual ? `${atual} ${frase}` : frase;
    }
  }
  if (atual.trim()) saida.push(atual.trim());

  return saida;
}
