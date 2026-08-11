import { describe, expect, it } from "vitest";
import { janelaDePaginas } from "@/lib/paginacao";

describe("janelaDePaginas", () => {
  it("lista tudo quando cabe na janela", () => {
    expect(janelaDePaginas(1, 3, 7)).toEqual([1, 2, 3]);
  });

  it("não devolve nada com uma página só", () => {
    expect(janelaDePaginas(1, 1, 7)).toEqual([]);
  });

  it("põe reticências à direita quando a atual está no começo", () => {
    expect(janelaDePaginas(2, 20, 7)).toEqual([1, 2, 3, 4, 5, "…", 20]);
  });

  it("põe reticências à esquerda quando a atual está no fim", () => {
    expect(janelaDePaginas(19, 20, 7)).toEqual([
      1,
      "…",
      16,
      17,
      18,
      19,
      20,
    ]);
  });

  it("põe reticências dos dois lados no meio", () => {
    expect(janelaDePaginas(10, 20, 7)).toEqual([1, "…", 9, 10, 11, "…", 20]);
  });

  it("sempre mantém a primeira e a última visíveis", () => {
    const janela = janelaDePaginas(10, 20, 7);
    expect(janela[0]).toBe(1);
    expect(janela[janela.length - 1]).toBe(20);
  });

  it("prende a página atual dentro do intervalo válido", () => {
    expect(janelaDePaginas(99, 3, 7)).toEqual([1, 2, 3]);
    expect(janelaDePaginas(0, 3, 7)).toEqual([1, 2, 3]);
  });
});
