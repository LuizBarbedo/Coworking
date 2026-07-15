import { describe, expect, it } from "vitest";
import { passosVisiveis, todosOsPassos } from "./passos";

describe("passos do tour", () => {
  it("aluno e master têm passos com áudio e título", () => {
    for (const perfil of ["aluno", "master"] as const) {
      const passos = todosOsPassos(perfil);
      expect(passos.length).toBeGreaterThanOrEqual(3);
      for (const p of passos) {
        expect(p.titulo).toBeTruthy();
        expect(p.descricao).toBeTruthy();
        expect(p.audio).toMatch(/^\/tour\/.+\.mp3$/);
      }
    }
  });

  it("o primeiro passo é central (sem seletor de elemento)", () => {
    expect(todosOsPassos("aluno")[0].seletor).toBeUndefined();
    expect(todosOsPassos("master")[0].seletor).toBeUndefined();
  });

  it("passosVisiveis mantém passos centrais e descarta elementos ausentes", () => {
    // nenhum elemento existe na tela → sobra só o passo central de boas-vindas
    const soCentrais = passosVisiveis("aluno", () => false);
    expect(soCentrais).toHaveLength(1);
    expect(soCentrais[0].seletor).toBeUndefined();

    // todos presentes → todos os passos
    const todos = passosVisiveis("aluno", () => true);
    expect(todos).toEqual(todosOsPassos("aluno"));

    // só "progresso" presente → central + progresso
    const parcial = passosVisiveis("aluno", (s) => s === "progresso");
    expect(parcial.map((p) => p.seletor)).toEqual([undefined, "progresso"]);
  });
});
