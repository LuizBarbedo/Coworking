import { describe, expect, it } from "vitest";
import { linkConviteWhatsApp } from "./whatsapp";

const aluna = {
  nome: "Ana Clara Souza",
  email: "ana@exemplo.com",
  matricula: "2026000123",
  telefone: "(21) 98888-7777",
};
const url = "https://app.coworkingsocial.com.br";

describe("linkConviteWhatsApp", () => {
  it("monta o wa.me com DDI 55 e a mensagem personalizada", () => {
    const link = linkConviteWhatsApp(aluna, url);
    expect(link).toContain("https://wa.me/5521988887777?text=");
    const texto = decodeURIComponent(link!.split("text=")[1]);
    expect(texto).toContain("Oi, Ana!");
    expect(texto).toContain("ana@exemplo.com");
    expect(texto).toContain("matrícula 2026000123");
    expect(texto).toContain(`${url}/primeiro-acesso`);
    expect(texto).toContain("spam");
  });

  it("não duplica o DDI quando o telefone já tem 55", () => {
    const link = linkConviteWhatsApp(
      { ...aluna, telefone: "+55 21 98888-7777" },
      url,
    );
    expect(link).toContain("wa.me/5521988887777");
  });

  it("sem telefone utilizável, retorna null", () => {
    expect(linkConviteWhatsApp({ ...aluna, telefone: null }, url)).toBeNull();
    expect(linkConviteWhatsApp({ ...aluna, telefone: "123" }, url)).toBeNull();
  });

  it("e-mail devolvido troca a mensagem: pede o e-mail correto", () => {
    const link = linkConviteWhatsApp(
      { ...aluna, emailDevolvido: true },
      url,
    );
    const texto = decodeURIComponent(link!.split("text=")[1]);
    expect(texto).toContain("erro de digitação");
    expect(texto).not.toContain("matrícula 2026000123");
  });
});
