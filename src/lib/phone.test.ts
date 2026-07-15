import { describe, expect, it } from "vitest";
import { isValidPhone, maskPhone, unmaskPhone } from "./phone";

describe("maskPhone", () => {
  it("formata fixo (10 dígitos) como (00) 0000-0000", () => {
    expect(maskPhone("2133334444")).toBe("(21) 3333-4444");
  });

  it("formata celular (11 dígitos) como (00) 00000-0000", () => {
    expect(maskPhone("21999998888")).toBe("(21) 99999-8888");
  });

  it("formata parcialmente enquanto o usuário digita", () => {
    expect(maskPhone("21")).toBe("21"); // parênteses só entram a partir do 3º dígito
    expect(maskPhone("21999")).toBe("(21) 999");
  });

  it("ignora caracteres não numéricos e limita a 11 dígitos", () => {
    expect(maskPhone("(21) 99999-8888999")).toBe("(21) 99999-8888");
  });
});

describe("unmaskPhone", () => {
  it("remove a máscara", () => {
    expect(unmaskPhone("(21) 99999-8888")).toBe("21999998888");
  });
});

describe("isValidPhone", () => {
  it("aceita fixo (10) e celular (11)", () => {
    expect(isValidPhone("(21) 3333-4444")).toBe(true);
    expect(isValidPhone("(21) 99999-8888")).toBe(true);
  });

  it("rejeita tamanhos fora de 10–11 dígitos", () => {
    expect(isValidPhone("219999888")).toBe(false);
    expect(isValidPhone("219999988881")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });
});
