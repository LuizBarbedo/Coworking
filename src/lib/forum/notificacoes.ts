import "server-only";

// Notificações por e-mail do fórum — sempre best-effort: falha de e-mail
// nunca derruba a ação que a disparou.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enviarEmailForum } from "@/lib/email";

async function dadosDoUsuario(
  id: string,
): Promise<{ nome: string; email: string } | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.getUserById(id);
  const usuario = data?.user;
  if (!usuario?.email) return null;
  return {
    nome:
      (usuario.user_metadata as { nome?: string })?.nome?.split(" ")[0] ??
      "colega",
    email: usuario.email,
  };
}

function linkDoPost(postId: string): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://coworkingsocial.com.br";
  return `${site}/forum/${postId}`;
}

/** Avisa o autor que a publicação saiu da análise e está no ar. */
export async function notificarPostAprovado(postId: string): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: post } = await admin
      .from("forum_posts")
      .select("autor_id, titulo")
      .eq("id", postId)
      .single();
    if (!post) return;
    const autor = await dadosDoUsuario(post.autor_id);
    if (!autor) return;
    await enviarEmailForum({
      ...autor,
      assunto: "Sua publicação foi aprovada",
      corpo: `Sua publicação "${post.titulo}" foi aprovada e já está no ar no fórum.`,
      link: linkDoPost(postId),
    });
  } catch {
    // silencioso: notificação nunca quebra a moderação
  }
}

/** Avisa o autor do post que chegou resposta nova (aprovada). */
export async function notificarNovaResposta(
  postId: string,
  autorRespostaId: string,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: post } = await admin
      .from("forum_posts")
      .select("autor_id, titulo")
      .eq("id", postId)
      .single();
    if (!post || post.autor_id === autorRespostaId) return;
    const autor = await dadosDoUsuario(post.autor_id);
    if (!autor) return;
    await enviarEmailForum({
      ...autor,
      assunto: "Sua dúvida recebeu uma resposta",
      corpo: `Sua publicação "${post.titulo}" recebeu uma resposta nova no fórum.`,
      link: linkDoPost(postId),
    });
  } catch {
    // silencioso
  }
}
