import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VideoPlayer } from "@/components/ava/video-player";
import { MarcarAssistidaButton } from "@/components/ava/marcar-assistida-button";

type Params = { modulo: string; disciplina: string };

async function carregar(moduloSlug: string, disciplinaSlug: string) {
  const supabase = await createSupabaseServerClient();

  const { data: modulo } = await supabase
    .from("modulos")
    .select("id, titulo")
    .eq("slug", moduloSlug)
    .maybeSingle();
  if (!modulo) return null;

  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("id, titulo, descricao")
    .eq("modulo_id", modulo.id)
    .eq("slug", disciplinaSlug)
    .maybeSingle();
  if (!disciplina) return null;

  return { supabase, modulo, disciplina };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { modulo, disciplina } = await params;
  const ctx = await carregar(modulo, disciplina);
  return {
    title: ctx ? `${ctx.disciplina.titulo} — CSMG` : "Disciplina — CSMG",
  };
}

export default async function DisciplinaPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { modulo: moduloSlug, disciplina: disciplinaSlug } = await params;
  const ctx = await carregar(moduloSlug, disciplinaSlug);
  if (!ctx) notFound();

  const { supabase, modulo, disciplina } = ctx;
  const caminho = `/modulos/${moduloSlug}/${disciplinaSlug}`;

  const [{ data: aulas }, { data: materiais }, { data: quiz }] =
    await Promise.all([
      supabase
        .from("aulas")
        .select("id, titulo, descricao, provider, video_uid, ordem")
        .eq("disciplina_id", disciplina.id)
        .order("ordem", { ascending: true }),
      supabase
        .from("materiais")
        .select("id, titulo, tipo, url, ordem")
        .eq("disciplina_id", disciplina.id)
        .order("ordem", { ascending: true }),
      supabase
        .from("quizzes")
        .select("id, titulo, nota_minima")
        .eq("disciplina_id", disciplina.id)
        .maybeSingle(),
    ]);

  const aulaIds = (aulas ?? []).map((a) => a.id as string);
  const [{ data: progresso }, { data: tentativa }] = await Promise.all([
    aulaIds.length
      ? supabase.from("progresso_aula").select("aula_id").in("aula_id", aulaIds)
      : Promise.resolve({ data: [] as { aula_id: string }[] }),
    quiz
      ? supabase
          .from("quiz_tentativas")
          .select("nota, aprovado")
          .eq("quiz_id", quiz.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const assistidas = new Set((progresso ?? []).map((p) => p.aula_id as string));

  return (
    <div>
      <Link
        href={`/modulos/${moduloSlug}`}
        className="text-sm text-brand-600 transition hover:text-brand-700"
      >
        ← {modulo.titulo}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-brand-900">
        {disciplina.titulo}
      </h1>
      {disciplina.descricao ? (
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {disciplina.descricao}
        </p>
      ) : null}

      {/* Aulas em vídeo */}
      <div className="mt-6 space-y-8">
        {(aulas ?? []).map((aula) => (
          <section key={aula.id}>
            <VideoPlayer
              provider={aula.provider as string}
              videoUid={(aula.video_uid as string | null) ?? null}
              titulo={aula.titulo as string}
            />
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-brand-900">
                  {aula.titulo as string}
                </h2>
                {aula.descricao ? (
                  <p className="mt-0.5 text-sm text-slate-600">
                    {aula.descricao as string}
                  </p>
                ) : null}
              </div>
              <MarcarAssistidaButton
                aulaId={aula.id as string}
                caminho={caminho}
                jaAssistida={assistidas.has(aula.id as string)}
              />
            </div>
          </section>
        ))}
        {(aulas ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            As videoaulas desta disciplina estão sendo preparadas.
          </p>
        ) : null}
      </div>

      {/* Materiais */}
      {materiais && materiais.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Materiais
          </h2>
          <ul className="mt-3 space-y-2">
            {materiais.map((m) => (
              <li key={m.id as string}>
                <a
                  href={m.url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-300"
                >
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase text-brand-600">
                    {(m.tipo as string) ?? "arquivo"}
                  </span>
                  {m.titulo as string}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Avaliação */}
      {quiz ? (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-brand-900">
                {quiz.titulo as string}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {tentativa
                  ? `Última tentativa: ${Number(
                      tentativa.nota,
                    ).toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })}% — ${tentativa.aprovado ? "aprovado" : "não aprovado"}`
                  : `Nota mínima para aprovação: ${quiz.nota_minima}%`}
              </p>
            </div>
            <Link
              href={`${caminho}/quiz`}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              {tentativa ? "Refazer avaliação" : "Fazer avaliação"}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
