import { describe, expect, it } from "vitest";
import { normalizarUrlStorage, urlDaPlataforma } from "./urls";

describe("urlDaPlataforma", () => {
  it("usa o subdomínio app do domínio principal em produção", () => {
    expect(
      urlDaPlataforma({
        DOMINIO_LANDING: "coworkingsocial.com.br",
        NEXT_PUBLIC_SITE_URL: "https://coworkingsocial.com.br",
      }),
    ).toBe("https://app.coworkingsocial.com.br");
  });

  it("cai pro SITE_URL quando não há domínio configurado (preview)", () => {
    expect(
      urlDaPlataforma({ NEXT_PUBLIC_SITE_URL: "https://x.vercel.app" }),
    ).toBe("https://x.vercel.app");
  });

  it("cai pro localhost em dev sem nada configurado", () => {
    expect(urlDaPlataforma({})).toBe("http://localhost:3000");
  });
});

describe("normalizarUrlStorage", () => {
  it("reescreve URL antiga do Supabase cloud pro storage local", () => {
    const antiga =
      "https://xbyhwzzaoxvyluuerttr.supabase.co/storage/v1/object/public/materiais/capas/7474cfb9.webp?v=123";
    expect(
      normalizarUrlStorage(antiga, {
        NEXT_PUBLIC_SUPABASE_URL: "https://app.coworkingsocial.com.br/supabase",
      }),
    ).toBe(
      "https://app.coworkingsocial.com.br/supabase/storage/v1/object/public/materiais/capas/7474cfb9.webp?v=123",
    );
  });

  it("preserva URLs que já apontam pro storage local ou outro domínio", () => {
    const local =
      "https://app.coworkingsocial.com.br/supabase/storage/v1/object/public/avatares/123.png";
    expect(normalizarUrlStorage(local)).toBe(local);
  });

  it("retorna null para valores vazios ou nulos", () => {
    expect(normalizarUrlStorage(null)).toBeNull();
    expect(normalizarUrlStorage(undefined)).toBeNull();
    expect(normalizarUrlStorage("")).toBeNull();
  });
});

