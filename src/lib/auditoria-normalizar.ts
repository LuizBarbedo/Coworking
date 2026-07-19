// Normalização pura dos eventos de auditoria (testável sem IO).
// A gravação em si fica em lib/auditoria.ts (server-only).

export type EventoBruto = {
  acao: string;
  atorId?: string | null;
  atorPapel?: "aluno" | "equipe" | "sistema";
  alvoTipo?: string | null;
  alvoId?: string | null;
  detalhes?: Record<string, unknown> | null;
};

export type EventoNormalizado = {
  ator_id: string | null;
  ator_papel: string;
  acao: string;
  alvo_tipo: string | null;
  alvo_id: string | null;
  detalhes: Record<string, unknown> | null;
};

const ACAO_VALIDA = /^[a-z_]+\.[a-z_]+$/;
const MAX_DETALHES = 2000;

export function normalizarEvento(bruto: EventoBruto): EventoNormalizado | null {
  if (!ACAO_VALIDA.test(bruto.acao)) return null;

  let detalhes = bruto.detalhes ?? null;
  if (detalhes && JSON.stringify(detalhes).length > MAX_DETALHES) {
    // corta campos texto longos em vez de perder o evento
    detalhes = Object.fromEntries(
      Object.entries(detalhes).map(([k, v]) => [
        k,
        typeof v === "string" ? v.slice(0, 200) : v,
      ]),
    );
    if (JSON.stringify(detalhes).length > MAX_DETALHES) {
      detalhes = { resumo: "detalhes grandes demais — truncados" };
    }
  }

  return {
    ator_id: bruto.atorId ?? null,
    ator_papel: bruto.atorPapel ?? "aluno",
    acao: bruto.acao,
    alvo_tipo: bruto.alvoTipo ?? null,
    alvo_id: bruto.alvoId ?? null,
    detalhes,
  };
}
