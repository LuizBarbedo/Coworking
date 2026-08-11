import { describe, expect, it } from "vitest";
import { atoresRemovidos, resolverMostrarRemovidos } from "@/lib/eventos-filtro";

describe("atoresRemovidos", () => {
  it("não acusa ninguém quando todo ator ainda tem conta", () => {
    const removidos = atoresRemovidos(["a", "b"], new Set(["a", "b", "c"]));
    expect(removidos).toEqual([]);
  });

  it("acusa o ator cuja conta não existe mais", () => {
    const removidos = atoresRemovidos(["a", "sumiu"], new Set(["a"]));
    expect(removidos).toEqual(["sumiu"]);
  });

  it("ignora evento do sistema (ator nulo)", () => {
    const removidos = atoresRemovidos([null, "a"], new Set(["a"]));
    expect(removidos).toEqual([]);
  });

  it("deduplica o mesmo ator repetido em vários eventos", () => {
    const removidos = atoresRemovidos(
      ["sumiu", "sumiu", "sumiu"],
      new Set<string>(),
    );
    expect(removidos).toEqual(["sumiu"]);
  });

  it("devolve lista vazia sem eventos", () => {
    expect(atoresRemovidos([], new Set(["a"]))).toEqual([]);
  });
});

describe("resolverMostrarRemovidos", () => {
  it("esconde contas removidas por padrão", () => {
    expect(resolverMostrarRemovidos(undefined)).toBe(false);
  });

  it("mostra quando o master pede explicitamente", () => {
    expect(resolverMostrarRemovidos("1")).toBe(true);
  });

  it("ignora valor que não seja o esperado", () => {
    expect(resolverMostrarRemovidos("sim")).toBe(false);
    expect(resolverMostrarRemovidos("0")).toBe(false);
  });
});
