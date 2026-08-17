import { describe, expect, it } from "vitest";
import {
  estadoDoModulo,
  formatarQuandoLibera,
  moduloLiberadoParaTurma,
  planoPorModulo,
} from "./liberacao-modulos";

const AGORA = new Date("2026-08-17T13:00:00Z"); // 10h de Brasília

describe("estadoDoModulo", () => {
  it("sem linha no plano, o módulo está bloqueado", () => {
    expect(estadoDoModulo(undefined, AGORA)).toBe("bloqueado");
    expect(estadoDoModulo(null, AGORA)).toBe("bloqueado");
  });

  it("data no passado é liberado; no futuro, agendado", () => {
    expect(estadoDoModulo("2026-08-17T11:00:00Z", AGORA)).toBe("liberado");
    expect(estadoDoModulo("2026-08-24T11:00:00Z", AGORA)).toBe("agendado");
  });

  it("data ilegível conta como bloqueado (não vaza conteúdo)", () => {
    expect(estadoDoModulo("nem-data", AGORA)).toBe("bloqueado");
  });
});

describe("moduloLiberadoParaTurma", () => {
  it("turma sem restrição enxerga tudo, mesmo sem plano", () => {
    expect(moduloLiberadoParaTurma(false, undefined, AGORA)).toBe(true);
    expect(moduloLiberadoParaTurma(false, "2026-12-01T00:00:00Z", AGORA)).toBe(
      true,
    );
  });

  it("turma restrita só enxerga o que já abriu", () => {
    expect(moduloLiberadoParaTurma(true, "2026-08-17T11:00:00Z", AGORA)).toBe(
      true,
    );
    expect(moduloLiberadoParaTurma(true, "2026-08-24T11:00:00Z", AGORA)).toBe(
      false,
    );
    expect(moduloLiberadoParaTurma(true, undefined, AGORA)).toBe(false);
  });
});

describe("formatarQuandoLibera", () => {
  it("formata em Brasília, no mesmo padrão do selo Em breve", () => {
    expect(formatarQuandoLibera("2026-08-24T11:00:00Z")).toBe("24/08 às 8h");
    expect(formatarQuandoLibera("2026-08-24T11:30:00Z")).toBe("24/08 às 8h30");
  });

  it("sem data (ou ilegível) não há o que anunciar", () => {
    expect(formatarQuandoLibera(null)).toBeNull();
    expect(formatarQuandoLibera("nem-data")).toBeNull();
  });
});

describe("planoPorModulo", () => {
  it("indexa as linhas do plano por módulo", () => {
    const plano = planoPorModulo([
      { modulo_id: "a", liberacao_em: "2026-08-17T11:00:00Z" },
      { modulo_id: "b", liberacao_em: null },
    ]);
    expect(plano.get("a")).toBe("2026-08-17T11:00:00Z");
    expect(plano.get("b")).toBeNull();
    expect(plano.has("c")).toBe(false);
  });
});
