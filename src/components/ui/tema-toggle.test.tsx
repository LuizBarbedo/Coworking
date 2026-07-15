import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemaToggle } from "./tema-toggle";

describe("TemaToggle", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  it("renderiza um botão acessível", () => {
    render(<TemaToggle />);
    expect(
      screen.getByRole("button", { name: /tema/i }),
    ).toBeInTheDocument();
  });

  it("alterna para o tema escuro: classe no <html> e persistência", async () => {
    const user = userEvent.setup();
    render(<TemaToggle />);
    await user.click(screen.getByRole("button", { name: /tema/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("csmg-tema")).toBe("escuro");
  });

  it("alterna de volta para o claro", async () => {
    const user = userEvent.setup();
    document.documentElement.classList.add("dark");
    localStorage.setItem("csmg-tema", "escuro");
    render(<TemaToggle />);
    await user.click(screen.getByRole("button", { name: /tema/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("csmg-tema")).toBe("claro");
  });
});
