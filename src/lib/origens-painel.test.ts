import { describe, expect, it } from "vitest";

import type { OrigemAgregada } from "@/lib/metricas";
import { prepararOrigens } from "./origens-painel";

function linha(parcial: Partial<OrigemAgregada>): OrigemAgregada {
  return {
    source: null,
    medium: null,
    campaign: null,
    total: 0,
    visitas: 0,
    ...parcial,
  };
}

describe("prepararOrigens", () => {
  it("agrupa referrals sem inscrição numa linha única 'outros sites'", () => {
    const origens = [
      linha({ source: null, total: 175, visitas: 150 }),
      linha({ source: "m.facebook.com", medium: "referral", visitas: 2 }),
      linha({ source: "abc123.safeframe.googlesyndication.com", medium: "referral", visitas: 1 }),
      linha({ source: "woofergames.com", medium: "referral", visitas: 1 }),
    ];
    const resultado = prepararOrigens(origens);
    expect(resultado).toHaveLength(2);
    const outros = resultado[1];
    expect(outros.source).toBe("outros sites (3)");
    expect(outros.medium).toBe("referral");
    expect(outros.total).toBe(0);
    expect(outros.visitas).toBe(4);
    expect(outros.agrupadas).toEqual([
      { source: "m.facebook.com", visitas: 2 },
      { source: "abc123.safeframe.googlesyndication.com", visitas: 1 },
      { source: "woofergames.com", visitas: 1 },
    ]);
  });

  it("preserva referral que converteu, mesmo com poucas visitas", () => {
    const origens = [
      linha({ source: "direito2.com.br", medium: "referral", total: 1, visitas: 2 }),
      linha({ source: "gofrix.com", medium: "referral", visitas: 1 }),
      linha({ source: "woofergames.com", medium: "referral", visitas: 1 }),
    ];
    const resultado = prepararOrigens(origens);
    expect(resultado[0].source).toBe("direito2.com.br");
    expect(resultado[1].source).toBe("outros sites (2)");
  });

  it("não agrupa quando há um único referral sem inscrição", () => {
    const origens = [
      linha({ source: "instagram", medium: "paid_social", total: 1, visitas: 7 }),
      linha({ source: "m.facebook.com", medium: "referral", visitas: 2 }),
    ];
    const resultado = prepararOrigens(origens);
    expect(resultado).toHaveLength(2);
    expect(resultado[1].source).toBe("m.facebook.com");
    expect(resultado[1].agrupadas).toBeUndefined();
  });

  it("não mexe em linhas sem meio referral, mesmo sem inscrição", () => {
    const origens = [
      linha({ source: "whatsapp", medium: "mensagem", visitas: 1 }),
      linha({ source: "gofrix.com", medium: "referral", visitas: 1 }),
      linha({ source: "woofergames.com", medium: "referral", visitas: 1 }),
    ];
    const resultado = prepararOrigens(origens);
    expect(resultado.map((o) => o.source)).toEqual([
      "whatsapp",
      "outros sites (2)",
    ]);
  });

  it("decodifica rótulos percent-encodados gravados antes da normalização", () => {
    const origens = [
      linha({
        source: "instagram",
        medium: "paid_social",
        campaign: "%5bnome-da-campanha%5d",
        total: 1,
        visitas: 7,
      }),
    ];
    expect(prepararOrigens(origens)[0].campaign).toBe("[nome-da-campanha]");
  });

  it("mantém rótulo original quando o percent-encoding é inválido", () => {
    const origens = [
      linha({ source: "ig", medium: "social", campaign: "50%off", total: 1 }),
    ];
    expect(prepararOrigens(origens)[0].campaign).toBe("50%off");
  });
});
