import "server-only";

// Leituras agregadas do fórum (service_role): nomes de autores e contagens.
// Ficam no servidor — quem votou em quê nunca chega ao cliente.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { lerSessaoEquipe } from "@/lib/permissoes";

/** Nome de exibição de cada autor (user_metadata.nome, com fallback). */
export async function nomesDosAutores(
  ids: string[],
): Promise<Map<string, string>> {
  const admin = createSupabaseAdminClient();
  const unicos = [...new Set(ids)];
  const nomes = new Map<string, string>();
  await Promise.all(
    unicos.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const nome =
        (data?.user?.user_metadata as { nome?: string })?.nome ??
        data?.user?.email ??
        "Aluno(a)";
      nomes.set(id, nome.split(" ").slice(0, 2).join(" "));
    }),
  );
  return nomes;
}

export type AutorPerfil = {
  nome: string;
  avatarUrl: string | null;
  /** Membro da equipe (admin/monitor) — ganha o selo "Equipe" no fórum. */
  equipe: boolean;
};

/** Nome, foto e vínculo com a equipe de cada autor do lote. */
export async function autoresComPerfil(
  ids: string[],
): Promise<Map<string, AutorPerfil>> {
  const unicos = [...new Set(ids)];
  const admin = createSupabaseAdminClient();
  const [contas, perfis] = await Promise.all([
    Promise.all(unicos.map((id) => admin.auth.admin.getUserById(id))),
    admin.from("perfis").select("aluno_id, avatar_url").in("aluno_id", unicos),
  ]);
  const fotos = new Map(
    (perfis.data ?? []).map((p) => [
      p.aluno_id as string,
      (p.avatar_url as string | null) ?? null,
    ]),
  );
  const resultado = new Map<string, AutorPerfil>();
  unicos.forEach((id, i) => {
    const usuario = contas[i]?.data?.user;
    const nome =
      (usuario?.user_metadata as { nome?: string })?.nome ??
      usuario?.email ??
      "Aluno(a)";
    resultado.set(id, {
      nome: nome.split(" ").slice(0, 2).join(" "),
      avatarUrl: fotos.get(id) ?? null,
      equipe: lerSessaoEquipe(usuario?.app_metadata) !== null,
    });
  });
  return resultado;
}

export type ContagemPost = { votos: number; respostas: number };

/** Votos "útil" e respostas aprovadas por post. */
export async function contagensDosPosts(
  postIds: string[],
): Promise<Map<string, ContagemPost>> {
  const contagens = new Map<string, ContagemPost>();
  if (postIds.length === 0) return contagens;
  const admin = createSupabaseAdminClient();

  const [{ data: votos }, { data: respostas }] = await Promise.all([
    admin.from("forum_votos_posts").select("post_id").in("post_id", postIds),
    admin
      .from("forum_respostas")
      .select("post_id")
      .eq("status", "aprovado")
      .in("post_id", postIds),
  ]);

  for (const id of postIds) contagens.set(id, { votos: 0, respostas: 0 });
  for (const v of votos ?? []) {
    contagens.get(v.post_id as string)!.votos += 1;
  }
  for (const r of respostas ?? []) {
    contagens.get(r.post_id as string)!.respostas += 1;
  }
  return contagens;
}

/** Votos "útil" por resposta. */
export async function votosDasRespostas(
  respostaIds: string[],
): Promise<Map<string, number>> {
  const votos = new Map<string, number>();
  if (respostaIds.length === 0) return votos;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("forum_votos_respostas")
    .select("resposta_id")
    .in("resposta_id", respostaIds);
  for (const id of respostaIds) votos.set(id, 0);
  for (const v of data ?? []) {
    votos.set(v.resposta_id as string, (votos.get(v.resposta_id as string) ?? 0) + 1);
  }
  return votos;
}

/** Votos da enquete agrupados por opção. */
export async function votosDaEnquete(
  postId: string,
): Promise<Map<string, number>> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("forum_votos_enquete")
    .select("opcao_id")
    .eq("post_id", postId);
  const votos = new Map<string, number>();
  for (const v of data ?? []) {
    votos.set(v.opcao_id as string, (votos.get(v.opcao_id as string) ?? 0) + 1);
  }
  return votos;
}
