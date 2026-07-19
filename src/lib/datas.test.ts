import { describe, expect, it } from "vitest";
import { timestampDeSaoPaulo } from "./datas";

describe("timestampDeSaoPaulo", () => {
  it("converte datetime-local (horário de Brasília) em timestamptz", () => {
    expect(timestampDeSaoPaulo("2026-07-20T08:00")).toBe(
      "2026-07-20T08:00:00-03:00",
    );
  });

  it("devolve null pra valor vazio ou inválido", () => {
    expect(timestampDeSaoPaulo("")).toBeNull();
    expect(timestampDeSaoPaulo("amanhã cedo")).toBeNull();
  });
});
