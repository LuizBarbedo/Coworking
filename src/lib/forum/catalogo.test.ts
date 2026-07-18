import { describe, expect, it } from "vitest";

import { formatarCatalogo } from "./catalogo";

describe("formatarCatalogo", () => {
  it("monta a hierarquia módulo → disciplina → aulas", () => {
    const texto = formatarCatalogo([
      {
        titulo: "Direito Global",
        descricao: "Fundamentos jurídicos",
        disciplinas: [
          {
            titulo: "Direitos Humanos",
            descricao: null,
            aulas: [{ titulo: "Introdução" }, { titulo: "Tratados" }],
          },
        ],
      },
    ]);
    expect(texto).toContain("MÓDULO: Direito Global — Fundamentos jurídicos");
    expect(texto).toContain("DISCIPLINA: Direitos Humanos");
    expect(texto).toContain("AULAS: Introdução; Tratados");
  });

  it("catálogo vazio avisa que não há cursos", () => {
    expect(formatarCatalogo([])).toContain("Nenhum curso publicado");
  });

  it("trunca descrições longas", () => {
    const texto = formatarCatalogo([
      {
        titulo: "M",
        descricao: "x".repeat(500),
        disciplinas: [],
      },
    ]);
    expect(texto.length).toBeLessThan(400);
    expect(texto).toContain("…");
  });
});
