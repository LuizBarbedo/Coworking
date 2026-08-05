import { describe, expect, it } from "vitest";
import { avaliarHeartbeats, type Heartbeat } from "./ops-saude";

// Cron: backup 03:30, espelho 04:00 — janela de 26h cobre o dia com folga.
const agora = new Date("2026-08-06T12:00:00Z");

const recente = (id: string, ok = true, detalhes: string | null = null): Heartbeat => ({
  id,
  ok,
  detalhes,
  atualizado_em: "2026-08-06T06:30:00Z", // ~5h30 atrás
});

describe("avaliarHeartbeats", () => {
  it("rotina recente e ok fica ok", () => {
    const [backup] = avaliarHeartbeats(
      [recente("backup-banco", true, "215000 bytes")],
      agora,
    );
    expect(backup).toMatchObject({
      id: "backup-banco",
      rotulo: "Backup diário",
      estado: "ok",
      detalhes: "215000 bytes",
    });
  });

  it("rotina que gravou falha fica falhou", () => {
    const saida = avaliarHeartbeats(
      [recente("espelho-nuvem", false, "falhou na etapa: storage")],
      agora,
    );
    const espelho = saida.find((s) => s.id === "espelho-nuvem");
    expect(espelho?.estado).toBe("falhou");
  });

  it("batimento com mais de 26h fica atrasado mesmo se ok", () => {
    const velho: Heartbeat = {
      id: "backup-banco",
      ok: true,
      detalhes: null,
      atualizado_em: "2026-08-05T03:30:00Z", // ~32h atrás
    };
    expect(avaliarHeartbeats([velho], agora)[0]?.estado).toBe("atrasado");
  });

  it("rotina sem registro aparece como sem-registro", () => {
    const saida = avaliarHeartbeats([], agora);
    expect(saida).toHaveLength(2);
    expect(saida.every((s) => s.estado === "sem-registro")).toBe(true);
  });

  it("sempre devolve as rotinas conhecidas, na mesma ordem", () => {
    const saida = avaliarHeartbeats([recente("espelho-nuvem")], agora);
    expect(saida.map((s) => s.id)).toEqual(["backup-banco", "espelho-nuvem"]);
  });
});
