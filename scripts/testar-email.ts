// Envia um e-mail de teste usando exatamente a mesma resolução de transporte
// e de remetente que a plataforma usa em produção — serve para conferir, antes
// de qualquer disparo, se a mensagem sai autenticada e chega na caixa de
// entrada.
//
// Uso: npx tsx scripts/testar-email.ts <email-de-destino> [outro@...]
//
// Dica: teste em pelo menos um Gmail, um Outlook/Hotmail e um Yahoo — cada um
// filtra de forma diferente.

export {}; // módulo isolado

process.loadEnvFile(".env.local");

async function main() {
  const nodemailer = (await import("nodemailer")).default;
  const { resolverRemetente, resolverSmtp } = await import("@/lib/email-config");

  const destinatarios = process.argv.slice(2).filter(Boolean);
  if (!destinatarios.length) {
    console.error("Informe ao menos um destino: npx tsx scripts/testar-email.ts <email>");
    process.exit(1);
  }

  const smtp = resolverSmtp(process.env);
  const remetente = resolverRemetente(process.env);

  // Confere a configuração em voz alta — sem imprimir credencial.
  console.log(`Servidor : ${smtp.host}:${smtp.port} (TLS ${smtp.secure ? "direto" : "STARTTLS"})`);
  console.log(`Usuário  : ${smtp.auth.user}`);
  console.log(`De       : ${remetente.from}`);
  console.log(`Responder: ${remetente.replyTo ?? "(mesmo do remetente)"}`);
  if (smtp.host === "smtp.gmail.com") {
    console.log(
      "\nAtenção: ainda saindo pelo Gmail. Defina SMTP_HOST/SMTP_USER/SMTP_PASSWORD\n" +
        "e EMAIL_REMETENTE para enviar pelo domínio autenticado.",
    );
  }
  console.log("");

  const transporter = nodemailer.createTransport(smtp);
  await transporter.verify();
  console.log("Conexão com o servidor: ok\n");

  for (const destinatario of destinatarios) {
    await transporter.sendMail({
      ...remetente,
      to: destinatario,
      subject: "Teste de entrega — plataforma CSMG",
      html: `
        <p>Olá!</p>
        <p>Este é um e-mail de teste da plataforma do <strong>Coworking Social
        de Mudanças Globais</strong>. Se você recebeu na caixa de entrada, o
        envio está autenticado corretamente.</p>
        <p>Enviado em ${new Date().toLocaleString("pt-BR")}.</p>
      `,
    });
    console.log(`Enviado para ${destinatario}`);
  }

  console.log(
    "\nConfira a caixa de entrada E a pasta de spam de cada destino.\n" +
      "No Gmail, abra a mensagem > menu > 'Mostrar original' e confirme:\n" +
      "  SPF: PASS · DKIM: PASS · DMARC: PASS",
  );
}

void main();
