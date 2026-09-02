import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RegistrationForm } from "./registration-form";

// A landing usa UMA instância do formulário (no fim da página). Estes testes
// guardam duas propriedades do componente que se perdem em refactor:
//   - ids por instância, pra ele continuar seguro se voltar a aparecer duas
//     vezes (com id fixo, os dois <label> apontariam pro mesmo input);
//   - título opcional, porque a seção que o contém já tem o próprio heading.

vi.mock("@/app/actions", () => ({
  registerInscription: vi.fn(),
}));

describe("RegistrationForm", () => {
  it("dá id único a cada campo", () => {
    render(
      <>
        <RegistrationForm />
        <RegistrationForm />
      </>,
    );

    const ids = screen
      .getAllByLabelText("Nome completo")
      .map((campo) => campo.getAttribute("id"));

    expect(ids).toHaveLength(2);
    expect(ids[0]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("mantém o name do campo, que o autofill do navegador usa", () => {
    render(<RegistrationForm />);
    for (const [rotulo, name] of [
      ["Nome completo", "nome"],
      ["CPF", "cpf"],
      ["E-mail", "email"],
      ["Telefone", "telefone"],
    ] as const) {
      expect(screen.getByLabelText(rotulo)).toHaveAttribute("name", name);
    }
  });

  it("liga cada rótulo ao seu próprio input", () => {
    render(
      <>
        <RegistrationForm />
        <RegistrationForm />
      </>,
    );
    // getAllByLabelText só encontra 2 se a associação label/input estiver
    // correta nas duas instâncias.
    expect(screen.getAllByLabelText("CPF")).toHaveLength(2);
    expect(screen.getAllByLabelText("Telefone")).toHaveLength(2);
  });

  it("não repete o heading quando a seção já tem título próprio", () => {
    render(
      <>
        <RegistrationForm />
        <RegistrationForm mostrarTitulo={false} />
      </>,
    );
    // Um heading só: o índice de headings não pode ter a mesma entrada duas
    // vezes, senão o leitor de tela anuncia a seção repetida.
    expect(
      screen.getAllByRole("heading", { name: "Faça sua inscrição" }),
    ).toHaveLength(1);
    // Mas os dois formulários continuam funcionais.
    expect(screen.getAllByLabelText("Nome completo")).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: /Quero me inscrever/ }),
    ).toHaveLength(2);
  });
});
