import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resumo } from "@/lib/progresso";
import { BarraProgresso } from "@/components/ui/barra-progresso";

type Params = { modulo: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { modulo } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("modulos")
    .select("titulo")
    .eq("slug", modulo)
    .maybeSingle();
  return { title: data?.titulo ? `${data.titulo} — CSMG` : "Módulo — CSMG" };
}

type Disciplina = {
  id: string;
  slug: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
};

export default async function ModuloPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { modulo: moduloSlug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: modulo } = await supabase
    .from("modulos")
    .select("id, titulo, descricao, instrutor")
    .eq("slug", moduloSlug)
    .maybeSingle();

  if (!modulo) notFound();

  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("id, slug, titulo, descricao, ordem")
    .eq("modulo_id", modulo.id)
    .order("ordem", { ascending: true })
    .returns<Disciplina[]>();

  const discIds = (disciplinas ?? []).map((d) => d.id);
  const [{ data: aulas }, { data: progresso }] = await Promise.all([
    discIds.length
      ? supabase.from("aulas").select("id, disciplina_id").in("disciplina_id", discIds)
      : Promise.resolve({ data: [] as { id: string; disciplina_id: string }[] }),
    supabase.from("progresso_aula").select("aula_id"),
  ]);

  const assistidas = new Set((progresso ?? []).map((p) => p.aula_id as string));
  const porDisciplina = new Map<string, { total: number; feitas: number }>();
  for (const aula of aulas ?? []) {
    const d = aula.disciplina_id as string;
    const acc = porDisciplina.get(d) ?? { total: 0, feitas: 0 };
    acc.total += 1;
    if (assistidas.has(aula.id as string)) acc.feitas += 1;
    porDisciplina.set(d, acc);
  }

  return (
    <div className="animate-aparecer">
      <Link
        href="/painel"
        className="text-sm text-brand-600 transition hover:text-brand-700"
      >
        ← Meus módulos
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">{modulo.titulo}</h1>
      {modulo.instrutor ? (
        <p className="mt-0.5 text-sm text-slate-500">{modulo.instrutor}</p>
      ) : null}
      {modulo.descricao ? (
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {modulo.descricao}
        </p>
      ) : null}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Disciplinas
      </h2>

      {disciplinas && disciplinas.length > 0 ? (
        <ul className="escalonado mt-3 space-y-3" data-tour="disciplinas">
          {disciplinas.map((disciplina, i) => {
            const p = porDisciplina.get(disciplina.id) ?? {
              total: 0,
              feitas: 0,
            };
            const r = resumo(p.feitas, p.total);
            return (
              <li key={disciplina.id}>
                <Link
                  href={`/modulos/${moduloSlug}/${disciplina.slug}`}
                  data-conteudo={p.total > 0 ? "1" : "0"}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-brand-900 dark:text-brand-100">
                      {disciplina.titulo}
                    </h3>
                    {disciplina.descricao ? (
                      <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">
                        {disciplina.descricao}
                      </p>
                    ) : null}
                    <div className="mt-2">
                      <BarraProgresso
                        pct={r.pct}
                        label={`${r.feitas} de ${r.total} aulas`}
                      />
                    </div>
                  </div>
                  <span className="flex-none text-slate-300">›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
          As disciplinas deste módulo estão sendo preparadas.
        </p>
      )}
    </div>
  );
}
