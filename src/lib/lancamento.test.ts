import { describe, expect, it } from "vitest";

import { bloquearRotaNaLanding, raizDaPlataformaVaiProLogin } from "./lancamento";

const env = {
  DOMINIO_LANDING: "coworkingsocial.com.br",
  PLATAFORMA_LIBERADA: "nao",
};

describe("bloquearRotaNaLanding", () => {
  it("bloqueia rotas da plataforma no domínio principal antes do lançamento", () => {
    for (const rota of [
      "/login",
      "/primeiro-acesso",
      "/painel",
      "/modulos/1/2",
      "/master",
      "/master/disciplinas",
    ]) {
      expect(
        bloquearRotaNaLanding("coworkingsocial.com.br", rota, env),
      ).toBe(true);
    }
  });

  it("bloqueia também com o prefixo www", () => {
    expect(
      bloquearRotaNaLanding("www.coworkingsocial.com.br", "/login", env),
    ).toBe(true);
  });

  it("não bloqueia no subdomínio de preview", () => {
    expect(
      bloquearRotaNaLanding("app.coworkingsocial.com.br", "/login", env),
    ).toBe(false);
    expect(
      bloquearRotaNaLanding("app.coworkingsocial.com.br", "/master", env),
    ).toBe(false);
  });

  it("nunca bloqueia landing, relatórios e API", () => {
    for (const rota of ["/", "/relatorios", "/api/ia/chat", "/api/video/concluir"]) {
      expect(
        bloquearRotaNaLanding("coworkingsocial.com.br", rota, env),
      ).toBe(false);
    }
  });

  it("não bloqueia nada depois do lançamento", () => {
    expect(
      bloquearRotaNaLanding("coworkingsocial.com.br", "/login", {
        ...env,
        PLATAFORMA_LIBERADA: "sim",
      }),
    ).toBe(false);
  });

  it("não bloqueia nada quando DOMINIO_LANDING não está configurado", () => {
    expect(
      bloquearRotaNaLanding("coworkingsocial.com.br", "/login", {}),
    ).toBe(false);
    expect(bloquearRotaNaLanding("localhost", "/login", {})).toBe(false);
  });

  it("não bloqueia hosts que não são o domínio principal (dev, IP)", () => {
    expect(bloquearRotaNaLanding("localhost", "/login", env)).toBe(false);
    expect(bloquearRotaNaLanding("147.79.107.52", "/login", env)).toBe(false);
  });
});

describe("raizDaPlataformaVaiProLogin", () => {
  it("manda a raiz do subdomínio da plataforma pro login", () => {
    expect(
      raizDaPlataformaVaiProLogin("app.coworkingsocial.com.br", "/", env),
    ).toBe(true);
  });

  it("não mexe em outras rotas do subdomínio", () => {
    for (const rota of ["/login", "/painel", "/privacidade", "/forum"]) {
      expect(
        raizDaPlataformaVaiProLogin("app.coworkingsocial.com.br", rota, env),
      ).toBe(false);
    }
  });

  it("não mexe na raiz do domínio principal (landing) nem em dev", () => {
    expect(
      raizDaPlataformaVaiProLogin("coworkingsocial.com.br", "/", env),
    ).toBe(false);
    expect(raizDaPlataformaVaiProLogin("localhost", "/", env)).toBe(false);
  });

  it("segue valendo depois do lançamento e desliga sem DOMINIO_LANDING", () => {
    expect(
      raizDaPlataformaVaiProLogin("app.coworkingsocial.com.br", "/", {
        ...env,
        PLATAFORMA_LIBERADA: "sim",
      }),
    ).toBe(true);
    expect(raizDaPlataformaVaiProLogin("app.coworkingsocial.com.br", "/", {})).toBe(
      false,
    );
  });
});
