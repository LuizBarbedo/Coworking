import { describe, expect, it } from "vitest";

import { deveMostrarCta, estaVisivel } from "./cta-rolagem";

describe("deveMostrarCta", () => {
  const janela = 800;

  it("fica escondido no topo da página", () => {
    expect(
      deveMostrarCta({ rolagem: 0, alturaJanela: janela, formularioVisivel: false }),
    ).toBe(false);
  });

  it("aparece depois de passar do hero", () => {
    expect(
      deveMostrarCta({ rolagem: 600, alturaJanela: janela, formularioVisivel: false }),
    ).toBe(true);
  });

  it("desaparece quando o formulário está na tela", () => {
    expect(
      deveMostrarCta({ rolagem: 4000, alturaJanela: janela, formularioVisivel: true }),
    ).toBe(false);
  });

  it("não aparece antes do limite do hero", () => {
    // 0.6 * 800 = 480; exatamente no limite ainda não mostra.
    expect(
      deveMostrarCta({ rolagem: 480, alturaJanela: janela, formularioVisivel: false }),
    ).toBe(false);
    expect(
      deveMostrarCta({ rolagem: 481, alturaJanela: janela, formularioVisivel: false }),
    ).toBe(true);
  });

  it("não decide nada com janela de altura zero (SSR / medida ausente)", () => {
    expect(
      deveMostrarCta({ rolagem: 900, alturaJanela: 0, formularioVisivel: false }),
    ).toBe(false);
  });
});

describe("estaVisivel", () => {
  it("reconhece elemento cruzando a janela", () => {
    expect(estaVisivel({ top: 200, bottom: 900 }, 800)).toBe(true);
  });

  it("reconhece elemento acima da janela", () => {
    expect(estaVisivel({ top: -900, bottom: -100 }, 800)).toBe(false);
  });

  it("reconhece elemento abaixo da janela", () => {
    expect(estaVisivel({ top: 1200, bottom: 1800 }, 800)).toBe(false);
  });

  it("conta como visível quando só a borda de cima entrou", () => {
    expect(estaVisivel({ top: 799, bottom: 1500 }, 800)).toBe(true);
  });
});
