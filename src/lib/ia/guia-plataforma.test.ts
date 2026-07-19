import { describe, expect, it } from "vitest";
import { montarGuiaPlataforma } from "./guia-plataforma";

const MODULOS = [
  {
    slug: "legado",
    titulo: "Legado Cultural",
    disciplinas: [{ slug: "legado", titulo: "Empreendendo com Legado" }],
  },
  {
    slug: "contabilidade",
    titulo: "Contabilidade",
    disciplinas: [
      { slug: "contabilidade", titulo: "Contabilidade e Noções Financeiras" },
    ],
  },
];

describe("montarGuiaPlataforma", () => {
  it("lista os lugares fixos com links em markdown", () => {
    const guia = montarGuiaPlataforma(MODULOS);
    expect(guia).toContain("[Meus módulos](/painel)");
    expect(guia).toContain("[Fórum de dúvidas](/forum)");
    expect(guia).toContain("[Meu perfil](/perfil)");
  });

  it("lista cada disciplina com o caminho completo", () => {
    const guia = montarGuiaPlataforma(MODULOS);
    expect(guia).toContain(
      "[Empreendendo com Legado](/modulos/legado/legado)",
    );
    expect(guia).toContain(
      "[Contabilidade e Noções Financeiras](/modulos/contabilidade/contabilidade)",
    );
  });

  it("funciona sem módulos publicados", () => {
    expect(montarGuiaPlataforma([])).toContain("[Meus módulos](/painel)");
  });
});
