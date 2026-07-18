import { describe, expect, it } from "vitest";

import { compararPeriodos } from "./variacao";

describe("compararPeriodos", () => {
  it("calcula alta em percentual arredondado", () => {
    expect(compararPeriodos(13, 10)).toEqual({
      texto: "+30%",
      direcao: "alta",
    });
  });

  it("calcula queda com sinal de menos tipográfico", () => {
    expect(compararPeriodos(7, 10)).toEqual({
      texto: "−30%",
      direcao: "queda",
    });
  });

  it("arredonda percentuais quebrados", () => {
    expect(compararPeriodos(1, 3)).toEqual({ texto: "−67%", direcao: "queda" });
  });

  it("mesmo valor é estável", () => {
    expect(compararPeriodos(10, 10)).toEqual({
      texto: "estável",
      direcao: "estavel",
    });
  });

  it("período anterior zerado com movimento agora é novidade", () => {
    expect(compararPeriodos(5, 0)).toEqual({ texto: "novo", direcao: "alta" });
  });

  it("tudo zerado é estável", () => {
    expect(compararPeriodos(0, 0)).toEqual({
      texto: "estável",
      direcao: "estavel",
    });
  });

  it("sem dado do período anterior (migração pendente) não compara", () => {
    expect(compararPeriodos(5, undefined)).toBe(null);
  });
});
