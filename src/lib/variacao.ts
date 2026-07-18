// Comparação entre períodos dos cartões do painel (hoje × ontem, semana ×
// semana anterior). Lógica pura; o texto vai direto pro badge.

export type Variacao = {
  texto: string;
  direcao: "alta" | "queda" | "estavel";
};

/**
 * Variação percentual entre o período atual e o anterior. Sem dado do
 * período anterior (migração 0014 pendente) devolve null e o badge some.
 */
export function compararPeriodos(
  atual: number,
  anterior: number | undefined,
): Variacao | null {
  if (anterior === undefined) return null;
  if (anterior === 0) {
    return atual === 0
      ? { texto: "estável", direcao: "estavel" }
      : { texto: "novo", direcao: "alta" };
  }
  const percentual = Math.round(((atual - anterior) / anterior) * 100);
  if (percentual === 0) return { texto: "estável", direcao: "estavel" };
  return percentual > 0
    ? { texto: `+${percentual}%`, direcao: "alta" }
    : { texto: `−${Math.abs(percentual)}%`, direcao: "queda" };
}
