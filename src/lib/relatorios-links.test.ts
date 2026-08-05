import { describe, expect, it } from "vitest";
import type { Turma } from "@/lib/turmas";
import { linkRelatorio, resolverTurma, turmaValida } from "./relatorios-links";

const turmas: Turma[] = [
  { numero: 1, nome: "Turma 1", liberacao_em: null },
  { numero: 2, nome: "Turma 2", liberacao_em: "2026-08-17T03:00:00Z" },
];

describe("resolverTurma", () => {
  it("aceita inteiro positivo", () => {
    expect(resolverTurma("1")).toBe(1);
    expect(resolverTurma("2")).toBe(2);
    expect(resolverTurma("10")).toBe(10);
  });

  it("rejeita tudo que não é inteiro positivo simples", () => {
    expect(resolverTurma(undefined)).toBeNull();
    expect(resolverTurma("")).toBeNull();
    expect(resolverTurma("0")).toBeNull();
    expect(resolverTurma("-1")).toBeNull();
    expect(resolverTurma("2.5")).toBeNull();
    expect(resolverTurma("1e2")).toBeNull();
    expect(resolverTurma("abc")).toBeNull();
    expect(resolverTurma(" 1")).toBeNull();
  });
});

describe("turmaValida", () => {
  it("mantém turma que existe na lista", () => {
    expect(turmaValida(2, turmas)).toBe(2);
  });

  it("zera turma inexistente", () => {
    expect(turmaValida(9, turmas)).toBeNull();
  });

  it("fail-open: sem turmas (pré-0023) nunca filtra", () => {
    expect(turmaValida(1, [])).toBeNull();
  });

  it("null passa direto", () => {
    expect(turmaValida(null, turmas)).toBeNull();
  });
});

describe("linkRelatorio", () => {
  it("sem params vira o basePath puro", () => {
    expect(linkRelatorio("/master/relatorios", {})).toBe("/master/relatorios");
  });

  it("mantém as URLs atuais quando não há turma", () => {
    expect(linkRelatorio("/relatorios", { dias: 7 })).toBe("/relatorios?dias=7");
    expect(linkRelatorio("/master/relatorios", { visao: "inscricoes", dias: 30 })).toBe(
      "/master/relatorios?dias=30",
    );
  });

  it("preserva a turma ao trocar o período", () => {
    expect(linkRelatorio("/master/relatorios", { dias: 7, turma: 2 })).toBe(
      "/master/relatorios?dias=7&turma=2",
    );
    expect(linkRelatorio("/master/relatorios", { dias: 7, turma: null })).toBe(
      "/master/relatorios?dias=7",
    );
  });

  it("preserva a turma ao trocar de visão e omite a visão padrão", () => {
    expect(linkRelatorio("/master/relatorios", { visao: "turma", turma: 2 })).toBe(
      "/master/relatorios?visao=turma&turma=2",
    );
    expect(linkRelatorio("/master/relatorios", { visao: "inscricoes", turma: 2 })).toBe(
      "/master/relatorios?turma=2",
    );
  });

  it("monta o link de exportação com tipo, dias e turma", () => {
    expect(
      linkRelatorio("/relatorios/exportar", { tipo: "serie", dias: 7, turma: 2 }),
    ).toBe("/relatorios/exportar?tipo=serie&dias=7&turma=2");
    expect(linkRelatorio("/relatorios/exportar", { tipo: "origens", dias: 30 })).toBe(
      "/relatorios/exportar?tipo=origens&dias=30",
    );
  });
});
