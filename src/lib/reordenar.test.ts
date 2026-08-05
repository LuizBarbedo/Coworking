import { describe, expect, it } from "vitest";
import { planejarReordenacao } from "./reordenar";

describe("planejarReordenacao", () => {
  it("atribui ordem base 1 seguindo a nova sequência", () => {
    const plano = planejarReordenacao(["a", "b", "c"], ["c", "a", "b"]);
    expect(plano).toEqual({
      atualizacoes: [
        { id: "c", ordem: 1 },
        { id: "a", ordem: 2 },
        { id: "b", ordem: 3 },
      ],
    });
  });

  it("aceita a mesma ordem (sem mudança real)", () => {
    const plano = planejarReordenacao(["a", "b"], ["a", "b"]);
    expect(plano).toEqual({
      atualizacoes: [
        { id: "a", ordem: 1 },
        { id: "b", ordem: 2 },
      ],
    });
  });

  it("rejeita ordem vazia", () => {
    expect(planejarReordenacao(["a"], [])).toEqual({ erro: expect.any(String) });
  });

  it("rejeita ids repetidos na nova ordem", () => {
    const plano = planejarReordenacao(["a", "b"], ["a", "a"]);
    expect(plano).toEqual({ erro: expect.any(String) });
  });

  it("rejeita quando falta um item existente", () => {
    const plano = planejarReordenacao(["a", "b", "c"], ["a", "b"]);
    expect(plano).toEqual({ erro: expect.any(String) });
  });

  it("rejeita id que não pertence ao conjunto atual", () => {
    const plano = planejarReordenacao(["a", "b"], ["a", "x"]);
    expect(plano).toEqual({ erro: expect.any(String) });
  });
});
