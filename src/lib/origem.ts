// Origem de tráfego da inscrição: UTMs da campanha (Meta etc.) com fallback
// pro referrer. Lógica pura, usada no cliente (captura) e no servidor
// (sanitização antes de gravar — nunca confiar no payload do browser).

export type Origem = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
};

export const ORIGEM_VAZIA: Origem = {
  source: null,
  medium: null,
  campaign: null,
};

const TAMANHO_MAX = 80;

function limpar(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .trim()
    .toLowerCase()
    .slice(0, TAMANHO_MAX);
  return limpo || null;
}

/** Reaplica os limites de tamanho/caracteres num payload vindo do browser. */
export function sanitizarOrigem(
  origem: Partial<Origem> | null | undefined,
): Origem {
  return {
    source: limpar(origem?.source),
    medium: limpar(origem?.medium),
    campaign: limpar(origem?.campaign),
  };
}

/**
 * Extrai a origem da visita: UTMs da URL têm prioridade; sem elas, o host do
 * referrer externo vira source (medium "referral"). Acesso direto = tudo nulo.
 */
export function extrairOrigem(
  params: URLSearchParams,
  referrer: string,
  hostProprio?: string,
): Origem {
  const origem = sanitizarOrigem({
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
  });
  if (origem.source || origem.medium || origem.campaign) return origem;

  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      if (host && host !== hostProprio) {
        return { source: limpar(host), medium: "referral", campaign: null };
      }
    } catch {
      // referrer inválido = acesso direto
    }
  }

  return ORIGEM_VAZIA;
}
