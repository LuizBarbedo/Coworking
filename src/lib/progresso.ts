import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type Resumo = { feitas: number; total: number; pct: number };

/** Monta um resumo de progresso a partir de contagens já apuradas. */
export function resumo(feitas: number, total: number): Resumo {
  const pct = total > 0 ? Math.round((feitas / total) * 100) : 0;
  return { feitas, total, pct };
}

export type ProgressoCurso = {
  aulas: Resumo;
  quizzesTotal: number;
  quizzesAprovados: number;
  /** Regra dos 70%: assistir ≥70% das aulas E ser aprovado em todos os quizzes. */
  aprovadoParaDeclaracao: boolean;
};

/**
 * Progresso agregado do aluno logado sobre todo o conteúdo publicado.
 * Conta apenas o que o RLS deixa a sessão do aluno enxergar:
 *   - aulas: policy exige disciplina + módulo publicados;
 *   - progresso_aula / quiz_tentativas: escopadas por auth.uid();
 *   - quizzes: filtrados pelas disciplinas publicadas (RLS de quizzes é aberta).
 */
export async function getProgressoCurso(
  supabase: ServerClient,
): Promise<ProgressoCurso> {
  const [{ data: aulas }, { data: progresso }, { data: disciplinas }] =
    await Promise.all([
      supabase.from("aulas").select("id"),
      supabase.from("progresso_aula").select("aula_id"),
      supabase.from("disciplinas").select("id"),
    ]);

  const aulaIds = new Set((aulas ?? []).map((a) => a.id as string));
  const totalAulas = aulaIds.size;
  const feitas = (progresso ?? []).filter((p) =>
    aulaIds.has(p.aula_id as string),
  ).length;

  const discIds = (disciplinas ?? []).map((d) => d.id as string);

  let quizzesTotal = 0;
  let quizzesAprovados = 0;
  if (discIds.length > 0) {
    const [{ data: quizzes }, { data: tentativas }] = await Promise.all([
      supabase.from("quizzes").select("id").in("disciplina_id", discIds),
      supabase.from("quiz_tentativas").select("quiz_id").eq("aprovado", true),
    ]);
    const quizIds = new Set((quizzes ?? []).map((q) => q.id as string));
    quizzesTotal = quizIds.size;
    const aprovados = new Set(
      (tentativas ?? [])
        .map((t) => t.quiz_id as string)
        .filter((id) => quizIds.has(id)),
    );
    quizzesAprovados = aprovados.size;
  }

  const aulasResumo = resumo(feitas, totalAulas);
  const aprovadoParaDeclaracao =
    totalAulas > 0 &&
    aulasResumo.pct >= 70 &&
    quizzesTotal > 0 &&
    quizzesAprovados === quizzesTotal;

  return {
    aulas: aulasResumo,
    quizzesTotal,
    quizzesAprovados,
    aprovadoParaDeclaracao,
  };
}
