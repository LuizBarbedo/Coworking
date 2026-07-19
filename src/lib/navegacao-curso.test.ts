import { describe, expect, it } from "vitest";
import { vizinhasDe, type ModuloComDisciplinas } from "./navegacao-curso";

// Currículo de exemplo: 2 módulos publicados, disciplinas em ordem.
const curso: ModuloComDisciplinas[] = [
  {
    slug: "apresentacao",
    titulo: "Apresentação",
    disciplinas: [{ slug: "apresentacao", titulo: "Apresentação do Curso" }],
  },
  {
    slug: "legado",
    titulo: "Legado Cultural",
    disciplinas: [
      { slug: "legado-a", titulo: "Legado A" },
      { slug: "legado-b", titulo: "Legado B" },
    ],
  },
  {
    slug: "organizacao",
    titulo: "Organização",
    disciplinas: [{ slug: "organizacao", titulo: "Empreender com Organização" }],
  },
];

describe("vizinhasDe", () => {
  it("aponta anterior e próxima dentro do mesmo módulo", () => {
    const { anterior, proxima } = vizinhasDe(curso, "legado", "legado-a");
    expect(anterior?.href).toBe("/modulos/apresentacao/apresentacao");
    expect(proxima?.href).toBe("/modulos/legado/legado-b");
    expect(proxima?.titulo).toBe("Legado B");
  });

  it("cruza a fronteira de módulos na última disciplina", () => {
    const { proxima } = vizinhasDe(curso, "legado", "legado-b");
    expect(proxima?.href).toBe("/modulos/organizacao/organizacao");
    expect(proxima?.modulo).toBe("Organização");
  });

  it("não tem anterior na primeira nem próxima na última do curso", () => {
    expect(vizinhasDe(curso, "apresentacao", "apresentacao").anterior).toBeNull();
    expect(vizinhasDe(curso, "organizacao", "organizacao").proxima).toBeNull();
  });

  it("devolve nulos se a disciplina atual não está na lista (ex.: despublicada)", () => {
    const { anterior, proxima } = vizinhasDe(curso, "legado", "nao-existe");
    expect(anterior).toBeNull();
    expect(proxima).toBeNull();
  });

  it("marca o módulo apenas quando a vizinha é de outro módulo", () => {
    const dentro = vizinhasDe(curso, "legado", "legado-a");
    expect(dentro.proxima?.modulo).toBeUndefined();
    const fora = vizinhasDe(curso, "legado", "legado-b");
    expect(fora.proxima?.modulo).toBe("Organização");
  });
});
