import { describe, expect, it } from "vitest";

import {
  assuntoAviso,
  chaveAviso,
  detectarLiberacoes,
  listaModulosHtml,
  montarResumoModulo,
  textoAulas,
  type ResumoModulo,
} from "./avisos-modulos";

const AGORA = new Date("2026-08-22T12:00:00Z");
// Corte de ativação do recurso: nada que abriu antes disso gera aviso.
const DESDE = new Date("2026-08-20T00:00:00Z");

const TURMAS = [
  { numero: 1, conteudo_restrito: false },
  { numero: 2, conteudo_restrito: true },
];

const MODULOS = [
  { id: "m1", titulo: "Apresentação do Curso", ordem: 1, publicado: true, publicar_em: null },
  {
    id: "m2",
    titulo: "Gestão e Planejamento Financeiro",
    ordem: 2,
    publicado: true,
    publicar_em: "2026-08-21T09:00:00Z",
  },
  {
    id: "m3",
    titulo: "Cooperativismo",
    ordem: 3,
    publicado: false,
    publicar_em: "2026-09-01T09:00:00Z",
  },
];

const base = {
  turmas: TURMAS,
  modulos: MODULOS,
  turmaModulos: [] as Array<{ turma: number; modulo_id: string; liberacao_em: string | null }>,
  jaAvisados: new Set<string>(),
  agora: AGORA,
  desde: DESDE,
};

describe("chaveAviso", () => {
  it("gera uma chave estável por módulo e turma", () => {
    expect(chaveAviso(2, "m2")).toBe("aviso_modulo:m2:t2");
  });

  it("distingue a mesma abertura em turmas diferentes", () => {
    expect(chaveAviso(1, "m2")).not.toBe(chaveAviso(2, "m2"));
  });
});

describe("detectarLiberacoes", () => {
  it("avisa a turma sem restrição quando o módulo foi publicado no período", () => {
    expect(detectarLiberacoes(base)).toEqual([
      {
        turma: 1,
        moduloId: "m2",
        titulo: "Gestão e Planejamento Financeiro",
        abertoEm: "2026-08-21T09:00:00Z",
      },
    ]);
  });

  it("ignora módulo publicado sem data de publicação", () => {
    // Sem `publicar_em` não há como saber quando abriu — anunciar seria
    // ressuscitar o catálogo inteiro no primeiro disparo.
    expect(detectarLiberacoes(base).some((x) => x.moduloId === "m1")).toBe(false);
  });

  it("ignora o que abriu antes do corte", () => {
    const r = detectarLiberacoes({ ...base, desde: new Date("2026-08-22T00:00:00Z") });
    expect(r).toEqual([]);
  });

  it("ignora o que ainda não abriu", () => {
    const r = detectarLiberacoes({
      ...base,
      modulos: [{ ...MODULOS[1], publicar_em: "2026-08-30T09:00:00Z" }],
    });
    expect(r).toEqual([]);
  });

  it("na turma restrita, usa a data do plano da turma e não a da publicação", () => {
    const r = detectarLiberacoes({
      ...base,
      turmaModulos: [{ turma: 2, modulo_id: "m1", liberacao_em: "2026-08-21T11:00:00Z" }],
    });

    expect(r).toContainEqual({
      turma: 2,
      moduloId: "m1",
      titulo: "Apresentação do Curso",
      abertoEm: "2026-08-21T11:00:00Z",
    });
  });

  it("na turma restrita, não avisa módulo fora do plano", () => {
    expect(detectarLiberacoes(base).some((x) => x.turma === 2)).toBe(false);
  });

  it("na turma restrita, não avisa plano sem data marcada", () => {
    const r = detectarLiberacoes({
      ...base,
      turmaModulos: [{ turma: 2, modulo_id: "m1", liberacao_em: null }],
    });
    expect(r.some((x) => x.turma === 2)).toBe(false);
  });

  it("não avisa módulo despublicado, mesmo com plano de turma aberto", () => {
    // O RLS exige publicado E liberado: avisar aqui levaria o aluno a um módulo
    // que ele não consegue abrir.
    const r = detectarLiberacoes({
      ...base,
      turmaModulos: [{ turma: 2, modulo_id: "m3", liberacao_em: "2026-08-21T11:00:00Z" }],
    });
    expect(r.some((x) => x.moduloId === "m3")).toBe(false);
  });

  it("pula o que já foi avisado — rodar de novo não duplica", () => {
    const r = detectarLiberacoes({ ...base, jaAvisados: new Set([chaveAviso(1, "m2")]) });
    expect(r).toEqual([]);
  });

  it("avisa a outra turma mesmo quando a primeira já foi avisada", () => {
    const r = detectarLiberacoes({
      ...base,
      turmaModulos: [{ turma: 2, modulo_id: "m2", liberacao_em: "2026-08-21T11:00:00Z" }],
      jaAvisados: new Set([chaveAviso(1, "m2")]),
    });
    expect(r.map((x) => x.turma)).toEqual([2]);
  });

  it("recupera atraso: o que abriu há dias e nunca foi avisado ainda sai", () => {
    // Sem janela de tempo — se o cron ficar parado, a rodada seguinte pega.
    const r = detectarLiberacoes({ ...base, agora: new Date("2026-08-30T12:00:00Z") });
    expect(r.map((x) => x.moduloId)).toEqual(["m2"]);
  });

  it("ordena por turma e depois pela ordem do módulo", () => {
    const r = detectarLiberacoes({
      ...base,
      turmaModulos: [
        { turma: 2, modulo_id: "m2", liberacao_em: "2026-08-21T11:00:00Z" },
        { turma: 2, modulo_id: "m1", liberacao_em: "2026-08-21T11:00:00Z" },
      ],
    });

    expect(r.map((x) => `${x.turma}:${x.moduloId}`)).toEqual(["1:m2", "2:m1", "2:m2"]);
  });

  it("ignora plano de turma que não existe na lista de turmas", () => {
    const r = detectarLiberacoes({
      ...base,
      turmaModulos: [{ turma: 9, modulo_id: "m1", liberacao_em: "2026-08-21T11:00:00Z" }],
    });
    expect(r.some((x) => x.turma === 9)).toBe(false);
  });
});

describe("textoAulas", () => {
  it("usa singular para uma aula", () => {
    expect(textoAulas(1)).toBe("1 aula");
  });

  it("usa plural acima de uma", () => {
    expect(textoAulas(12)).toBe("12 aulas");
  });

  it("devolve vazio quando não há aula, pro e-mail poder omitir", () => {
    expect(textoAulas(0)).toBe("");
  });
});

describe("montarResumoModulo", () => {
  const modulo = { titulo: "Gestão e Planejamento Financeiro" };

  it("resume módulo de uma disciplina com a contagem de aulas", () => {
    const resumo = montarResumoModulo({
      modulo,
      disciplinas: [{ id: "d1", titulo: "Gestão e Planejamento Financeiro", ordem: 1, publicado: true }],
      aulasPorDisciplina: { d1: 3 },
    });

    expect(resumo).toEqual({
      titulo: "Gestão e Planejamento Financeiro",
      disciplinas: [{ titulo: "Gestão e Planejamento Financeiro", aulas: 3 }],
      totalAulas: 3,
      resumoAulas: "3 aulas",
    });
  });

  it("soma as aulas de várias disciplinas, na ordem do curso", () => {
    const resumo = montarResumoModulo({
      modulo,
      disciplinas: [
        { id: "d2", titulo: "Segunda parte", ordem: 2, publicado: true },
        { id: "d1", titulo: "Primeira parte", ordem: 1, publicado: true },
      ],
      aulasPorDisciplina: { d1: 4, d2: 8 },
    });

    expect(resumo.disciplinas.map((d) => d.titulo)).toEqual(["Primeira parte", "Segunda parte"]);
    expect(resumo.totalAulas).toBe(12);
    expect(resumo.resumoAulas).toBe("12 aulas");
  });

  it("descarta disciplina não publicada", () => {
    const resumo = montarResumoModulo({
      modulo,
      disciplinas: [
        { id: "d1", titulo: "No ar", ordem: 1, publicado: true },
        { id: "d2", titulo: "Rascunho", ordem: 2, publicado: false },
      ],
      aulasPorDisciplina: { d1: 2, d2: 5 },
    });

    expect(resumo.disciplinas).toHaveLength(1);
    expect(resumo.totalAulas).toBe(2);
  });

  it("aguenta disciplina sem aula nenhuma", () => {
    const resumo = montarResumoModulo({
      modulo,
      disciplinas: [{ id: "d1", titulo: "Ainda montando", ordem: 1, publicado: true }],
      aulasPorDisciplina: {},
    });

    expect(resumo.disciplinas).toEqual([{ titulo: "Ainda montando", aulas: 0 }]);
    expect(resumo.totalAulas).toBe(0);
    expect(resumo.resumoAulas).toBe("");
  });

  it("aguenta módulo sem disciplina publicada", () => {
    const resumo = montarResumoModulo({ modulo, disciplinas: [], aulasPorDisciplina: {} });

    expect(resumo.disciplinas).toEqual([]);
    expect(resumo.totalAulas).toBe(0);
  });
});

describe("assuntoAviso", () => {
  const resumo = (titulo: string): ResumoModulo => ({
    titulo,
    disciplinas: [],
    totalAulas: 0,
    resumoAulas: "",
  });

  it("nomeia o módulo quando só um abriu", () => {
    expect(assuntoAviso([resumo("Cooperativismo")])).toBe(
      "Novo módulo liberado: Cooperativismo",
    );
  });

  it("conta os módulos quando vários abrem juntos", () => {
    expect(assuntoAviso([resumo("A"), resumo("B")])).toBe(
      "2 módulos novos liberados no seu curso",
    );
  });
});

describe("listaModulosHtml", () => {
  it("mostra título e contagem de aulas do módulo", () => {
    const html = listaModulosHtml([
      {
        titulo: "Gestão e Planejamento Financeiro",
        disciplinas: [{ titulo: "Gestão e Planejamento Financeiro", aulas: 3 }],
        totalAulas: 3,
        resumoAulas: "3 aulas",
      },
    ]);

    expect(html).toContain("<strong>Gestão e Planejamento Financeiro</strong>");
    expect(html).toContain("3 aulas");
  });

  it("lista as disciplinas quando o módulo tem mais de uma", () => {
    const html = listaModulosHtml([
      {
        titulo: "Módulo Duplo",
        disciplinas: [
          { titulo: "Primeira parte", aulas: 4 },
          { titulo: "Segunda parte", aulas: 8 },
        ],
        totalAulas: 12,
        resumoAulas: "12 aulas",
      },
    ]);

    expect(html).toContain("Primeira parte");
    expect(html).toContain("Segunda parte");
  });

  it("omite a contagem quando o módulo ainda não tem aula", () => {
    const html = listaModulosHtml([
      { titulo: "Recém-aberto", disciplinas: [], totalAulas: 0, resumoAulas: "" },
    ]);

    expect(html).toContain("<strong>Recém-aberto</strong>");
    expect(html).not.toContain("—");
  });

  it("escapa HTML vindo do título cadastrado pela equipe", () => {
    const html = listaModulosHtml([
      {
        titulo: 'Finanças & "Juros" <b>',
        disciplinas: [],
        totalAulas: 0,
        resumoAulas: "",
      },
    ]);

    expect(html).toContain("Finanças &amp; &quot;Juros&quot; &lt;b&gt;");
    expect(html).not.toContain("<b>");
  });
});
