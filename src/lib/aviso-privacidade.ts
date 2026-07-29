// Aviso de privacidade da landing: hoje é só informativo — o "entendi" serve
// pra não reaparecer, não é consentimento.
// PENDÊNCIA: a landing carrega tag do Google Ads e pixel da Meta (layout do
// grupo (site)). Pra ficar em dia com a LGPD isto precisa virar consentimento
// de verdade, com opção de recusa gateando os dois scripts (só montar as
// <Script> depois do aceite).

export const CHAVE_AVISO = "csmg-aviso-privacidade";
export const EVENTO_AVISO = "csmg:aviso-privacidade";

/** true se o visitante já dispensou o aviso. */
export function avisoVisto(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_AVISO) === "visto";
  } catch {
    return false;
  }
}

/** Marca o aviso como visto e notifica o banner pra sumir. */
export function marcarAvisoVisto(): void {
  try {
    window.localStorage.setItem(CHAVE_AVISO, "visto");
  } catch {
    // storage indisponível — o aviso volta na próxima visita, sem drama
  }
  window.dispatchEvent(new Event(EVENTO_AVISO));
}
