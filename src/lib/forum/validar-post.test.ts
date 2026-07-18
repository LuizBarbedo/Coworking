import { describe, expect, it } from "vitest";

import { validarPost, validarResposta } from "./validar-post";

describe("validarPost", () => {
  it("dúvida válida passa", () => {
    expect(
      validarPost({
        tipo: "duvida",
        titulo: "Como funciona o quiz?",
        corpo: "Não entendi a nota mínima.",
        opcoes: [],
      }),
    ).toBe(null);
  });

  it("dúvida exige corpo", () => {
    expect(
      validarPost({ tipo: "duvida", titulo: "Título ok", corpo: "", opcoes: [] }),
    ).toMatch(/descreva/i);
  });

  it("título curto ou longo demais é rejeitado", () => {
    expect(
      validarPost({ tipo: "duvida", titulo: "Oi", corpo: "x", opcoes: [] }),
    ).toMatch(/título/i);
    expect(
      validarPost({
        tipo: "duvida",
        titulo: "x".repeat(201),
        corpo: "x",
        opcoes: [],
      }),
    ).toMatch(/título/i);
  });

  it("enquete exige de 2 a 10 opções não vazias", () => {
    expect(
      validarPost({
        tipo: "enquete",
        titulo: "Melhor horário?",
        corpo: null,
        opcoes: ["Manhã"],
      }),
    ).toMatch(/opções/i);
    expect(
      validarPost({
        tipo: "enquete",
        titulo: "Melhor horário?",
        corpo: null,
        opcoes: ["Manhã", "  "],
      }),
    ).toMatch(/opções/i);
    expect(
      validarPost({
        tipo: "enquete",
        titulo: "Melhor horário?",
        corpo: null,
        opcoes: Array.from({ length: 11 }, (_, i) => `Opção ${i}`),
      }),
    ).toMatch(/opções/i);
    expect(
      validarPost({
        tipo: "enquete",
        titulo: "Melhor horário?",
        corpo: null,
        opcoes: ["Manhã", "Noite"],
      }),
    ).toBe(null);
  });

  it("corpo gigante é rejeitado", () => {
    expect(
      validarPost({
        tipo: "duvida",
        titulo: "Título ok",
        corpo: "x".repeat(5001),
        opcoes: [],
      }),
    ).toMatch(/longo/i);
  });
});

describe("validarResposta", () => {
  it("resposta válida passa; vazia ou gigante não", () => {
    expect(validarResposta("Boa pergunta! A nota mínima é 70.")).toBe(null);
    expect(validarResposta("   ")).toMatch(/escreva/i);
    expect(validarResposta("x".repeat(5001))).toMatch(/longa/i);
  });
});
