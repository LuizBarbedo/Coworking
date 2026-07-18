// Montagem de link de campanha com UTMs pro gerador do painel: evita URL
// mal-encodada nos anúncios (colchete duplamente escapado etc.) e mantém os
// valores no padrão que a plataforma grava (minúsculas, sem espaço).

export type CamposCampanha = {
  source?: string;
  medium?: string;
  campaign?: string;
};

function normalizar(valor: string | undefined): string | null {
  if (!valor) return null;
  const limpo = valor.trim().toLowerCase().replace(/\s+/g, "-");
  return limpo || null;
}

/** URL completa da campanha, ou null se o endereço-base não for válido. */
export function montarUrlCampanha(
  base: string,
  campos: CamposCampanha,
): string | null {
  const endereco = base.trim();
  if (!endereco) return null;
  const comProtocolo = /^https?:\/\//i.test(endereco)
    ? endereco
    : `https://${endereco}`;

  let url: URL;
  try {
    url = new URL(comProtocolo);
  } catch {
    return null;
  }
  // "semdominio" vira host válido pro URL(), mas não é um endereço público.
  if (!url.hostname.includes(".")) return null;

  const pares: Array<[string, string | null]> = [
    ["utm_source", normalizar(campos.source)],
    ["utm_medium", normalizar(campos.medium)],
    ["utm_campaign", normalizar(campos.campaign)],
  ];
  for (const [chave, valor] of pares) {
    if (valor) url.searchParams.set(chave, valor);
  }
  return url.toString();
}
