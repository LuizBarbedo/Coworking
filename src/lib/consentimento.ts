// Consentimento LGPD do visitante da landing. "essencial" cobre o
// funcionamento do site e a medição agregada de campanhas (primeira parte);
// "total" autoriza também cookies de medição de parceiros (ex.: Meta Pixel),
// que só podem ser carregados quando consentimentoPermiteParceiros() for true.

export type Consentimento = "total" | "essencial";

export const CHAVE_CONSENTIMENTO = "csmg-consentimento";
export const EVENTO_CONSENTIMENTO = "csmg:consentimento";

/** Valida um valor vindo do storage; qualquer coisa inválida = sem decisão. */
export function interpretarConsentimento(
  valor: unknown,
): Consentimento | null {
  return valor === "total" || valor === "essencial" ? valor : null;
}

/** Lê a escolha salva no navegador (null = banner ainda não respondido). */
export function lerConsentimento(): Consentimento | null {
  try {
    return interpretarConsentimento(
      window.localStorage.getItem(CHAVE_CONSENTIMENTO),
    );
  } catch {
    return null;
  }
}

/** Salva a escolha e avisa quem estiver ouvindo (banner, futuros pixels). */
export function salvarConsentimento(escolha: Consentimento): void {
  try {
    window.localStorage.setItem(CHAVE_CONSENTIMENTO, escolha);
  } catch {
    // storage indisponível — a escolha vale só pra esta visita
  }
  window.dispatchEvent(new Event(EVENTO_CONSENTIMENTO));
}

/** Gate dos scripts de terceiros: só com o aceite completo. */
export function consentimentoPermiteParceiros(): boolean {
  return lerConsentimento() === "total";
}
