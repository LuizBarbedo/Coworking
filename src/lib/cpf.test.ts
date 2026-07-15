import { describe, expect, it } from "vitest";
import { isValidCPF, maskCPF, unmaskCPF } from "./cpf";

describe("maskCPF", () => {
  it("formata 11 dígitos como 000.000.000-00", () => {
    expect(maskCPF("52998224725")).toBe("529.982.247-25");
  });

  it("formata parcialmente enquanto o usuário digita", () => {
    expect(maskCPF("529")).toBe("529");
    expect(maskCPF("5299822")).toBe("529.982.2");
  });

  it("ignora caracteres não numéricos e limita a 11 dígitos", () => {
    expect(maskCPF("529.982.247-25999")).toBe("529.982.247-25");
    expect(maskCPF("abc529def98")).toBe("529.98");
  });
});

describe("unmaskCPF", () => {
  it("remove a máscara", () => {
    expect(unmaskCPF("529.982.247-25")).toBe("52998224725");
  });
});

describe("isValidCPF", () => {
  it("aceita CPF válido (com e sem máscara)", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCPF("529.982.247-26")).toBe(false);
  });

  it("rejeita sequências repetidas (111.111.111-11)", () => {
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
  });

  it("rejeita tamanho errado ou vazio", () => {
    expect(isValidCPF("1234567890")).toBe(false);
    expect(isValidCPF("")).toBe(false);
  });
});
