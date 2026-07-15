import { beforeEach, describe, expect, it } from "vitest";
import { definirSom, somAtivo } from "./sons";

describe("preferência de som", () => {
  beforeEach(() => localStorage.clear());

  it("vem desligado por padrão", () => {
    expect(somAtivo()).toBe(false);
  });

  it("persiste ativação e desativação", () => {
    definirSom(true);
    expect(somAtivo()).toBe(true);
    expect(localStorage.getItem("csmg-som")).toBe("1");
    definirSom(false);
    expect(somAtivo()).toBe(false);
  });
});
