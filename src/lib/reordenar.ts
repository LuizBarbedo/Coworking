// Lógica pura da reordenação por arrastar-e-soltar: valida que a nova ordem é
// uma permutação exata dos itens existentes e devolve o novo valor de `ordem`
// (base 1) para cada id. Reaproveitável para disciplinas, aulas, materiais e
// módulos — todos usam a coluna `ordem`.

export type PlanoReordenacao =
  | { atualizacoes: { id: string; ordem: number }[] }
  | { erro: string };

export function planejarReordenacao(
  idsAtuais: string[],
  novaOrdem: string[],
): PlanoReordenacao {
  if (novaOrdem.length === 0) return { erro: "Ordem vazia." };

  const nova = new Set(novaOrdem);
  if (nova.size !== novaOrdem.length)
    return { erro: "Ordem com itens repetidos." };

  const atuais = new Set(idsAtuais);
  if (nova.size !== atuais.size || novaOrdem.some((id) => !atuais.has(id)))
    return { erro: "A ordem enviada não corresponde aos itens atuais." };

  return {
    atualizacoes: novaOrdem.map((id, i) => ({ id, ordem: i + 1 })),
  };
}
