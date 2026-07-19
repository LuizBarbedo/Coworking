// Datas do agendamento de publicação. O input datetime-local não carrega
// fuso; a convenção da plataforma é o horário de Brasília (America/Sao_Paulo,
// UTC-3 fixo desde o fim do horário de verão em 2019).

const FORMATO_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** "2026-07-20T08:00" (Brasília) → "2026-07-20T08:00:00-03:00" (ou null). */
export function timestampDeSaoPaulo(valor: string): string | null {
  const limpo = valor.trim();
  if (!FORMATO_LOCAL.test(limpo)) return null;
  return `${limpo}:00-03:00`;
}

/** timestamptz → valor pro input datetime-local, já em Brasília. */
export function paraInputLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
  return partes.replace(" ", "T");
}
