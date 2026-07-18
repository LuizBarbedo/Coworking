// Preparação da tabela "Origem do tráfego" do painel: a RPC devolve as linhas
// cruas e aqui a cauda de referrals que não converteu (adtech, sites de spam)
// vira uma linha única, pra não afogar as origens que importam.

import type { OrigemAgregada } from "@/lib/metricas";
import { decodificarRotulo } from "@/lib/origem";

export type SiteAgrupado = { source: string; visitas: number };

export type LinhaOrigem = OrigemAgregada & {
  /** Sites somados na linha "outros sites" — detalhados ao expandir a linha. */
  agrupadas?: SiteAgrupado[];
};

function ehCaudaReferral(origem: OrigemAgregada): boolean {
  return origem.medium === "referral" && origem.total === 0;
}

function decodificar(origem: OrigemAgregada): OrigemAgregada {
  return {
    ...origem,
    source: origem.source && decodificarRotulo(origem.source),
    medium: origem.medium && decodificarRotulo(origem.medium),
    campaign: origem.campaign && decodificarRotulo(origem.campaign),
  };
}

/**
 * Decodifica rótulos gravados antes da normalização (%5b → [) e condensa os
 * referrals sem inscrição em "outros sites (N)". Referral que converteu segue
 * com linha própria; com um único referral na cauda, agrupar não ajuda.
 */
export function prepararOrigens(origens: OrigemAgregada[]): LinhaOrigem[] {
  const cauda = origens.filter(ehCaudaReferral);
  const linhas: LinhaOrigem[] = origens
    .filter((o) => cauda.length < 2 || !ehCaudaReferral(o))
    .map(decodificar);

  if (cauda.length >= 2) {
    linhas.push({
      source: `outros sites (${cauda.length})`,
      medium: "referral",
      campaign: null,
      total: 0,
      visitas: cauda.reduce((soma, o) => soma + (o.visitas ?? 0), 0),
      agrupadas: cauda.map((o) => ({
        source: o.source ?? "?",
        visitas: o.visitas ?? 0,
      })),
    });
  }

  return linhas;
}
