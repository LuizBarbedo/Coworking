import { describe, expect, it } from "vitest";

import { montarCronogramaSemanal } from "./cronograma-turma";

const MODULOS = Array.from({ length: 15 }, (_, i) => ({
  id: `m${i + 1}`,
  titulo: `Módulo ${i + 1}`,
  ordem: i + 1,
}));

const base = {
  modulos: MODULOS,
  jaAbertos: 6,
  porSemana: 3,
  primeiraSemana: "2026-08-31T08:00",
  agora: new Date("2026-08-24T23:30:00Z"),
};

describe("montarCronogramaSemanal", () => {
  it("mantém os módulos já abertos liberados agora", () => {
    const plano = montarCronogramaSemanal(base);
    const abertos = plano.filter((l) => l.liberacao_em === base.agora.toISOString());
    expect(abertos.map((l) => l.modulo_id)).toEqual(["m1", "m2", "m3", "m4", "m5", "m6"]);
  });

  it("agenda os demais em lotes semanais, na ordem do curso", () => {
    const plano = montarCronogramaSemanal(base);
    const porModulo = new Map(plano.map((l) => [l.modulo_id, l.liberacao_em]));

    // 3 por semana, sempre 08:00 de Brasília (-03:00).
    expect(porModulo.get("m7")).toBe("2026-08-31T08:00:00-03:00");
    expect(porModulo.get("m8")).toBe("2026-08-31T08:00:00-03:00");
    expect(porModulo.get("m9")).toBe("2026-08-31T08:00:00-03:00");
    expect(porModulo.get("m10")).toBe("2026-09-07T08:00:00-03:00");
    expect(porModulo.get("m12")).toBe("2026-09-07T08:00:00-03:00");
    expect(porModulo.get("m13")).toBe("2026-09-14T08:00:00-03:00");
    expect(porModulo.get("m15")).toBe("2026-09-14T08:00:00-03:00");
  });

  it("cobre todos os módulos, uma linha por módulo", () => {
    const plano = montarCronogramaSemanal(base);
    expect(plano).toHaveLength(15);
    expect(new Set(plano.map((l) => l.modulo_id)).size).toBe(15);
  });

  it("lote incompleto no fim não sobra nem repete", () => {
    const plano = montarCronogramaSemanal({
      ...base,
      modulos: MODULOS.slice(0, 8),
      jaAbertos: 6,
    });
    expect(plano).toHaveLength(8);
    const porModulo = new Map(plano.map((l) => [l.modulo_id, l.liberacao_em]));
    expect(porModulo.get("m7")).toBe("2026-08-31T08:00:00-03:00");
    expect(porModulo.get("m8")).toBe("2026-08-31T08:00:00-03:00");
  });

  it("sem módulo a agendar, devolve só os abertos", () => {
    const plano = montarCronogramaSemanal({
      ...base,
      modulos: MODULOS.slice(0, 6),
    });
    expect(plano.every((l) => l.liberacao_em === base.agora.toISOString())).toBe(true);
  });

  it("recusa data de início inválida", () => {
    expect(() =>
      montarCronogramaSemanal({ ...base, primeiraSemana: "31/08/2026" }),
    ).toThrow(/AAAA-MM-DDTHH:MM/);
  });

  it("recusa lote menor que 1", () => {
    expect(() => montarCronogramaSemanal({ ...base, porSemana: 0 })).toThrow(
      /por semana/i,
    );
  });

  it("ordena pela ordem do curso, não pela ordem recebida", () => {
    const plano = montarCronogramaSemanal({
      ...base,
      modulos: [...MODULOS].reverse(),
    });
    const porModulo = new Map(plano.map((l) => [l.modulo_id, l.liberacao_em]));
    expect(porModulo.get("m7")).toBe("2026-08-31T08:00:00-03:00");
    expect(porModulo.get("m15")).toBe("2026-09-14T08:00:00-03:00");
  });
});
