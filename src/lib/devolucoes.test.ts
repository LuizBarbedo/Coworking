import { describe, expect, it } from "vitest";
import { extrairEmailDevolvido } from "./devolucoes";

const BOUNCE_GMAIL = `
Endereço não encontrado
Sua mensagem não foi entregue a fulano@exemplo.com porque o endereço não
foi encontrado ou não pode receber e-mails.
The response was: 550 5.1.1 The email account does not exist.
`;

describe("extrairEmailDevolvido", () => {
  it("acha o destinatário num aviso de devolução do Gmail", () => {
    expect(extrairEmailDevolvido(BOUNCE_GMAIL)).toBe("fulano@exemplo.com");
  });

  it("ignora os endereços do próprio sistema", () => {
    const texto =
      "mailer-daemon@googlemail.com não entregou pra maria.socia@gmail.com";
    expect(extrairEmailDevolvido(texto)).toBe("maria.socia@gmail.com");
  });

  it("devolve null quando não há endereço no texto", () => {
    expect(extrairEmailDevolvido("entrega falhou, tente de novo")).toBeNull();
  });
});
