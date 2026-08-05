import { describe, expect, it } from "vitest";
import { segredoConfere } from "./segredo";

describe("segredoConfere", () => {
  it("aceita segredos iguais", () => {
    expect(segredoConfere("abc123", "abc123")).toBe(true);
  });

  it("recusa segredos diferentes", () => {
    expect(segredoConfere("abc123", "abc124")).toBe(false);
  });

  it("recusa tamanhos diferentes sem estourar", () => {
    expect(segredoConfere("curto", "bem mais comprido")).toBe(false);
  });

  it("recusa vazio contra vazio (segredo não configurado não libera)", () => {
    expect(segredoConfere("", "")).toBe(false);
    expect(segredoConfere(undefined, "")).toBe(false);
    expect(segredoConfere("x", undefined)).toBe(false);
  });
});
