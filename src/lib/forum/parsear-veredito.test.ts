import { describe, expect, it } from "vitest";

import { parsearVeredito } from "./parsear-veredito";

describe("parsearVeredito", () => {
  it("aceita JSON limpo", () => {
    expect(
      parsearVeredito('{"veredito": "aprovado", "motivo": "Dúvida da aula 2"}'),
    ).toEqual({ veredito: "aprovado", motivo: "Dúvida da aula 2" });
  });

  it("aceita JSON dentro de cerca markdown", () => {
    const texto =
      'Claro!\n```json\n{"veredito": "suspeito", "motivo": "Fora do escopo"}\n```';
    expect(parsearVeredito(texto)).toEqual({
      veredito: "suspeito",
      motivo: "Fora do escopo",
    });
  });

  it("aceita JSON com texto em volta", () => {
    const texto =
      'Analisando... {"veredito": "aprovado", "motivo": "ok"} espero ter ajudado';
    expect(parsearVeredito(texto)?.veredito).toBe("aprovado");
  });

  it("normaliza caixa e acento do veredito", () => {
    expect(
      parsearVeredito('{"veredito": "APROVADO", "motivo": "x"}')?.veredito,
    ).toBe("aprovado");
    expect(
      parsearVeredito('{"veredito": "Suspeito ", "motivo": "x"}')?.veredito,
    ).toBe("suspeito");
  });

  it("motivo ausente vira string vazia", () => {
    expect(parsearVeredito('{"veredito": "aprovado"}')).toEqual({
      veredito: "aprovado",
      motivo: "",
    });
  });

  it("veredito desconhecido é null (nunca aprova por engano)", () => {
    expect(parsearVeredito('{"veredito": "talvez", "motivo": "x"}')).toBe(null);
  });

  it("JSON quebrado é null", () => {
    expect(parsearVeredito('{"veredito": "aprovado", "motivo": ')).toBe(null);
    expect(parsearVeredito("não sei avaliar")).toBe(null);
    expect(parsearVeredito("")).toBe(null);
  });
});
