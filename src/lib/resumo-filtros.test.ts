import { describe, expect, it } from "vitest";
import { resumoDoRecorte } from "@/lib/resumo-filtros";

describe("resumoDoRecorte", () => {
  it("descreve turma e período juntos", () => {
    expect(resumoDoRecorte({ nomeDaTurma: "Turma 2", dias: 30 })).toBe(
      "Turma 2 · últimos 30 dias",
    );
  });

  it("diz todas as turmas quando não há recorte", () => {
    expect(resumoDoRecorte({ nomeDaTurma: null, dias: 7 })).toBe(
      "todas as turmas · últimos 7 dias",
    );
  });

  it("omite o período quando a visão não usa data", () => {
    expect(resumoDoRecorte({ nomeDaTurma: "Turma 1", dias: null })).toBe(
      "Turma 1",
    );
  });

  it("descreve o caso sem recorte nenhum", () => {
    expect(resumoDoRecorte({ nomeDaTurma: null, dias: null })).toBe(
      "todas as turmas",
    );
  });
});
