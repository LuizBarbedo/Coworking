import { describe, expect, it } from "vitest";
import { criarLimitador } from "./limite-taxa";

describe("criarLimitador", () => {
  it("libera até o limite e barra o excedente", () => {
    const limitador = criarLimitador({ limite: 3, janelaMs: 60_000 });

    expect(limitador.consumir("1.2.3.4", 0)).toBe(true);
    expect(limitador.consumir("1.2.3.4", 10)).toBe(true);
    expect(limitador.consumir("1.2.3.4", 20)).toBe(true);
    expect(limitador.consumir("1.2.3.4", 30)).toBe(false);
  });

  it("libera de novo depois que a janela passa", () => {
    const limitador = criarLimitador({ limite: 2, janelaMs: 1_000 });

    expect(limitador.consumir("ip", 0)).toBe(true);
    expect(limitador.consumir("ip", 100)).toBe(true);
    expect(limitador.consumir("ip", 200)).toBe(false);
    // 1_001 ms depois da primeira marca: as duas já saíram da janela.
    expect(limitador.consumir("ip", 1_101)).toBe(true);
  });

  it("conta cada chave separadamente", () => {
    const limitador = criarLimitador({ limite: 1, janelaMs: 60_000 });

    expect(limitador.consumir("ip-a", 0)).toBe(true);
    expect(limitador.consumir("ip-a", 1)).toBe(false);
    expect(limitador.consumir("ip-b", 2)).toBe(true);
  });

  it("uma tentativa barrada não consome cota (não estende o bloqueio)", () => {
    const limitador = criarLimitador({ limite: 1, janelaMs: 1_000 });

    expect(limitador.consumir("ip", 0)).toBe(true);
    expect(limitador.consumir("ip", 100)).toBe(false);
    expect(limitador.consumir("ip", 500)).toBe(false);
    // A janela conta a partir da marca válida (0), não das barradas.
    expect(limitador.consumir("ip", 1_001)).toBe(true);
  });

  it("esquece chaves que saíram da janela (não vaza memória)", () => {
    const limitador = criarLimitador({ limite: 1, janelaMs: 1_000 });

    limitador.consumir("antigo", 0);
    expect(limitador.tamanho()).toBe(1);

    limitador.consumir("novo", 5_000);
    expect(limitador.tamanho()).toBe(1);
  });
});
