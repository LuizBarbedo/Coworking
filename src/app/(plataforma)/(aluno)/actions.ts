"use server";

import { revalidatePath } from "next/cache";
import { exigirAluno } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MarcarState = { ok: true } | { error: string } | undefined;

/** Marca uma aula como assistida para o aluno logado (idempotente). */
export async function marcarAulaAssistida(
  _prev: MarcarState,
  formData: FormData,
): Promise<MarcarState> {
  const aluno = await exigirAluno();
  const aulaId = String(formData.get("aulaId") ?? "");
  const caminho = String(formData.get("caminho") ?? "");

  if (!aulaId) return { error: "Aula inválida." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("progresso_aula")
    .upsert(
      { aluno_id: aluno.id, aula_id: aulaId },
      { onConflict: "aluno_id,aula_id", ignoreDuplicates: true },
    );

  if (error) return { error: "Não foi possível registrar o progresso." };

  if (caminho.startsWith("/")) revalidatePath(caminho);
  revalidatePath("/painel");
  return { ok: true };
}

export type QuizState =
  | { nota: number; aprovado: boolean }
  | { error: string }
  | undefined;

/**
 * Corrige o quiz no servidor via RPC corrigir_quiz (o gabarito nunca sai do
 * banco) e devolve nota + aprovado para renderizar o resultado inline.
 */
export async function submeterQuiz(
  _prev: QuizState,
  formData: FormData,
): Promise<QuizState> {
  await exigirAluno();

  const quizId = String(formData.get("quizId") ?? "");
  if (!quizId) return { error: "Avaliação inválida." };

  // Coleta { pergunta_id: alternativa_id } dos campos resposta_<perguntaId>.
  const respostas: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (chave.startsWith("resposta_") && typeof valor === "string" && valor) {
      respostas[chave.slice("resposta_".length)] = valor;
    }
  }

  if (Object.keys(respostas).length === 0) {
    return { error: "Responda pelo menos uma pergunta." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("corrigir_quiz", {
    p_quiz_id: quizId,
    p_respostas: respostas,
  });

  if (error) return { error: "Não foi possível corrigir a avaliação." };

  const resultado = Array.isArray(data) ? data[0] : data;
  if (!resultado) return { error: "Não foi possível corrigir a avaliação." };

  // Atualiza o painel (progresso/declaração) na próxima visita.
  revalidatePath("/painel");

  return {
    nota: Number(resultado.nota),
    aprovado: Boolean(resultado.aprovado),
  };
}
