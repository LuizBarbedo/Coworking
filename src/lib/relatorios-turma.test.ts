import { describe, expect, it } from "vitest";
import {
  avancoPorDisciplina,
  desempenhoDoAluno,
  filtrarPorTurma,
  linhasDosAlunos,
  resumoGeral,
  type DadosTurma,
} from "./relatorios-turma";

// Cenário: 2 alunas, 2 disciplinas (2 aulas + quiz; 1 aula sem quiz).
const dados: DadosTurma = {
  alunos: [
    { id: "ana", nome: "Ana", email: "ana@x.com" },
    { id: "bia", nome: "Bia", email: "bia@x.com" },
  ],
  disciplinas: [
    {
      id: "d1",
      titulo: "Legado",
      modulo: "Legado Cultural",
      ordem: 1,
      aulas: ["a1", "a2"],
      quizId: "q1",
    },
    {
      id: "d2",
      titulo: "Organização",
      modulo: "Organização",
      ordem: 2,
      aulas: ["a3"],
      quizId: null,
    },
  ],
  progresso: [
    { aluno_id: "ana", aula_id: "a1" },
    { aluno_id: "ana", aula_id: "a2" },
    { aluno_id: "ana", aula_id: "a3" },
    { aluno_id: "bia", aula_id: "a1" },
  ],
  tentativas: [
    { aluno_id: "ana", quiz_id: "q1", nota: 60, aprovado: false },
    { aluno_id: "ana", quiz_id: "q1", nota: 90, aprovado: true },
    { aluno_id: "bia", quiz_id: "q1", nota: 40, aprovado: false },
  ],
  ultimoLoginPorAluno: { ana: "2026-07-20T10:00:00Z" },
  participacoesForum: [{ autor_id: "ana" }, { autor_id: "ana" }],
};

describe("resumoGeral", () => {
  it("agrega turma, aulas e aprovação (melhor tentativa por quiz)", () => {
    const r = resumoGeral(dados);
    expect(r.totalAlunos).toBe(2);
    expect(r.aulasAssistidas).toBe(4);
    // Ana viu 3/3, Bia 1/3 → média de avanço 67%
    expect(r.avancoMedioPct).toBe(67);
    // quizzes tentados: Ana aprovada, Bia não → 50%
    expect(r.aprovacaoPct).toBe(50);
  });
});

describe("avancoPorDisciplina", () => {
  it("conta quem começou, quem concluiu e o desempenho do quiz", () => {
    const [d1, d2] = avancoPorDisciplina(dados);
    expect(d1.comecaramPct).toBe(100); // as duas viram ≥1 aula
    expect(d1.concluiramPct).toBe(50); // só Ana viu as 2
    expect(d1.aprovadas).toBe(1);
    expect(d1.notaMedia).toBe(65); // melhores tentativas: 90 (Ana) e 40 (Bia)
    expect(d2.quizId).toBeNull();
    expect(d2.comecaramPct).toBe(50);
  });
});

describe("linhasDosAlunos", () => {
  it("ordena por avanço e junta fórum e último acesso", () => {
    const [primeira, segunda] = linhasDosAlunos(dados);
    expect(primeira.nome).toBe("Ana");
    expect(primeira.aulasVistas).toBe(3);
    expect(primeira.quizzesAprovados).toBe(1);
    expect(primeira.participacoesForum).toBe(2);
    expect(primeira.ultimoLogin).toBe("2026-07-20T10:00:00Z");
    expect(segunda.nome).toBe("Bia");
    expect(segunda.ultimoLogin).toBeNull();
  });
});

describe("desempenhoDoAluno", () => {
  it("resume o aluno e abre o avanço por disciplina", () => {
    const ana = desempenhoDoAluno(dados, "ana");
    expect(ana.resumo).toMatchObject({
      aulasVistas: 3,
      totalAulas: 3,
      avancoPct: 100,
      quizzesAprovados: 1,
      quizzesTentados: 1,
      notaMedia: 90,
      participacoesForum: 2,
      ultimoLogin: "2026-07-20T10:00:00Z",
    });
    const [d1, d2] = ana.porDisciplina;
    expect(d1).toMatchObject({
      disciplina: "Legado",
      aulasVistas: 2,
      totalAulas: 2,
      quiz: { nota: 90, aprovado: true, tentativas: 2 },
    });
    expect(d2).toMatchObject({
      disciplina: "Organização",
      aulasVistas: 1,
      totalAulas: 1,
      quiz: null,
    });
  });

  it("aluno sem atividade sai zerado, sem quebrar", () => {
    const bia = desempenhoDoAluno(dados, "bia");
    expect(bia.resumo.aulasVistas).toBe(1);
    expect(bia.resumo.quizzesAprovados).toBe(0);
    expect(bia.resumo.notaMedia).toBe(40);
    expect(bia.resumo.ultimoLogin).toBeNull();

    const ninguem = desempenhoDoAluno(dados, "nao-existe");
    expect(ninguem.resumo.aulasVistas).toBe(0);
    expect(ninguem.resumo.notaMedia).toBeNull();
    expect(ninguem.resumo.avancoPct).toBe(0);
  });
});

describe("filtrarPorTurma", () => {
  // Conta ↔ inscrição casam por e-mail, sem diferenciar maiúsculas.
  const inscricoes = [
    { email: "Ana@X.com", turma: 1 },
    { email: "bia@x.com", turma: 2 },
  ];

  it("recorta alunos e atividades da turma pedida", () => {
    const t1 = filtrarPorTurma(dados, inscricoes, 1);
    expect(t1.alunos.map((a) => a.id)).toEqual(["ana"]);
    expect(t1.progresso).toHaveLength(3);
    expect(t1.tentativas).toHaveLength(2);
    expect(t1.participacoesForum).toHaveLength(2);
    expect(t1.ultimoLoginPorAluno).toEqual({ ana: "2026-07-20T10:00:00Z" });
    // Disciplinas são o currículo — não dependem da turma.
    expect(t1.disciplinas).toEqual(dados.disciplinas);

    const t2 = filtrarPorTurma(dados, inscricoes, 2);
    expect(t2.alunos.map((a) => a.id)).toEqual(["bia"]);
    expect(t2.progresso).toHaveLength(1);
    expect(t2.tentativas).toHaveLength(1);
    expect(t2.participacoesForum).toHaveLength(0);
    expect(t2.ultimoLoginPorAluno).toEqual({});
  });

  it("conta sem inscrição correspondente fica fora do recorte", () => {
    const semBia = filtrarPorTurma(dados, [inscricoes[0]], 2);
    expect(semBia.alunos).toHaveLength(0);
    const t3 = filtrarPorTurma(dados, inscricoes, 3);
    expect(t3.alunos).toHaveLength(0);
    expect(t3.progresso).toHaveLength(0);
  });

  it("agregações funcionam sobre o recorte", () => {
    const t1 = filtrarPorTurma(dados, inscricoes, 1);
    const r = resumoGeral(t1);
    expect(r.totalAlunos).toBe(1);
    expect(r.avancoMedioPct).toBe(100); // só a Ana, que viu 3/3
    expect(r.aprovacaoPct).toBe(100);
  });
});

describe("contarAtivosDesde", () => {
  const agora = new Date("2026-08-11T12:00:00Z");

  it("conta quem acessou dentro da janela", async () => {
    const { contarAtivosDesde } = await import("./relatorios-turma");
    expect(
      contarAtivosDesde(
        { a: "2026-08-10T12:00:00Z", b: "2026-08-09T12:00:00Z" },
        7,
        agora,
      ),
    ).toBe(2);
  });

  it("deixa de fora quem acessou antes da janela", async () => {
    const { contarAtivosDesde } = await import("./relatorios-turma");
    expect(
      contarAtivosDesde(
        { a: "2026-08-10T12:00:00Z", velho: "2026-07-01T12:00:00Z" },
        7,
        agora,
      ),
    ).toBe(1);
  });

  it("conta zero sem ninguém", async () => {
    const { contarAtivosDesde } = await import("./relatorios-turma");
    expect(contarAtivosDesde({}, 7, agora)).toBe(0);
  });

  it("ignora data ilegível em vez de contar como ativo", async () => {
    const { contarAtivosDesde } = await import("./relatorios-turma");
    expect(contarAtivosDesde({ a: "nao-e-data" }, 7, agora)).toBe(0);
  });
});

describe("resumoFeedback", () => {
  it("agrega média de estrelas e comentários por disciplina", async () => {
    const { resumoFeedback } = await import("./relatorios-turma");
    const r = resumoFeedback([
      { disciplina_id: "d1", estrelas: 5, comentario: "Ótima!" },
      { disciplina_id: "d1", estrelas: 4, comentario: null },
      { disciplina_id: "d2", estrelas: 2, comentario: "confusa" },
    ]);
    expect(r.get("d1")).toEqual({ media: 4.5, total: 2 });
    expect(r.get("d2")).toEqual({ media: 2, total: 1 });
  });
});
