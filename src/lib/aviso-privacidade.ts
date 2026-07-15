// Aviso de privacidade da landing: puramente informativo (não usamos cookies
// de terceiros; a contagem de visitas é anônima), então não há consentimento
// a colher — só o "entendi" pra não reaparecer. Se um dia entrar um script de
// terceiros (ex.: Meta Pixel), isto deve voltar a ser um consentimento de
// verdade, com opção de recusa gateando o script.

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
