import { describe, expect, it } from "vitest";

import { gerarCsvOrigens, gerarCsvSerie } from "./csv-relatorio";

describe("gerarCsvOrigens", () => {
  it("gera cabeçalho e linhas separadas por ponto e vírgula (Excel pt-BR)", () => {
    const csv = gerarCsvOrigens([
      { source: null, medium: null, campaign: null, total: 175, visitas: 150 },
      {
        source: "whatsapp",
        medium: "mensagem",
        campaign: "[lista-de-transmissao]",
        total: 1,
        visitas: 2,
      },
    ]);
    const linhas = csv.replace("﻿", "").trim().split("\r\n");
    expect(linhas[0]).toBe("Fonte;Meio;Campanha;Visitas;Inscrições;Conversão");
    expect(linhas[1]).toBe("direto / orgânico;;;150;175;116,7%");
    expect(linhas[2]).toBe("whatsapp;mensagem;[lista-de-transmissao];2;1;50%");
  });

  it("começa com BOM pro Excel reconhecer UTF-8", () => {
    expect(gerarCsvOrigens([]).startsWith("﻿")).toBe(true);
  });

  it("decodifica rótulos percent-encodados", () => {
    const csv = gerarCsvOrigens([
      {
        source: "instagram",
        medium: "paid_social",
        campaign: "%5bnome%5d",
        total: 1,
        visitas: 7,
      },
    ]);
    expect(csv).toContain("[nome]");
  });

  it("protege campos com ponto e vírgula ou aspas", () => {
    const csv = gerarCsvOrigens([
      { source: 'a;b"c', medium: null, campaign: null, total: 1, visitas: 1 },
    ]);
    expect(csv).toContain('"a;b""c"');
  });

  it("sem visitas medidas deixa a coluna vazia e conversão sem valor", () => {
    const csv = gerarCsvOrigens([
      { source: "ig", medium: "social", campaign: null, total: 10 },
    ]);
    const linha = csv.replace("﻿", "").trim().split("\r\n")[1];
    expect(linha).toBe("ig;social;;;10;—");
  });
});

describe("gerarCsvSerie", () => {
  it("gera um dia por linha com visitas, inscrições e conversão", () => {
    const csv = gerarCsvSerie([
      { dia: "2026-07-01", total: 3, visitas: 10 },
      { dia: "2026-07-02", total: 0, visitas: 0 },
    ]);
    const linhas = csv.replace("﻿", "").trim().split("\r\n");
    expect(linhas[0]).toBe("Dia;Visitas;Inscrições;Conversão");
    expect(linhas[1]).toBe("2026-07-01;10;3;30%");
    expect(linhas[2]).toBe("2026-07-02;0;0;—");
  });
});
