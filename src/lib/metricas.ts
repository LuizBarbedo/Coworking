import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PontoSerie = { dia: string; total: number };

export type OrigemAgregada = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  total: number;
};

export type Metricas = {
  total: number;
  hoje: number;
  semana: number;
  ultima: string | null;
  serie: PontoSerie[];
  /** Ausente enquanto a migração 0012 não for aplicada. */
  origens?: OrigemAgregada[];
};

/**
 * Busca as métricas agregadas das inscrições via RPC metricas_painel().
 * Roda com o cliente administrativo (service_role) no servidor: a tabela
 * inscricoes tem RLS e não é legível pelo público. Só números agregados
 * trafegam — nenhum dado pessoal.
 */
export async function obterMetricas(dias = 30): Promise<Metricas> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("metricas_painel", { p_dias: dias });

  if (error) {
    throw new Error(`Falha ao carregar métricas do painel: ${error.message}`);
  }

  return data as Metricas;
}
