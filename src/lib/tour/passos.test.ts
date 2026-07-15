import { describe, expect, it } from "vitest";
import { passosDoTour, todosOsPassos } from "./passos";

describe("passos do tour", () => {
  it("aluno e master têm passos com áudio e título", () => {
    for (const perfil of ["aluno", "master"] as const) {
      const passos = todosOsPassos(perfil);
      expect(passos.length).toBeGreaterThanOrEqual(5);
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

  it("o tour master explora aulas, materiais e avaliação da disciplina", () => {
    const seletores = todosOsPassos("master").map((p) => p.seletor);
    expect(seletores).toContain("master-aulas");
    expect(seletores).toContain("master-materiais");
    expect(seletores).toContain("master-avaliacao");
    // O primeiro passo na página da disciplina navega a partir das disciplinas.
    const passos = todosOsPassos("master");
    const aulas = passos.find((p) => p.seletor === "master-aulas");
    expect(aulas?.linkDe).toBe("master-disciplinas");
    // Ordem: aulas → materiais → avaliação → conhecimento.
    const idx = (s: string) => seletores.indexOf(s);
    expect(idx("master-aulas")).toBeLessThan(idx("master-materiais"));
    expect(idx("master-materiais")).toBeLessThan(idx("master-avaliacao"));
    expect(idx("master-avaliacao")).toBeLessThan(idx("master-conhecimento"));
  });

  it("sem nada na tela, sobra só o passo central", () => {
    const passos = passosDoTour("aluno", () => false, () => false);
    expect(passos).toHaveLength(1);
    expect(passos[0].seletor).toBeUndefined();
  });

  it("inclui passos presentes e os alcançáveis por link (navegação)", () => {
    // Só a tela do painel: progresso e modulos presentes; há link em "modulos"
    // → disciplinas entra por navegação, e abas/aulas/avaliacao entram como
    // irmãos da página profunda que "disciplinas" abre.
    const presentes = new Set(["progresso", "modulos", "assistente"]);
    const passos = passosDoTour(
      "aluno",
      (t) => presentes.has(t),
      (t) => t === "modulos",
    );
    const seletores = passos.map((p) => p.seletor);
    expect(seletores).toContain("progresso");
    expect(seletores).toContain("disciplinas"); // via link
    expect(seletores).toContain("abas"); // via cadeia (disciplinas abre o contêiner)
    expect(seletores).toContain("aulas"); // irmão na página profunda
    expect(seletores).toContain("assistente");
  });

  it("não inclui passos profundos quando não há link para chegar", () => {
    const passos = passosDoTour(
      "aluno",
      (t) => t === "progresso" || t === "modulos",
      () => false, // nenhum link disponível
    );
    const seletores = passos.map((p) => p.seletor);
    expect(seletores).not.toContain("disciplinas");
    expect(seletores).not.toContain("aulas");
  });
});
