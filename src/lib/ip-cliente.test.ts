import { describe, expect, it } from "vitest";
import { ipDeCabecalhos } from "./ip-cliente";

const cabecalhos = (mapa: Record<string, string>) => ({
  get: (nome: string) => mapa[nome.toLowerCase()] ?? null,
});

describe("ipDeCabecalhos", () => {
  it("usa o primeiro IP do x-forwarded-for (o cliente real)", () => {
    const h = cabecalhos({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
    expect(ipDeCabecalhos(h)).toBe("203.0.113.9");
  });

  it("aceita x-forwarded-for com um IP só", () => {
    expect(ipDeCabecalhos(cabecalhos({ "x-forwarded-for": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  it("cai pro x-real-ip quando não há x-forwarded-for", () => {
    expect(ipDeCabecalhos(cabecalhos({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7",
    );
  });

  it("devolve 'desconhecido' quando não dá pra identificar", () => {
    expect(ipDeCabecalhos(cabecalhos({}))).toBe("desconhecido");
    expect(ipDeCabecalhos(cabecalhos({ "x-forwarded-for": "  ,  " }))).toBe(
      "desconhecido",
    );
  });
});
