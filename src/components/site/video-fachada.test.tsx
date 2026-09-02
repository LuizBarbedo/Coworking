import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { VideoFachada } from "./video-fachada";

// A promessa da fachada é comportamental, não estética: nada do YouTube pode
// existir na página antes do clique. Se alguém trocar por um embed direto, é
// aqui que quebra.

describe("VideoFachada", () => {
  it("não cria iframe antes do clique", () => {
    const { container } = render(
      <VideoFachada id="s4P2IhWop3k" titulo="Inteligência Artificial" />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Assistir: Inteligência Artificial/ }),
    ).toBeInTheDocument();
  });

  it("no formato vertical, mostra o título como legenda fora da imagem", () => {
    const { container } = render(
      <VideoFachada id="9ZmDAaMFg6E" titulo="Corte do canal" formato="vertical" />,
    );
    const legenda = container.querySelector("figcaption");
    expect(legenda?.textContent).toBe("Corte do canal");
    // O botão continua acessível pelo nome, mesmo sem texto sobreposto.
    expect(
      screen.getByRole("button", { name: /Assistir: Corte do canal/ }),
    ).toBeInTheDocument();
  });

  it("no formato horizontal, não usa legenda", () => {
    const { container } = render(
      <VideoFachada id="9ZmDAaMFg6E" titulo="Corte do canal" />,
    );
    expect(container.querySelector("figcaption")).toBeNull();
  });

  it("cria o iframe no domínio sem cookie depois do clique", async () => {
    const { container } = render(
      <VideoFachada id="s4P2IhWop3k" titulo="Inteligência Artificial" />,
    );

    await userEvent.click(screen.getByRole("button"));

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toContain("youtube-nocookie.com");
    expect(iframe?.getAttribute("src")).toContain("s4P2IhWop3k");
    expect(iframe?.getAttribute("title")).toBe("Inteligência Artificial");
  });

  it("não aponta para o youtube.com com cookie", async () => {
    const { container } = render(
      <VideoFachada id="9ZmDAaMFg6E" titulo="Corte" />,
    );
    await userEvent.click(screen.getByRole("button"));
    const src = container.querySelector("iframe")?.getAttribute("src") ?? "";
    expect(src).not.toMatch(/\/\/(www\.)?youtube\.com/);
  });
});
