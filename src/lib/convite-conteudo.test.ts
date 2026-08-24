import { describe, expect, it } from "vitest";

import type { ResumoModulo } from "./avisos-modulos";
import {
  aberturaConviteHtml,
  modulosAbertosDaTurma,
  ordinalTurma,
} from "./convite-conteudo";

const AGORA = new Date("2026-08-24T12:00:00Z");

const MODULOS = [
  { id: "m1", titulo: "Apresentação do Curso", ordem: 1, publicado: true },
  { id: "m2", titulo: "Gestão Financeira", ordem: 2, publicado: true },
  { id: "m3", titulo: "Cooperativismo", ordem: 3, publicado: false },
];

const resumo = (titulo: string, aulas = 3): ResumoModulo => ({
  titulo,
  disciplinas: [{ titulo, aulas }],
  totalAulas: aulas,
  resumoAulas: `${aulas} aulas`,
});

/** Conteúdo de convite pronto: N módulos abertos de um curso de `total`. */
const conteudo = (titulos: string[], total = titulos.length) => ({
  modulos: titulos.map((t) => resumo(t)),
  totalDoCurso: total,
});

describe("ordinalTurma", () => {
  it("escreve o ordinal feminino da turma", () => {
    expect(ordinalTurma(1)).toBe("1ª");
    expect(ordinalTurma(2)).toBe("2ª");
    expect(ordinalTurma(11)).toBe("11ª");
  });

  it("devolve vazio sem número de turma (migração pendente)", () => {
    expect(ordinalTurma(null)).toBe("");
    expect(ordinalTurma(undefined)).toBe("");
    expect(ordinalTurma(0)).toBe("");
  });
});

describe("modulosAbertosDaTurma", () => {
  it("turma sem restrição: tudo que está publicado, na ordem", () => {
    expect(
      modulosAbertosDaTurma({
        conteudoRestrito: false,
        modulos: MODULOS,
        plano: [],
        agora: AGORA,
      }).map((m) => m.id),
    ).toEqual(["m1", "m2"]);
  });

  it("turma restrita: só o que o plano já abriu", () => {
    expect(
      modulosAbertosDaTurma({
        conteudoRestrito: true,
        modulos: MODULOS,
        plano: [
          { modulo_id: "m1", liberacao_em: "2026-08-17T11:00:00Z" },
          { modulo_id: "m2", liberacao_em: "2026-08-31T11:00:00Z" },
        ],
        agora: AGORA,
      }).map((m) => m.id),
    ).toEqual(["m1"]);
  });

  it("turma restrita sem plano não enxerga nada (fail-closed)", () => {
    expect(
      modulosAbertosDaTurma({
        conteudoRestrito: true,
        modulos: MODULOS,
        plano: [],
        agora: AGORA,
      }),
    ).toEqual([]);
  });

  it("módulo não publicado nunca abre, mesmo com plano liberado", () => {
    expect(
      modulosAbertosDaTurma({
        conteudoRestrito: true,
        modulos: MODULOS,
        plano: [{ modulo_id: "m3", liberacao_em: "2026-08-01T11:00:00Z" }],
        agora: AGORA,
      }),
    ).toEqual([]);
  });
});

describe("aberturaConviteHtml", () => {
  it("anuncia a turma do aluno, não a primeira", () => {
    const html = aberturaConviteHtml({
      turma: 2,
      conteudo: conteudo(["Apresentação do Curso"], 15),
    });
    expect(html).toContain("2ª turma");
    expect(html).not.toContain("1ª turma");
  });

  it("lista os módulos abertos vindos do banco", () => {
    const html = aberturaConviteHtml({
      turma: 2,
      conteudo: conteudo(["Apresentação do Curso", "Gestão Financeira"], 15),
    });
    expect(html).toContain("Apresentação do Curso");
    expect(html).toContain("Gestão Financeira");
    expect(html).toContain("<ul>");
  });

  it("lista no máximo 5 módulos e resume o resto", () => {
    const html = aberturaConviteHtml({
      turma: 2,
      conteudo: conteudo(["m1", "m2", "m3", "m4", "m5", "m6", "m7"]),
    });
    expect((html.match(/<li>/g) ?? []).length).toBe(5);
    expect(html).toContain("outros 2 módulos");
    expect(html).not.toContain("m7");
  });

  it("com um módulo além dos 5, fala no singular", () => {
    const html = aberturaConviteHtml({
      turma: 1,
      conteudo: conteudo(["m1", "m2", "m3", "m4", "m5", "m6"]),
    });
    expect(html).toContain("outro 1 módulo");
  });

  it("promete os demais só quando ainda falta módulo abrir", () => {
    const faltando = aberturaConviteHtml({
      turma: 2,
      conteudo: conteudo(["m1", "m2"], 15),
    });
    expect(faltando).toContain("Os demais módulos serão liberados");

    const tudoAberto = aberturaConviteHtml({
      turma: 2,
      conteudo: conteudo(["m1", "m2"], 2),
    });
    expect(tudoAberto).not.toContain("Os demais módulos serão liberados");
  });

  it("sem módulos, não promete lista nem inventa conteúdo", () => {
    const html = aberturaConviteHtml({ turma: 2, conteudo: conteudo([], 15) });
    expect(html).toContain("2ª turma");
    expect(html).not.toContain("<ul>");
    expect(html).not.toContain("As primeiras aulas já estão disponíveis");
  });

  it("sem conteúdo nenhum (leitura do banco falhou), sai a versão enxuta", () => {
    const html = aberturaConviteHtml({ turma: 2 });
    expect(html).toContain("2ª turma");
    expect(html).not.toContain("<ul>");
  });

  it("sem turma conhecida, fala do curso sem ordinal", () => {
    const html = aberturaConviteHtml({
      turma: null,
      conteudo: conteudo(["Apresentação do Curso"], 15),
    });
    expect(html).not.toContain("ª turma");
    expect(html).toContain("Coworking Social de Mudanças Globais");
  });

  it("escapa título cadastrado pela equipe", () => {
    const html = aberturaConviteHtml({ turma: 1, conteudo: conteudo(["Aulas <script>"], 15) });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
