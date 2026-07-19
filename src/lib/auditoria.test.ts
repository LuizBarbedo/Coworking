import { describe, expect, it } from "vitest";
import { normalizarEvento } from "./auditoria-normalizar";

describe("normalizarEvento", () => {
  it("aceita ação no formato dominio.acao e preenche defaults", () => {
    expect(
      normalizarEvento({ acao: "aula.assistida", atorId: "abc" }),
    ).toEqual({
      ator_id: "abc",
      ator_papel: "aluno",
      acao: "aula.assistida",
      alvo_tipo: null,
      alvo_id: null,
      detalhes: null,
    });
  });

  it("rejeita ação fora do padrão", () => {
    expect(normalizarEvento({ acao: "Aula Assistida!" })).toBeNull();
    expect(normalizarEvento({ acao: "" })).toBeNull();
  });

  it("limita o tamanho dos detalhes serializados", () => {
    const grande = { texto: "x".repeat(5000) };
    const evento = normalizarEvento({ acao: "forum.post_criado", detalhes: grande });
    expect(JSON.stringify(evento?.detalhes).length).toBeLessThanOrEqual(2100);
  });
});
