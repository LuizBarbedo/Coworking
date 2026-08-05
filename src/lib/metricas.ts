import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PontoSerie = {
  dia: string;
  total: number;
  /** Visitas do dia — ausente enquanto a migração 0014 não for aplicada. */
  visitas?: number;
};

export type OrigemAgregada = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  total: number;
  /** Visitas do período — ausente enquanto a migração 0013 não for aplicada. */
  visitas?: number;
};

export type Metricas = {
  total: number;
  hoje: number;
  semana: number;
  /** Inscrições de ontem — ausente enquanto a migração 0014 não for aplicada. */
  ontem?: number;
  /** Inscrições de 8 a 14 dias atrás — ausente antes da migração 0014. */
  semana_anterior?: number;
  ultima: string | null;
  serie: PontoSerie[];
  /** Ausente enquanto a migração 0012 não for aplicada. */
  origens?: OrigemAgregada[];
  /** Total de visitas do período — ausente antes da migração 0013. */
  visitas_periodo?: number;
};

/**
 * Busca as métricas agregadas das inscrições via RPC metricas_painel().
 * Roda com o cliente administrativo (service_role) no servidor: a tabela
 * inscricoes tem RLS e não é legível pelo público. Só números agregados
 * trafegam — nenhum dado pessoal.
 *
 * Com `turma`, o recorte é feito na RPC (migração 0024); se ela ainda não
 * foi aplicada (PGRST202) ou o cache do PostgREST está ambíguo (PGRST203),
 * refaz sem o filtro — a visão volta ao total, sem quebrar.
 */
export async function obterMetricas(
  dias = 30,
  turma: number | null = null,
): Promise<Metricas> {
  const admin = createSupabaseAdminClient();

  if (turma !== null) {
    const { data, error } = await admin.rpc("metricas_painel", {
      p_dias: dias,
      p_turma: turma,
    });
    if (!error) return data as Metricas;
    if (error.code !== "PGRST202" && error.code !== "PGRST203") {
      throw new Error(`Falha ao carregar métricas do painel: ${error.message}`);
    }
  }

  const { data, error } = await admin.rpc("metricas_painel", { p_dias: dias });

  if (error) {
    throw new Error(`Falha ao carregar métricas do painel: ${error.message}`);
  }

  return data as Metricas;
}
