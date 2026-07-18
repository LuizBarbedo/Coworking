"use server";

// Caixa de moderação humana do fórum: aprovar/rejeitar o que a IA marcou
// como suspeito (ou não conseguiu avaliar). Exige a permissão moderar_forum.

import { revalidatePath } from "next/cache";
import { exigirPermissao } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ModeracaoState = { ok: string } | { error: string } | undefined;

type ItemForum = { tipo: "post" | "resposta"; id: string };

function lerItem(formData: FormData): ItemForum | null {
  const tipo = formData.get("tipo");
  const id = String(formData.get("id") ?? "");
  if ((tipo !== "post" && tipo !== "resposta") || !id) return null;
  return { tipo, id };
}

const TABELAS = {
  post: "forum_posts",
  resposta: "forum_respostas",
} as const;

async function moderar(
  formData: FormData,
  status: "aprovado" | "rejeitado",
): Promise<ModeracaoState> {
  const moderador = await exigirPermissao("moderar_forum");
  const item = lerItem(formData);
  if (!item) return { error: "Item inválido." };
  const motivo = String(formData.get("motivo") ?? "").trim();

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from(TABELAS[item.tipo])
    .update({
      status,
      moderado_por: moderador.id,
      moderado_em: new Date().toISOString(),
      motivo_rejeicao: status === "rejeitado" ? motivo || null : null,
    })
    .eq("id", item.id)
    .eq("status", "pendente");
  if (error) return { error: "Não foi possível moderar o item." };

  revalidatePath("/master/forum");
  revalidatePath("/forum");
  return {
    ok: status === "aprovado" ? "Publicação aprovada." : "Publicação rejeitada.",
  };
}

export async function aprovarItemForum(
  _prev: ModeracaoState,
  formData: FormData,
): Promise<ModeracaoState> {
  return moderar(formData, "aprovado");
}

export async function rejeitarItemForum(
  _prev: ModeracaoState,
  formData: FormData,
): Promise<ModeracaoState> {
  return moderar(formData, "rejeitado");
}
