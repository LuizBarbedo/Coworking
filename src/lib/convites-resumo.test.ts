import { describe, expect, it } from "vitest";
import type { Turma } from "@/lib/turmas";
import { resumoConvitesPorTurma } from "./convites-resumo";

const turmas: Turma[] = [
  { numero: 1, nome: "Turma 1", liberacao_em: null },
  { numero: 2, nome: "Turma 2", liberacao_em: "2026-08-17T03:00:00Z" },
];

// 05/08: turma 1 liberada (liberacao_em null = fail-open), turma 2 ainda não.
const agora = new Date("2026-08-05T18:00:00Z");

const inscricoes = [
  // Turma 1: uma ativada, uma convidada sem ativar, uma sem convite.
  { email: "ana@t1.com", ativado_em: "2026-07-21T12:00:00Z", turma: 1 },
  { email: "bia@t1.com", ativado_em: null, turma: 1 },
  { email: "caio@t1.com", ativado_em: null, turma: 1 },
  // Turma 2: duas novas sem convite (bloqueadas até 17/08).
  { email: "dora@t2.com", ativado_em: null, turma: 2 },
  { email: "eva@t2.com", ativado_em: null, turma: 2 },
  // Conta interna: fica fora de qualquer número.
  { email: "equipe@coworkingsocial.com.br", ativado_em: null, turma: 2 },
];

const convidados = new Set(["ana@t1.com", "bia@t1.com"]);

describe("resumoConvitesPorTurma", () => {
  it("agrupa por turma com inscritos, ativados e sem convite", () => {
    const resumo = resumoConvitesPorTurma(inscricoes, convidados, turmas, agora);
    expect(resumo).toHaveLength(2);
    expect(resumo[0]).toMatchObject({
      numero: 1,
      nome: "Turma 1",
      liberada: true,
      inscritos: 3,
      ativados: 1,
      semConvite: 1, // só o Caio: Ana ativou, Bia já foi convidada
    });
    expect(resumo[1]).toMatchObject({
      numero: 2,
      nome: "Turma 2",
      liberada: false,
      inscritos: 2,
      ativados: 0,
      semConvite: 2,
    });
    expect(resumo[1]!.dataLiberacao).toBe("17/08/2026");
  });

  it("compara e-mails sem diferenciar maiúsculas", () => {
    const resumo = resumoConvitesPorTurma(
      [{ email: "Bia@T1.com", ativado_em: null, turma: 1 }],
      new Set(["bia@t1.com"]),
      turmas,
      agora,
    );
    expect(resumo[0]!.semConvite).toBe(0);
  });

  it("inscrição sem turma (pré-0023) conta na turma 1", () => {
    const resumo = resumoConvitesPorTurma(
      [{ email: "ze@antigo.com", ativado_em: null }],
      new Set(),
      turmas,
      agora,
    );
    expect(resumo[0]!.inscritos).toBe(1);
    expect(resumo[1]!.inscritos).toBe(0);
  });

  it("sem turmas (migração 0023 ausente) devolve lista vazia", () => {
    expect(resumoConvitesPorTurma(inscricoes, convidados, [], agora)).toEqual([]);
  });

  it("turma liberada informa a data em que abriu", () => {
    const depois = new Date("2026-08-18T12:00:00Z");
    const resumo = resumoConvitesPorTurma(inscricoes, convidados, turmas, depois);
    expect(resumo[1]!.liberada).toBe(true);
    expect(resumo[1]!.dataLiberacao).toBe("17/08/2026");
  });
});
