import { describe, expect, it } from "vitest";
import { aulaInicial } from "./aulas";

const aula = (id: string, jaAssistida = false) => ({ id, jaAssistida });

describe("aulaInicial", () => {
  it("abre a única aula quando a disciplina só tem uma", () => {
    expect(aulaInicial([aula("a")])).toBe("a");
  });

  it("abre a primeira ainda não assistida", () => {
    expect(aulaInicial([aula("a", true), aula("b", true), aula("c")])).toBe("c");
  });

  it("volta para a primeira quando o aluno já assistiu tudo", () => {
    expect(aulaInicial([aula("a", true), aula("b", true)])).toBe("a");
  });

  it("não abre nada quando não há aula", () => {
    expect(aulaInicial([])).toBeNull();
  });

  it("respeita a aula pedida na URL, mesmo já assistida", () => {
    expect(aulaInicial([aula("a"), aula("b", true)], "b")).toBe("b");
  });

  it("ignora aula da URL que não existe na disciplina", () => {
    expect(aulaInicial([aula("a", true), aula("b")], "sumiu")).toBe("b");
  });

  it("ignora aula da URL vazia ou ausente", () => {
    expect(aulaInicial([aula("a"), aula("b")], "")).toBe("a");
    expect(aulaInicial([aula("a"), aula("b")], null)).toBe("a");
  });
});
