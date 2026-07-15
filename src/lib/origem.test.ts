import { describe, expect, it } from "vitest";

import { extrairOrigem, sanitizarOrigem } from "./origem";

describe("extrairOrigem", () => {
  it("extrai as UTMs da query string", () => {
    const params = new URLSearchParams(
      "?utm_source=facebook&utm_medium=paid_social&utm_campaign=lancamento",
    );
    expect(extrairOrigem(params, "")).toEqual({
      source: "facebook",
      medium: "paid_social",
      campaign: "lancamento",
    });
  });

  it("normaliza pra minúsculas e remove espaços", () => {
    const params = new URLSearchParams("?utm_source=%20Instagram%20");
    expect(extrairOrigem(params, "").source).toBe("instagram");
  });

  it("usa o referrer como fallback de source quando não há UTMs", () => {
    const origem = extrairOrigem(
      new URLSearchParams(""),
      "https://www.instagram.com/p/abc/",
    );
    expect(origem).toEqual({
      source: "www.instagram.com",
      medium: "referral",
      campaign: null,
    });
  });

  it("ignora referrer do próprio site", () => {
    const origem = extrairOrigem(
      new URLSearchParams(""),
      "https://coworkingsocial.com.br/",
      "coworkingsocial.com.br",
    );
    expect(origem).toEqual({ source: null, medium: null, campaign: null });
  });

  it("devolve tudo nulo sem UTMs nem referrer (acesso direto)", () => {
    expect(extrairOrigem(new URLSearchParams(""), "")).toEqual({
      source: null,
      medium: null,
      campaign: null,
    });
  });

  it("ignora referrer que não é URL válida", () => {
    expect(extrairOrigem(new URLSearchParams(""), "não é url").source).toBe(
      null,
    );
  });
});

describe("sanitizarOrigem", () => {
  it("corta valores longos e remove caracteres de controle", () => {
    const origem = sanitizarOrigem({
      source: `${"a".repeat(200)}\n\t`,
      medium: "cpc",
      campaign: null,
    });
    expect(origem.source).toHaveLength(80);
    expect(origem.source).not.toMatch(/[\n\t]/);
    expect(origem.medium).toBe("cpc");
    expect(origem.campaign).toBe(null);
  });

  it("converte vazio e não-string em nulo", () => {
    expect(
      sanitizarOrigem({
        source: "  ",
        medium: 42 as unknown as string,
        campaign: undefined as unknown as string | null,
      }),
    ).toEqual({ source: null, medium: null, campaign: null });
  });

  it("aceita entrada nula ou indefinida", () => {
    expect(sanitizarOrigem(null)).toEqual({
      source: null,
      medium: null,
      campaign: null,
    });
    expect(sanitizarOrigem(undefined)).toEqual({
      source: null,
      medium: null,
      campaign: null,
    });
  });
});
