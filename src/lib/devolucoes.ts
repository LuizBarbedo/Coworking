// Extração do destinatário em avisos de devolução (bounce) do Gmail.
// Lógica pura — a leitura da caixa via IMAP fica em lib/convites.ts.

const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/** Remetentes de sistema que nunca são o destinatário devolvido. */
const IGNORADOS = /mailer-daemon|postmaster|no-?reply/i;

export function extrairEmailDevolvido(texto: string): string | null {
  const candidatos = texto.match(EMAIL_REGEX) ?? [];
  for (const email of candidatos) {
    if (!IGNORADOS.test(email)) return email.toLowerCase();
  }
  return null;
}
