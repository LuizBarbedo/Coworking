"use server";

// Actions do fórum do aluno. Publicação (post/resposta) nasce pendente com
// o cliente do usuário (RLS garante), passa pelo moderador IA inline e o
// veredito é gravado com o admin client — aluno nunca escreve status.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAluno } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { moderarConteudo } from "@/lib/forum/moderacao";
import { notificarNovaResposta } from "@/lib/forum/notificacoes";
import { validarPost, validarResposta } from "@/lib/forum/validar-post";
import { podePostar } from "@/lib/forum/rate-limit";

export type ForumState = { error: string } | undefined;

const UMA_HORA_MS = 60 * 60 * 1000;

/** Publicações do aluno na última hora (posts + respostas, qualquer status). */
async function contarPublicacoesRecentes(alunoId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const desde = new Date(Date.now() - UMA_HORA_MS).toISOString();
  const [posts, respostas] = await Promise.all([
    admin
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .eq("autor_id", alunoId)
      .gte("created_at", desde),
    admin
      .from("forum_respostas")
      .select("id", { count: "exact", head: true })
      .eq("autor_id", alunoId)
      .gte("created_at", desde),
  ]);
  return (posts.count ?? 0) + (respostas.count ?? 0);
}

/** Grava o veredito da IA — aprovação automática só quando ela aprovar. */
async function aplicarVeredito(
  tabela: "forum_posts" | "forum_respostas",
  id: string,
  veredito: { veredito: "aprovado" | "suspeito" | "erro"; motivo: string },
) {
  const admin = createSupabaseAdminClient();
  await admin
    .from(tabela)
    .update({
      status: veredito.veredito === "aprovado" ? "aprovado" : "pendente",
      veredito_ia: veredito.veredito,
      motivo_ia: veredito.motivo,
    })
    .eq("id", id);
}

export async function criarPost(
  _prev: ForumState,
  formData: FormData,
): Promise<ForumState> {
  const aluno = await exigirAluno();

  const tipo = formData.get("tipo") === "enquete" ? "enquete" : "duvida";
  const titulo = String(formData.get("titulo") ?? "").trim();
  const corpo = String(formData.get("corpo") ?? "").trim() || null;
  const disciplinaId = String(formData.get("disciplinaId") ?? "") || null;
  const opcoes = formData
    .getAll("opcoes")
    .map((o) => String(o).trim())
    .filter(Boolean);

  // Pré-checagens baratas antes de gastar uma chamada de IA.
  const invalido = validarPost({ tipo, titulo, corpo, opcoes });
  if (invalido) return { error: invalido };
  if (!podePostar(await contarPublicacoesRecentes(aluno.id))) {
    return { error: "Calma lá! Você atingiu o limite de publicações por hora." };
  }

  const supabase = await createSupabaseServerClient();

  // Duplicata exata recente do próprio aluno (o RLS devolve os próprios).
  const { data: repetido } = await supabase
    .from("forum_posts")
    .select("id")
    .eq("autor_id", aluno.id)
    .eq("titulo", titulo)
    .gte("created_at", new Date(Date.now() - 24 * UMA_HORA_MS).toISOString())
    .limit(1);
  if (repetido && repetido.length > 0) {
    return { error: "Você já publicou um post com esse título hoje." };
  }

  // Disciplina (se houver): o RLS só devolve publicada — valida e dá o
  // título pro contexto da moderação.
  let disciplinaTitulo: string | null = null;
  if (disciplinaId) {
    const { data: disciplina } = await supabase
      .from("disciplinas")
      .select("titulo")
      .eq("id", disciplinaId)
      .single();
    if (!disciplina) return { error: "Disciplina inválida." };
    disciplinaTitulo = disciplina.titulo;
  }

  const { data: post, error } = await supabase
    .from("forum_posts")
    .insert({
      autor_id: aluno.id,
      disciplina_id: disciplinaId,
      tipo,
      titulo,
      corpo,
    })
    .select("id")
    .single();
  if (error || !post) {
    return { error: "Não foi possível publicar. Tente de novo." };
  }

  if (tipo === "enquete") {
    const { error: erroOpcoes } = await supabase
      .from("forum_enquete_opcoes")
      .insert(
        opcoes.map((texto, ordem) => ({ post_id: post.id, texto, ordem })),
      );
    if (erroOpcoes) {
      await createSupabaseAdminClient()
        .from("forum_posts")
        .delete()
        .eq("id", post.id);
      return { error: "Não foi possível salvar as opções da enquete." };
    }
  }

  const veredito = await moderarConteudo({
    titulo,
    corpo,
    opcoes,
    disciplinaTitulo,
  });
  await aplicarVeredito("forum_posts", post.id, veredito);

  revalidatePath("/forum");
  redirect(`/forum/${post.id}`);
}

export async function criarResposta(
  _prev: ForumState,
  formData: FormData,
): Promise<ForumState> {
  const aluno = await exigirAluno();
  const postId = String(formData.get("postId") ?? "");
  const corpo = String(formData.get("corpo") ?? "").trim();

  if (!postId) return { error: "Post inválido." };
  const invalido = validarResposta(corpo);
  if (invalido) return { error: invalido };
  if (!podePostar(await contarPublicacoesRecentes(aluno.id))) {
    return { error: "Calma lá! Você atingiu o limite de publicações por hora." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: post } = await supabase
    .from("forum_posts")
    .select("titulo, disciplina_id, disciplinas ( titulo )")
    .eq("id", postId)
    .single();
  if (!post) return { error: "Post não encontrado." };

  const { data: resposta, error } = await supabase
    .from("forum_respostas")
    .insert({ post_id: postId, autor_id: aluno.id, corpo })
    .select("id")
    .single();
  if (error || !resposta) {
    return { error: "Não foi possível enviar a resposta." };
  }

  // A relação vem sem tipo do supabase-js — objeto único por FK.
  const disciplina = post.disciplinas as unknown as { titulo: string } | null;
  const veredito = await moderarConteudo({
    titulo: `Resposta em: ${post.titulo}`,
    corpo,
    disciplinaTitulo: disciplina?.titulo ?? null,
  });
  await aplicarVeredito("forum_respostas", resposta.id, veredito);
  if (veredito.veredito === "aprovado") {
    await notificarNovaResposta(postId, aluno.id);
  }

  revalidatePath(`/forum/${postId}`);
  return undefined;
}

/**
 * Recurso do autor: edita um post rejeitado e reenvia pra moderação —
 * volta a pendente e passa pela IA de novo. Escrita via service_role
 * (aluno não tem policy de update), com a autoria checada aqui.
 */
export async function reenviarPost(
  _prev: ForumState,
  formData: FormData,
): Promise<ForumState> {
  const aluno = await exigirAluno();
  const postId = String(formData.get("postId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const corpo = String(formData.get("corpo") ?? "").trim() || null;
  if (!postId) return { error: "Post inválido." };

  const admin = createSupabaseAdminClient();
  const { data: post } = await admin
    .from("forum_posts")
    .select("autor_id, status, tipo, disciplina_id, disciplinas ( titulo )")
    .eq("id", postId)
    .single();
  if (!post || post.autor_id !== aluno.id) {
    return { error: "Post não encontrado." };
  }
  if (post.status !== "rejeitado") {
    return { error: "Só publicações rejeitadas podem ser reenviadas." };
  }

  const tipo = post.tipo as "duvida" | "enquete";
  const { data: opcoesAtuais } = await admin
    .from("forum_enquete_opcoes")
    .select("texto")
    .eq("post_id", postId)
    .order("ordem", { ascending: true });
  const opcoes = (opcoesAtuais ?? []).map((o) => o.texto as string);

  const invalido = validarPost({ tipo, titulo, corpo, opcoes });
  if (invalido) return { error: invalido };
  if (!podePostar(await contarPublicacoesRecentes(aluno.id))) {
    return { error: "Calma lá! Você atingiu o limite de publicações por hora." };
  }

  const { error } = await admin
    .from("forum_posts")
    .update({
      titulo,
      corpo,
      status: "pendente",
      veredito_ia: null,
      motivo_ia: null,
      moderado_por: null,
      moderado_em: null,
      motivo_rejeicao: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);
  if (error) return { error: "Não foi possível reenviar. Tente de novo." };

  const disciplina = post.disciplinas as unknown as { titulo: string } | null;
  const veredito = await moderarConteudo({
    titulo,
    corpo,
    opcoes,
    disciplinaTitulo: disciplina?.titulo ?? null,
  });
  await aplicarVeredito("forum_posts", postId, veredito);

  revalidatePath(`/forum/${postId}`);
  revalidatePath("/forum");
  return undefined;
}

export async function alternarVotoPost(
  _prev: ForumState,
  formData: FormData,
): Promise<ForumState> {
  const aluno = await exigirAluno();
  const postId = String(formData.get("postId") ?? "");
  if (!postId) return { error: "Post inválido." };

  const supabase = await createSupabaseServerClient();
  const { data: existente } = await supabase
    .from("forum_votos_posts")
    .select("post_id")
    .eq("post_id", postId)
    .eq("aluno_id", aluno.id)
    .maybeSingle();

  const { error } = existente
    ? await supabase
        .from("forum_votos_posts")
        .delete()
        .eq("post_id", postId)
        .eq("aluno_id", aluno.id)
    : await supabase
        .from("forum_votos_posts")
        .insert({ post_id: postId, aluno_id: aluno.id });
  if (error) return { error: "Não foi possível registrar o voto." };

  revalidatePath(`/forum/${postId}`);
  revalidatePath("/forum");
  return undefined;
}

export async function alternarVotoResposta(
  _prev: ForumState,
  formData: FormData,
): Promise<ForumState> {
  const aluno = await exigirAluno();
  const respostaId = String(formData.get("respostaId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  if (!respostaId) return { error: "Resposta inválida." };

  const supabase = await createSupabaseServerClient();
  const { data: existente } = await supabase
    .from("forum_votos_respostas")
    .select("resposta_id")
    .eq("resposta_id", respostaId)
    .eq("aluno_id", aluno.id)
    .maybeSingle();

  const { error } = existente
    ? await supabase
        .from("forum_votos_respostas")
        .delete()
        .eq("resposta_id", respostaId)
        .eq("aluno_id", aluno.id)
    : await supabase
        .from("forum_votos_respostas")
        .insert({ resposta_id: respostaId, aluno_id: aluno.id });
  if (error) return { error: "Não foi possível registrar o voto." };

  if (postId) revalidatePath(`/forum/${postId}`);
  return undefined;
}

export async function votarEnquete(
  _prev: ForumState,
  formData: FormData,
): Promise<ForumState> {
  const aluno = await exigirAluno();
  const postId = String(formData.get("postId") ?? "");
  const opcaoId = String(formData.get("opcaoId") ?? "");
  if (!postId || !opcaoId) return { error: "Escolha uma opção." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("forum_votos_enquete").insert({
    post_id: postId,
    opcao_id: opcaoId,
    aluno_id: aluno.id,
  });
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Você já votou nesta enquete — o voto é definitivo."
          : "Não foi possível registrar o voto.",
    };
  }

  revalidatePath(`/forum/${postId}`);
  return undefined;
}

export async function marcarSolucao(
  _prev: ForumState,
  formData: FormData,
): Promise<ForumState> {
  const aluno = await exigirAluno();
  const postId = String(formData.get("postId") ?? "");
  const respostaId = String(formData.get("respostaId") ?? "");
  if (!postId || !respostaId) return { error: "Resposta inválida." };

  const admin = createSupabaseAdminClient();
  const [{ data: post }, { data: resposta }] = await Promise.all([
    admin.from("forum_posts").select("autor_id").eq("id", postId).single(),
    admin
      .from("forum_respostas")
      .select("post_id, status")
      .eq("id", respostaId)
      .single(),
  ]);
  if (!post || post.autor_id !== aluno.id) {
    return { error: "Só o autor do post marca a solução." };
  }
  if (!resposta || resposta.post_id !== postId || resposta.status !== "aprovado") {
    return { error: "Resposta inválida." };
  }

  const { error } = await admin
    .from("forum_posts")
    .update({ resposta_solucao_id: respostaId })
    .eq("id", postId);
  if (error) return { error: "Não foi possível marcar a solução." };

  revalidatePath(`/forum/${postId}`);
  return undefined;
}
