import { describe, expect, it } from "vitest";

import {
  turmaLiberada,
  numerosLiberados,
  dataLiberacaoFormatada,
  filtrarPorTurmaLiberada,
  type Turma,
} from "./turmas";

const AGORA = new Date("2026-08-05T12:00:00-03:00");

const turma = (dados: Partial<Turma>): Turma => ({
  numero: 2,
  nome: "Turma 2",
  liberacao_em: "2026-08-17T00:00:00-03:00",
  ...dados,
});

describe("turmaLiberada", () => {
  it("sem turma (migração 0023 pendente), o comportamento é o atual: liberada", () => {
    expect(turmaLiberada(null, AGORA)).toBe(true);
    expect(turmaLiberada(undefined, AGORA)).toBe(true);
  });

  it("turma sem data de liberação está liberada", () => {
    expect(turmaLiberada(turma({ numero: 1, liberacao_em: null }), AGORA)).toBe(true);
  });

  it("turma com data futura ainda não abriu", () => {
    expect(turmaLiberada(turma({}), AGORA)).toBe(false);
  });

  it("na data exata (e depois dela) a turma abre sozinha, sem intervenção", () => {
    const meiaNoite = new Date("2026-08-17T00:00:00-03:00");
    expect(turmaLiberada(turma({}), meiaNoite)).toBe(true);
    expect(turmaLiberada(turma({}), new Date("2026-08-18T09:00:00-03:00"))).toBe(true);
  });

  it("data ilegível não tranca ninguém pra fora", () => {
    expect(turmaLiberada(turma({ liberacao_em: "data-quebrada" }), AGORA)).toBe(true);
  });
});

describe("numerosLiberados", () => {
  it("devolve só os números das turmas já abertas", () => {
    const liberadas = numerosLiberados(
      [turma({ numero: 1, liberacao_em: null }), turma({ numero: 2 })],
      AGORA,
    );
    expect(liberadas.has(1)).toBe(true);
    expect(liberadas.has(2)).toBe(false);
  });
});

describe("dataLiberacaoFormatada", () => {
  it("formata a data no padrão brasileiro, fuso de Brasília", () => {
    expect(dataLiberacaoFormatada(turma({}))).toBe("17/08/2026");
  });

  it("turma liberada não tem data pra mostrar", () => {
    expect(dataLiberacaoFormatada(turma({ liberacao_em: null }))).toBe("");
  });
});

describe("filtrarPorTurmaLiberada", () => {
  const turmas = [turma({ numero: 1, liberacao_em: null }), turma({ numero: 2 })];

  it("separa quem espera a turma abrir de quem já pode entrar", () => {
    const { liberadas, aguardando } = filtrarPorTurmaLiberada(
      [
        { email: "ana@exemplo.com", turma: 1 },
        { email: "bruno@exemplo.com", turma: 2 },
      ],
      turmas,
      AGORA,
    );
    expect(liberadas.map((i) => i.email)).toEqual(["ana@exemplo.com"]);
    expect(aguardando.map((i) => i.email)).toEqual(["bruno@exemplo.com"]);
  });

  it("sem a tabela de turmas (migração pendente), ninguém fica retido", () => {
    const { liberadas, aguardando } = filtrarPorTurmaLiberada(
      [{ email: "ana@exemplo.com", turma: 2 }],
      [],
      AGORA,
    );
    expect(liberadas).toHaveLength(1);
    expect(aguardando).toHaveLength(0);
  });

  it("inscrição sem turma ou de turma desconhecida passa (tolerância a dados velhos)", () => {
    const { liberadas, aguardando } = filtrarPorTurmaLiberada(
      [
        { email: "ana@exemplo.com", turma: null },
        { email: "bruno@exemplo.com" },
        { email: "carla@exemplo.com", turma: 9 },
      ],
      turmas,
      AGORA,
    );
    expect(liberadas).toHaveLength(3);
    expect(aguardando).toHaveLength(0);
  });

  it("depois da data, a mesma chamada passa a liberar a turma 2", () => {
    const { liberadas, aguardando } = filtrarPorTurmaLiberada(
      [{ email: "bruno@exemplo.com", turma: 2 }],
      turmas,
      new Date("2026-08-17T08:00:00-03:00"),
    );
    expect(liberadas).toHaveLength(1);
    expect(aguardando).toHaveLength(0);
  });
});
