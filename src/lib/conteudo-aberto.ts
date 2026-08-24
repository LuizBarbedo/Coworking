import "server-only";

// Conteúdo que já está no ar para uma turma, montado do banco para entrar no
// e-mail de convite. Mesmo princípio do aviso de módulo novo: nenhum título de
// módulo mora no código — mudar o calendário da turma não pede deploy.
//
// Best-effort e isolado dos fluxos: qualquer erro (migração 0026 pendente,
// service_role ausente num build fora da VPS) devolve vazio e o convite sai
// sem a lista de aulas, nunca com a lista errada.

import { montarResumoModulo } from "@/lib/avisos-modulos";
import {
  modulosAbertosDaTurma,
  type ConteudoDoConvite,
} from "@/lib/convite-conteudo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const VAZIO: ConteudoDoConvite = { modulos: [], totalDoCurso: 0 };

/**
 * Módulos abertos para a turma (com disciplinas e contagem de aulas) e o total
 * de módulos publicados no curso — é o total que diz se ainda falta abrir algo.
 * `turma` nulo (migração 0023 pendente) cai no regime sem restrição: vale o
 * que está publicado, que era o comportamento anterior.
 */
export async function buscarConteudoAbertoDaTurma(
  turma: number | null | undefined,
): Promise<ConteudoDoConvite> {
  try {
    const admin = createSupabaseAdminClient();

    const [turmas, modulos, disciplinas, aulas] = await Promise.all([
      admin.from("turmas").select("*"),
      admin.from("modulos").select("id, titulo, ordem, publicado").order("ordem"),
      admin
        .from("disciplinas")
        .select("id, modulo_id, titulo, ordem, publicado")
        .order("ordem"),
      admin.from("aulas").select("id, disciplina_id"),
    ]);
    if (modulos.error || disciplinas.error || aulas.error) return VAZIO;

    const dela = (turmas.data ?? []).find(
      (t) => Number((t as { numero: number }).numero) === turma,
    ) as { conteudo_restrito?: boolean | null } | undefined;
    const conteudoRestrito = Boolean(dela?.conteudo_restrito);

    const plano =
      conteudoRestrito && turma != null
        ? ((
            await admin
              .from("turma_modulos")
              .select("modulo_id, liberacao_em")
              .eq("turma", turma)
          ).data ?? [])
        : [];

    const publicados = ((modulos.data ?? []) as Array<{
      id: string;
      titulo: string;
      ordem: number;
      publicado: boolean;
    }>).filter((m) => m.publicado);

    const abertos = modulosAbertosDaTurma({
      conteudoRestrito,
      modulos: publicados,
      plano: plano as Array<{ modulo_id: string; liberacao_em: string | null }>,
    });

    const aulasPorDisciplina: Record<string, number> = {};
    for (const aula of aulas.data ?? []) {
      const chave = String((aula as { disciplina_id: string }).disciplina_id);
      aulasPorDisciplina[chave] = (aulasPorDisciplina[chave] ?? 0) + 1;
    }

    return {
      totalDoCurso: publicados.length,
      modulos: abertos.map((modulo) =>
        montarResumoModulo({
          modulo,
          disciplinas: (disciplinas.data ?? []).filter(
            (d) => (d as { modulo_id: string }).modulo_id === modulo.id,
          ) as Array<{ id: string; titulo: string; ordem: number; publicado: boolean }>,
          aulasPorDisciplina,
        }),
      ),
    };
  } catch {
    return VAZIO;
  }
}
