import { describe, expect, it } from "vitest";

import { montarUrlCampanha } from "./campanha";

describe("montarUrlCampanha", () => {
  it("monta a URL com as três UTMs normalizadas", () => {
    const url = montarUrlCampanha("https://coworkingsocial.com.br/", {
      source: "Instagram",
      medium: "paid_social",
      campaign: "Lançamento Julho",
    });
    expect(url).toBe(
      "https://coworkingsocial.com.br/?utm_source=instagram&utm_medium=paid_social&utm_campaign=lan%C3%A7amento-julho",
    );
  });

  it("omite campos vazios", () => {
    const url = montarUrlCampanha("https://coworkingsocial.com.br/", {
      source: "whatsapp",
      medium: "",
      campaign: "  ",
    });
    expect(url).toBe(
      "https://coworkingsocial.com.br/?utm_source=whatsapp",
    );
  });

  it("completa o https quando falta o protocolo", () => {
    const url = montarUrlCampanha("coworkingsocial.com.br", {
      source: "ig",
    });
    expect(url).toBe("https://coworkingsocial.com.br/?utm_source=ig");
  });

  it("preserva rota e query já existentes", () => {
    const url = montarUrlCampanha("https://coworkingsocial.com.br/?ref=1", {
      source: "ig",
    });
    expect(url).toBe(
      "https://coworkingsocial.com.br/?ref=1&utm_source=ig",
    );
  });

  it("recusa endereço inválido", () => {
    expect(montarUrlCampanha("", { source: "ig" })).toBe(null);
    expect(montarUrlCampanha("não é url", { source: "ig" })).toBe(null);
    expect(montarUrlCampanha("semdominio", { source: "ig" })).toBe(null);
  });
});
