// Resolução do transporte SMTP e do remetente — lógica pura, sem I/O, para
// que a troca de provedor de e-mail seja testável e reversível.
//
// Regra de transição: enquanto `SMTP_HOST` não existir, o envio continua
// saindo pelo Gmail exatamente como antes. Assim o deploy pode ir ao ar antes
// do domínio de envio estar verificado, sem interromper nenhum e-mail.

type Env = Record<string, string | undefined>;

export type ConfigSmtp = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
};

export type Remetente = {
  /** Cabeçalho From completo, com nome de exibição. */
  from: string;
  /** Para onde vão as respostas, quando difere do remetente. */
  replyTo?: string;
};

const NOME_PADRAO = "Coworking Social";

/**
 * Escolhe o servidor de saída. Prefere o SMTP próprio (domínio autenticado);
 * na ausência dele, mantém o Gmail para não derrubar o envio em produção.
 */
export function resolverSmtp(env: Env): ConfigSmtp {
  const host = env.SMTP_HOST?.trim();

  if (host) {
    const user = env.SMTP_USER?.trim();
    const pass = env.SMTP_PASSWORD?.trim();
    if (!user || !pass) {
      throw new Error(
        "SMTP_HOST definido sem credencial: preencha SMTP_USER e SMTP_PASSWORD " +
          "(ou remova SMTP_HOST para voltar ao envio pelo Gmail).",
      );
    }
    const port = Number(env.SMTP_PORT?.trim() || 587);
    // 465 usa TLS desde o handshake; 587 sobe para TLS via STARTTLS.
    return { host, port, secure: port === 465, auth: { user, pass } };
  }

  const user = env.GMAIL_USER?.trim();
  const pass = env.GMAIL_APP_PASSWORD?.trim();
  if (user && pass) {
    return { host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } };
  }

  throw new Error(
    "Nenhum servidor de e-mail configurado: defina SMTP_HOST, SMTP_USER e " +
      "SMTP_PASSWORD, ou GMAIL_USER e GMAIL_APP_PASSWORD.",
  );
}

/**
 * Monta o remetente. Quando o envio sai do domínio próprio, as respostas vão
 * para a caixa do Gmail por padrão — o domínio não tem MX, então sem isso
 * responder a um convite devolveria erro.
 */
export function resolverRemetente(env: Env): Remetente {
  const endereco = env.EMAIL_REMETENTE?.trim() || env.GMAIL_USER?.trim();
  if (!endereco) {
    throw new Error(
      "Remetente ausente: defina EMAIL_REMETENTE (ou GMAIL_USER durante a transição).",
    );
  }

  const nome = env.EMAIL_REMETENTE_NOME?.trim() || NOME_PADRAO;
  const caixaGmail = env.GMAIL_USER?.trim();
  const replyTo =
    env.EMAIL_REPLY_TO?.trim() ||
    (caixaGmail && caixaGmail !== endereco ? caixaGmail : undefined);

  return { from: `"${nome}" <${endereco}>`, ...(replyTo ? { replyTo } : {}) };
}
