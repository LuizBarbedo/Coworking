// Testa o envio do e-mail de confirmação de inscrição, sem precisar passar
// pelo formulário nem pelo banco.
// Uso: node scripts/testar-email.mjs <seu-email@exemplo.com>

import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";

// Carrega variáveis do .env.local (node não faz isso sozinho).
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const destinatario = (process.argv[2] ?? "").trim();
if (!destinatario) {
  console.error("Informe o e-mail de destino: node scripts/testar-email.mjs <email>");
  process.exit(1);
}

if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
  console.error("Configure GMAIL_USER e GMAIL_APP_PASSWORD no .env.local antes de testar.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
});

await transporter.sendMail({
  from: `"Coworking Social" <${env.GMAIL_USER}>`,
  to: destinatario,
  subject: "Inscrição confirmada",
  html: `
    <p>Olá, Aluno de Teste!</p>
    <p>Sua inscrição foi recebida com sucesso.</p>
    <p>Seu número de matrícula é: <strong>2026000001</strong></p>
    <p>Guarde este número: ele identifica você na plataforma. Em breve
    enviaremos os próximos passos para acessar os cursos.</p>
  `,
});

console.log(`E-mail enviado para ${destinatario}. Confira a caixa de entrada (e o spam).`);
