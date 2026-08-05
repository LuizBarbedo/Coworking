// Identificação do IP do visitante para limite de taxa.
//
// A aplicação só é acessível pelo nginx da VPS, que sempre reescreve
// X-Forwarded-For e X-Real-IP (ver /etc/nginx/sites-enabled). Por isso dá pra
// confiar no primeiro valor da lista — não há proxy do usuário na frente.

/** Só o que precisamos de um Headers — facilita testar. */
export type LeitorCabecalhos = { get(nome: string): string | null };

export const IP_DESCONHECIDO = "desconhecido";

/** IP do cliente, ou "desconhecido" quando não dá pra determinar. */
export function ipDeCabecalhos(cabecalhos: LeitorCabecalhos): string {
  const encaminhado = cabecalhos.get("x-forwarded-for");
  const primeiro = encaminhado?.split(",")[0]?.trim();
  if (primeiro) return primeiro;

  const real = cabecalhos.get("x-real-ip")?.trim();
  if (real) return real;

  return IP_DESCONHECIDO;
}
