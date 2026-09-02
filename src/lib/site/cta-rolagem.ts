/**
 * Regra de exibição do CTA fixo da landing de rolagem.
 *
 * Por que existe barra fixa: em página longa, a atenção se concentra no topo
 * (nos estudos de rolagem do NN/g, a maior parte do tempo de visualização fica
 * acima da dobra), então a oferta precisa continuar alcançável à medida que a
 * pessoa desce — sem obrigar a rolar de volta.
 *
 * Por que é função pura: a decisão é testável sem DOM, e o componente fica só
 * com a leitura da janela. Duas condições, ambas necessárias:
 *   - já passou do hero (onde o CTA principal está visível de qualquer forma);
 *   - o formulário não está na tela (com ele à vista, a barra só atrapalharia).
 */

/** Fração da altura da janela a partir da qual consideramos "passou do hero". */
const LIMITE_DO_HERO = 0.6;

export function deveMostrarCta({
  rolagem,
  alturaJanela,
  formularioVisivel,
}: {
  rolagem: number;
  alturaJanela: number;
  formularioVisivel: boolean;
}): boolean {
  if (alturaJanela <= 0) return false;
  if (formularioVisivel) return false;
  return rolagem > alturaJanela * LIMITE_DO_HERO;
}

/** Um elemento está visível quando qualquer parte dele cruza a janela. */
export function estaVisivel(
  retangulo: { top: number; bottom: number },
  alturaJanela: number,
): boolean {
  return retangulo.top < alturaJanela && retangulo.bottom > 0;
}
