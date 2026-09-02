import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CHAVE_AVISO } from "@/lib/aviso-privacidade";
import { CtaPersistente } from "./cta-persistente";

// A barra e o AvisoPrivacidade são os dois fixos no rodapé. O aviso tem z maior,
// então sem esta regra os dois se sobrepõem — foi o que apareceu na captura da
// página antes da correção.
//
// Consultamos o contêiner direto (container.firstElementChild) porque, quando a
// barra está escondida, ela sai da árvore de acessibilidade pelo aria-hidden —
// e getByRole, corretamente, deixa de encontrá-la.

function rolarPara(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, writable: true });
  window.dispatchEvent(new Event("scroll"));
}

afterEach(() => {
  window.localStorage.clear();
  rolarPara(0);
});

describe("CtaPersistente", () => {
  it("fica escondida no topo da página", () => {
    window.localStorage.setItem(CHAVE_AVISO, "visto");
    const { container } = render(<CtaPersistente rotulo="Quero me inscrever" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("aparece ao rolar, quando o aviso de privacidade já foi dispensado", async () => {
    window.localStorage.setItem(CHAVE_AVISO, "visto");
    const { container } = render(<CtaPersistente rotulo="Quero me inscrever" />);

    rolarPara(4000);

    await waitFor(() =>
      expect(container.firstElementChild).toHaveAttribute("aria-hidden", "false"),
    );
    // Visível: o link volta a existir na árvore de acessibilidade.
    expect(
      screen.getByRole("link", { name: /Quero me inscrever/ }),
    ).toHaveAttribute("tabindex", "0");
  });

  it("não aparece enquanto o aviso de privacidade estiver na tela", async () => {
    // localStorage limpo = aviso ainda visível no rodapé.
    const { container } = render(<CtaPersistente rotulo="Quero me inscrever" />);

    // act envolve a rolagem e a espera porque a leitura acontece em
    // requestAnimationFrame, ou seja, o estado muda depois do evento.
    await act(async () => {
      rolarPara(4000);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("tira a barra escondida da navegação por teclado", () => {
    window.localStorage.setItem(CHAVE_AVISO, "visto");
    const { container } = render(<CtaPersistente rotulo="Quero me inscrever" />);
    const link = container.querySelector("a");
    expect(link).toHaveAttribute("tabindex", "-1");
  });
});
