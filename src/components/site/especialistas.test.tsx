import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PALESTRANTES } from "@/lib/site/conteudo-landing";
import { Especialistas } from "./especialistas";

// Foto de pessoa real em página pública tem duas obrigações: descrição para
// quem usa leitor de tela e crédito visível (nome + cargo). Os dois se perdem
// facilmente num refactor de layout — por isso ficam travados aqui.

describe("Especialistas", () => {
  it("mostra os 11 especialistas com nome e cargo visíveis", () => {
    render(<Especialistas />);
    for (const pessoa of PALESTRANTES) {
      expect(
        screen.getByRole("heading", { name: pessoa.nome, level: 3 }),
      ).toBeInTheDocument();
      expect(screen.getByText(pessoa.cargo)).toBeInTheDocument();
    }
  });

  it("descreve toda foto com nome e cargo no alt", () => {
    render(<Especialistas />);
    const fotos = screen.getAllByRole("img");
    expect(fotos).toHaveLength(PALESTRANTES.length);
    for (const foto of fotos) {
      const alt = foto.getAttribute("alt") ?? "";
      expect(alt.trim()).not.toBe("");
      // "Nome — Cargo": nunca só o nome do arquivo nem alt genérico.
      expect(alt).toContain("—");
    }
  });

  it("mostra o tema de cada especialista", () => {
    render(<Especialistas />);
    for (const pessoa of PALESTRANTES) {
      for (const tema of pessoa.temas) {
        expect(screen.getAllByText(tema).length).toBeGreaterThan(0);
      }
    }
  });

  it("não esconde ninguém atrás de navegação por slide", () => {
    // Carrossel deixaria 8 dos 11 invisíveis e mataria a prova social. A faixa
    // rolável mantém todos no DOM e alcançáveis por rolagem/teclado.
    const { container } = render(<Especialistas />);
    expect(container.querySelectorAll("li[class*='snap-start']")).toHaveLength(
      PALESTRANTES.length,
    );
    // Nenhum card oculto por atributo.
    for (const card of container.querySelectorAll("li[class*='snap-start']")) {
      expect(card.getAttribute("aria-hidden")).toBeNull();
      expect(card.hasAttribute("hidden")).toBe(false);
    }
  });

  it("deixa a faixa rolável alcançável por teclado", () => {
    render(<Especialistas />);
    const faixa = screen.getByRole("group", {
      name: /11 especialistas da formação/,
    });
    expect(faixa).toHaveAttribute("tabindex", "0");
  });

  it("começa por Ronaldinho do Cavaquinho e Prof. Aurélio", () => {
    // Ordem do documento da marketing; os dois nomes de maior reconhecimento
    // abrem a seção.
    expect(PALESTRANTES[0].nome).toBe("Ronaldinho do Cavaquinho");
    expect(PALESTRANTES[1].nome).toBe("Prof. Aurélio");
  });
});
