import { describe, expect, it } from "vitest";

import {
  lerSessaoEquipe,
  podeVerComoAluno,
  primeiraRotaPermitida,
  temPermissao,
} from "./permissoes";

describe("lerSessaoEquipe", () => {
  it("quem não é master não é equipe", () => {
    expect(lerSessaoEquipe(undefined)).toBe(null);
    expect(lerSessaoEquipe(null)).toBe(null);
    expect(lerSessaoEquipe({})).toBe(null);
    expect(lerSessaoEquipe({ role: "aluno" })).toBe(null);
  });

  it("master sem nível é admin (contas criadas antes dos níveis)", () => {
    expect(lerSessaoEquipe({ role: "master" })).toEqual({
      nivel: "admin",
      permissoes: [],
    });
  });

  it("master com nível admin explícito é admin", () => {
    expect(lerSessaoEquipe({ role: "master", nivel: "admin" })?.nivel).toBe(
      "admin",
    );
  });

  it("monitor carrega as permissões concedidas", () => {
    expect(
      lerSessaoEquipe({
        role: "master",
        nivel: "monitor",
        permissoes: ["moderar_forum", "visao_aluno"],
      }),
    ).toEqual({
      nivel: "monitor",
      permissoes: ["moderar_forum", "visao_aluno"],
    });
  });

  it("descarta permissões desconhecidas e formatos inválidos", () => {
    expect(
      lerSessaoEquipe({
        role: "master",
        nivel: "monitor",
        permissoes: ["hackear_tudo", "visao_aluno", 42],
      }),
    ).toEqual({ nivel: "monitor", permissoes: ["visao_aluno"] });
    expect(
      lerSessaoEquipe({ role: "master", nivel: "monitor", permissoes: "x" }),
    ).toEqual({ nivel: "monitor", permissoes: [] });
  });
});

describe("temPermissao", () => {
  it("admin tem todas as permissões", () => {
    const admin = lerSessaoEquipe({ role: "master" });
    expect(temPermissao(admin, "editar_conteudo")).toBe(true);
    expect(temPermissao(admin, "moderar_forum")).toBe(true);
  });

  it("monitor só tem o que foi concedido", () => {
    const monitor = lerSessaoEquipe({
      role: "master",
      nivel: "monitor",
      permissoes: ["moderar_forum"],
    });
    expect(temPermissao(monitor, "moderar_forum")).toBe(true);
    expect(temPermissao(monitor, "editar_conteudo")).toBe(false);
  });

  it("quem não é equipe não tem permissão nenhuma", () => {
    expect(temPermissao(null, "ver_relatorios")).toBe(false);
  });
});

describe("podeVerComoAluno", () => {
  it("aluno comum (sem sessão de equipe) sempre pode", () => {
    expect(podeVerComoAluno(null)).toBe(true);
  });

  it("admin pode", () => {
    expect(podeVerComoAluno(lerSessaoEquipe({ role: "master" }))).toBe(true);
  });

  it("monitor depende da permissão visao_aluno", () => {
    const com = lerSessaoEquipe({
      role: "master",
      nivel: "monitor",
      permissoes: ["visao_aluno"],
    });
    const sem = lerSessaoEquipe({
      role: "master",
      nivel: "monitor",
      permissoes: ["moderar_forum"],
    });
    expect(podeVerComoAluno(com)).toBe(true);
    expect(podeVerComoAluno(sem)).toBe(false);
  });
});

describe("primeiraRotaPermitida", () => {
  it("admin vai pro hub de conteúdo", () => {
    expect(primeiraRotaPermitida(lerSessaoEquipe({ role: "master" })!)).toBe(
      "/master",
    );
  });

  it("monitor cai na primeira aba que pode ver, em ordem de prioridade", () => {
    const monitor = (permissoes: string[]) =>
      lerSessaoEquipe({ role: "master", nivel: "monitor", permissoes })!;
    expect(primeiraRotaPermitida(monitor(["editar_conteudo"]))).toBe("/master");
    expect(primeiraRotaPermitida(monitor(["ver_relatorios"]))).toBe(
      "/master/relatorios",
    );
    expect(primeiraRotaPermitida(monitor(["moderar_forum"]))).toBe(
      "/master/forum",
    );
    expect(
      primeiraRotaPermitida(monitor(["moderar_forum", "editar_conteudo"])),
    ).toBe("/master");
  });

  it("monitor sem aba nenhuma devolve null (quem chama decide o destino)", () => {
    const monitor = lerSessaoEquipe({
      role: "master",
      nivel: "monitor",
      permissoes: ["visao_aluno"],
    })!;
    expect(primeiraRotaPermitida(monitor)).toBe(null);
  });
});
