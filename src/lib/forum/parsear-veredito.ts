// Parse defensivo do veredito do moderador IA. O modelo devolve texto; a
// gente só confia se conseguir extrair um JSON válido com veredito
// conhecido — qualquer outra coisa vira null e o post fica pra revisão
// humana. Nunca aprovar por engano.

export type VeredictoIA = {
  veredito: "aprovado" | "suspeito";
  motivo: string;
};

/** Extrai o primeiro objeto JSON plausível do texto (cercas, prosa em volta). */
function extrairJson(texto: string): unknown | null {
  const semCercas = texto.replace(/```(?:json)?/gi, "");
  const inicio = semCercas.indexOf("{");
  const fim = semCercas.lastIndexOf("}");
  if (inicio === -1 || fim <= inicio) return null;
  try {
    return JSON.parse(semCercas.slice(inicio, fim + 1));
  } catch {
    return null;
  }
}

export function parsearVeredito(texto: string): VeredictoIA | null {
  const json = extrairJson(texto);
  if (typeof json !== "object" || json === null) return null;

  const bruto = (json as Record<string, unknown>).veredito;
  if (typeof bruto !== "string") return null;
  const veredito = bruto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (veredito !== "aprovado" && veredito !== "suspeito") return null;

  const motivo = (json as Record<string, unknown>).motivo;
  return {
    veredito,
    motivo: typeof motivo === "string" ? motivo.trim() : "",
  };
}
