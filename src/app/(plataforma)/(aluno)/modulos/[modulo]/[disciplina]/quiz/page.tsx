import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QuizForm } from "@/components/ava/quiz-form";

type Params = { modulo: string; disciplina: string };

export const metadata: Metadata = { title: "Avaliação — CSMG" };

export default async function QuizPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { modulo: moduloSlug, disciplina: disciplinaSlug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: modulo } = await supabase
    .from("modulos")
    .select("id")
    .eq("slug", moduloSlug)
    .maybeSingle();
  if (!modulo) notFound();

  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("id, titulo")
    .eq("modulo_id", modulo.id)
    .eq("slug", disciplinaSlug)
    .maybeSingle();
  if (!disciplina) notFound();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, titulo, nota_minima")
    .eq("disciplina_id", disciplina.id)
    .maybeSingle();
  if (!quiz) notFound();

  const { data: perguntas } = await supabase
    .from("quiz_perguntas")
    .select("id, enunciado, ordem")
    .eq("quiz_id", quiz.id)
    .order("ordem", { ascending: true });

  const perguntaIds = (perguntas ?? []).map((p) => p.id as string);
  const { data: alternativas } = perguntaIds.length
    ? await supabase
        .from("quiz_alternativas_publicas")
        .select("id, pergunta_id, texto, ordem")
        .in("pergunta_id", perguntaIds)
        .order("ordem", { ascending: true })
    : { data: [] as { id: string; pergunta_id: string; texto: string }[] };

  const porPergunta = new Map<string, { id: string; texto: string }[]>();
  for (const alt of alternativas ?? []) {
    const arr = porPergunta.get(alt.pergunta_id as string) ?? [];
    arr.push({ id: alt.id as string, texto: alt.texto as string });
    porPergunta.set(alt.pergunta_id as string, arr);
  }

  const perguntasCompletas = (perguntas ?? []).map((p) => ({
    id: p.id as string,
    enunciado: p.enunciado as string,
    alternativas: porPergunta.get(p.id as string) ?? [],
  }));

  const caminho = `/modulos/${moduloSlug}/${disciplinaSlug}`;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={caminho}
        className="text-sm text-brand-600 transition hover:text-brand-700"
      >
        ← {disciplina.titulo}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-brand-900">
        {quiz.titulo as string}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Responda todas as perguntas. Nota mínima para aprovação:{" "}
        {quiz.nota_minima}%.
      </p>

      <div className="mt-6">
        {perguntasCompletas.length > 0 ? (
          <QuizForm
            quizId={quiz.id as string}
            notaMinima={quiz.nota_minima as number}
            perguntas={perguntasCompletas}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Esta avaliação ainda não tem perguntas.
          </p>
        )}
      </div>
    </div>
  );
}
