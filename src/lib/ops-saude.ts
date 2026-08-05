// Avaliação pura dos batimentos da operação (tabela ops_heartbeats, 0025).
// O card do Início busca as linhas e esta função decide o estado de cada
// rotina conhecida — inclusive das que nunca gravaram nada.

export type Heartbeat = {
  id: string;
  ok: boolean;
  detalhes: string | null;
  atualizado_em: string;
};

export type EstadoBatimento = "ok" | "atrasado" | "falhou" | "sem-registro";

export type BatimentoAvaliado = {
  id: string;
  rotulo: string;
  estado: EstadoBatimento;
  detalhes: string | null;
  atualizadoEm: string | null;
};

/** Rotinas do cron que devem bater todo dia (backup 03:30, espelho 04:00). */
const ROTINAS: Array<[string, string]> = [
  ["backup-banco", "Backup diário"],
  ["espelho-nuvem", "Espelho pra nuvem"],
];

/** Cadência diária + folga: mais velho que isso é cron parado. */
const LIMITE_ATRASO_MS = 26 * 60 * 60 * 1000;

export function avaliarHeartbeats(
  registros: Heartbeat[],
  agora: Date = new Date(),
): BatimentoAvaliado[] {
  return ROTINAS.map(([id, rotulo]) => {
    const registro = registros.find((r) => r.id === id);
    if (!registro) {
      return { id, rotulo, estado: "sem-registro" as const, detalhes: null, atualizadoEm: null };
    }
    const idade = agora.getTime() - new Date(registro.atualizado_em).getTime();
    const estado: EstadoBatimento = !registro.ok
      ? "falhou"
      : idade > LIMITE_ATRASO_MS || Number.isNaN(idade)
        ? "atrasado"
        : "ok";
    return {
      id,
      rotulo,
      estado,
      detalhes: registro.detalhes,
      atualizadoEm: registro.atualizado_em,
    };
  });
}
