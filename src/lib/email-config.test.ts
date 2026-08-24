import { describe, expect, it } from "vitest";
import { resolverRemetente, resolverSmtp } from "./email-config";

const GMAIL = {
  GMAIL_USER: "equipe.csmg@gmail.com",
  GMAIL_APP_PASSWORD: "senha-de-app",
};

const PROVEDOR = {
  SMTP_HOST: "smtp-relay.brevo.com",
  SMTP_PORT: "587",
  SMTP_USER: "chave-de-acesso",
  SMTP_PASSWORD: "segredo",
};

describe("resolverSmtp", () => {
  it("usa o SMTP próprio quando ele está configurado", () => {
    expect(resolverSmtp({ ...GMAIL, ...PROVEDOR })).toEqual({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user: "chave-de-acesso", pass: "segredo" },
    });
  });

  it("liga o TLS implícito na porta 465", () => {
    const config = resolverSmtp({ ...PROVEDOR, SMTP_PORT: "465" });
    expect(config.port).toBe(465);
    expect(config.secure).toBe(true);
  });

  it("assume a porta 587 quando ela não é informada", () => {
    const semPorta = { ...PROVEDOR, SMTP_PORT: undefined };
    expect(resolverSmtp(semPorta).port).toBe(587);
  });

  it("cai no Gmail enquanto o SMTP próprio não existir", () => {
    expect(resolverSmtp(GMAIL)).toEqual({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "equipe.csmg@gmail.com", pass: "senha-de-app" },
    });
  });

  it("recusa SMTP próprio sem credencial, em vez de cair no Gmail em silêncio", () => {
    expect(() => resolverSmtp({ ...GMAIL, SMTP_HOST: "smtp-relay.brevo.com" })).toThrow(
      /SMTP_USER/,
    );
  });

  it("explica o que falta quando nada está configurado", () => {
    expect(() => resolverSmtp({})).toThrow(/SMTP_HOST/);
  });
});

describe("resolverRemetente", () => {
  it("monta o remetente do domínio próprio com nome de exibição", () => {
    expect(resolverRemetente({ EMAIL_REMETENTE: "contato@coworkingsocial.com.br" }).from).toBe(
      '"Coworking Social" <contato@coworkingsocial.com.br>',
    );
  });

  it("aceita trocar o nome de exibição", () => {
    const r = resolverRemetente({
      EMAIL_REMETENTE: "contato@coworkingsocial.com.br",
      EMAIL_REMETENTE_NOME: "Equipe CSMG",
    });
    expect(r.from).toBe('"Equipe CSMG" <contato@coworkingsocial.com.br>');
  });

  it("aponta as respostas pro Gmail quando o envio passa a sair do domínio", () => {
    // O domínio não tem caixa postal: sem isso, responder ao convite falharia.
    const r = resolverRemetente({ ...GMAIL, EMAIL_REMETENTE: "contato@coworkingsocial.com.br" });
    expect(r.replyTo).toBe("equipe.csmg@gmail.com");
  });

  it("respeita um reply-to explícito", () => {
    const r = resolverRemetente({
      ...GMAIL,
      EMAIL_REMETENTE: "contato@coworkingsocial.com.br",
      EMAIL_REPLY_TO: "duvidas@coworkingsocial.com.br",
    });
    expect(r.replyTo).toBe("duvidas@coworkingsocial.com.br");
  });

  it("não repete o endereço no reply-to quando remetente e Gmail são o mesmo", () => {
    expect(resolverRemetente(GMAIL).replyTo).toBeUndefined();
  });

  it("usa o Gmail como remetente enquanto o domínio não estiver pronto", () => {
    expect(resolverRemetente(GMAIL).from).toBe('"Coworking Social" <equipe.csmg@gmail.com>');
  });

  it("explica o que falta quando não há remetente algum", () => {
    expect(() => resolverRemetente({})).toThrow(/EMAIL_REMETENTE/);
  });
});
