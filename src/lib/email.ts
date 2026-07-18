import "server-only";

import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Variáveis GMAIL_USER e GMAIL_APP_PASSWORD são obrigatórias para enviar e-mails.",
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }

  return transporter;
}

/** Convite de aluno cadastrado manualmente: matrícula + link do 1º acesso. */
export async function enviarEmailConviteAluno(dados: {
  nome: string;
  email: string;
  matricula: string;
}) {
  const remetente = process.env.GMAIL_USER;
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://coworkingsocial.com.br";

  await getTransporter().sendMail({
    from: `"Coworking Social" <${remetente}>`,
    to: dados.email,
    subject: "Seu acesso à plataforma CSMG",
    html: `
      <p>Olá, ${dados.nome}!</p>
      <p>Você foi cadastrado na plataforma do Coworking Social de Mudanças
      Globais.</p>
      <p>Sua matrícula é: <strong>${dados.matricula}</strong></p>
      <p>Para ativar sua conta e escolher sua senha, acesse:
      <a href="${site}/primeiro-acesso">${site}/primeiro-acesso</a>
      e informe seu e-mail e o número de matrícula acima.</p>
    `,
  });
}

/**
 * Convite de membro da equipe (monitor/admin): link único pra definir a
 * senha — nenhuma credencial viaja no corpo do e-mail.
 */
export async function enviarEmailConviteMonitor(dados: {
  nome: string;
  email: string;
  linkConvite: string;
}) {
  const remetente = process.env.GMAIL_USER;

  await getTransporter().sendMail({
    from: `"Coworking Social" <${remetente}>`,
    to: dados.email,
    subject: "Convite pra equipe da plataforma CSMG",
    html: `
      <p>Olá, ${dados.nome}!</p>
      <p>Você foi convidado pra equipe da plataforma do Coworking Social de
      Mudanças Globais.</p>
      <p>Para ativar sua conta e escolher sua senha, use este link (válido
      por 24 horas e de uso único):</p>
      <p><a href="${dados.linkConvite}">Ativar minha conta</a></p>
      <p>Se você não esperava este convite, ignore este e-mail.</p>
    `,
  });
}

export async function enviarEmailConfirmacaoInscricao(dados: {
  nome: string;
  email: string;
  matricula: string;
}) {
  const remetente = process.env.GMAIL_USER;

  await getTransporter().sendMail({
    from: `"Coworking Social" <${remetente}>`,
    to: dados.email,
    subject: "Inscrição confirmada",
    html: `
      <p>Olá, ${dados.nome}!</p>
      <p>Sua inscrição foi recebida com sucesso.</p>
      <p>Seu número de matrícula é: <strong>${dados.matricula}</strong></p>
      <p>Guarde este número: ele identifica você na plataforma. Em breve
      enviaremos os próximos passos para acessar os cursos.</p>
    `,
  });
}
