import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compara dois segredos em tempo constante (webhooks, tokens).
 *
 * Compara o sha256 de cada lado, não o texto: assim o tamanho dos segredos
 * não vaza pelo tempo de resposta e o timingSafeEqual nunca estoura por
 * buffers de tamanhos diferentes.
 *
 * Segredo ausente ou vazio NUNCA confere — evita o caso em que a variável de
 * ambiente não foi configurada e um header vazio abriria a porta.
 */
export function segredoConfere(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  if (!a || !b) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
