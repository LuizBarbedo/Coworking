import { describe, expect, it } from "vitest";
import {
  avancoPorDisciplina,
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
