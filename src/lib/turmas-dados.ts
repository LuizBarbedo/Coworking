import "server-only";

// Consultas de turma (service_role — a tabela turmas não tem policy de
// leitura). Tudo best-effort e SEPARADO das queries principais dos fluxos:
// antes da migração 0023 a tabela/coluna não existem e estas funções devolvem
// vazio/null, que os chamadores tratam como "liberado" (comportamento atual).
// Embutir a coluna nova numa query crítica derrubaria a query inteira.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Turma } from "@/lib/turmas";
import type { LinhaPlano } from "@/lib/liberacao-modulos";

export async function buscarTurmas(): Promise<Turma[]> {
  try {
    const admin = createSupabaseAdminClient();
    // "*" tolera ambientes sem a migração 0026 (conteudo_restrito vem como
    // undefined e o gate de módulo simplesmente não morde).
    const { data, error } = await admin
      .from("turmas")
      .select("*")
      .order("numero", { ascending: true });
    if (error) return [];
    return (data as Turma[] | null) ?? [];
  } catch {
    // Sem env do service_role (ex.: build fora da VPS): a landing e os
    // fluxos seguem sem aviso de turma.
    return [];
  }
}

/**
 * Plano de liberação de módulos de uma turma (migração 0026). Antes dela a
 * tabela não existe → lista vazia, que os chamadores tratam como "sem plano".
 */
export async function buscarPlanoDaTurma(
  numero: number,
): Promise<LinhaPlano[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("turma_modulos")
      .select("modulo_id, liberacao_em")
      .eq("turma", numero);
    if (error) return [];
    return (data as LinhaPlano[] | null) ?? [];
  } catch {
    return [];
  }
}

/**
 * Turma do aluno logado + plano dela, pelo e-mail da conta (mesmo vínculo do
 * RLS). Serve só para ANUNCIAR "Em breve · 24/08 às 8h" no painel — quem
 * esconde o conteúdo é o banco.
 */
export async function buscarLiberacaoDoAluno(email: string | null | undefined): Promise<{
  restrito: boolean;
  plano: LinhaPlano[];
}> {
  const vazio = { restrito: false, plano: [] as LinhaPlano[] };
  if (!email) return vazio;
  try {
    const admin = createSupabaseAdminClient();
    const padrao = email.replace(/([\\%_])/g, "\\$1");
    const { data, error } = await admin
      .from("inscricoes")
      .select("turma")
      .ilike("email", padrao)
      .maybeSingle();
    const turma = error ? null : ((data?.turma as number | null) ?? null);
    if (turma == null) return vazio;

    const turmas = await buscarTurmas();
    const dela = turmas.find((t) => t.numero === turma);
    if (!dela?.conteudo_restrito) return vazio;

    return { restrito: true, plano: await buscarPlanoDaTurma(turma) };
  } catch {
    return vazio;
  }
}

export async function buscarTurmaPorNumero(numero: number): Promise<Turma | null> {
  const turmas = await buscarTurmas();
  return turmas.find((t) => t.numero === numero) ?? null;
}

/** Turma da inscrição via embed da FK; null se a 0023 ainda não foi aplicada. */
export async function buscarTurmaDaInscricao(
  inscricaoId: string,
): Promise<Turma | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("inscricoes")
    .select("turmas(numero, nome, liberacao_em)")
    .eq("id", inscricaoId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.turmas as unknown as Turma | null) ?? null;
}

/**
 * Inscrição recém-criada + turma, pela matrícula (fluxo da landing). Antes
 * da 0023 o embed falha → null, e a inscrição segue o fluxo antigo.
 */
export async function buscarInscricaoComTurmaPorMatricula(
  matricula: string,
): Promise<{ id: string; turma: Turma | null } | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("inscricoes")
    .select("id, turmas(numero, nome, liberacao_em)")
    .eq("matricula", matricula)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    turma: (data.turmas as unknown as Turma | null) ?? null,
  };
}

/**
 * Inscrição + turma pelo e-mail (pro fluxo de erro do login). O e-mail no
 * banco pode ter caixa mista (formulário antigo não normalizava) — busca
 * case-insensitive com curingas escapados.
 */
export async function buscarInscricaoPorEmail(email: string): Promise<{
  selecionado: boolean;
  ativadoEm: string | null;
  turma: Turma | null;
} | null> {
  const admin = createSupabaseAdminClient();
  const padrao = email.replace(/([\\%_])/g, "\\$1");
  const { data, error } = await admin
    .from("inscricoes")
    .select("selecionado, ativado_em, turmas(numero, nome, liberacao_em)")
    .ilike("email", padrao)
    .maybeSingle();
  if (error || !data) return null;
  return {
    selecionado: Boolean(data.selecionado),
    ativadoEm: (data.ativado_em as string | null) ?? null,
    turma: (data.turmas as unknown as Turma | null) ?? null,
  };
}
