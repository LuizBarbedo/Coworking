import type { Metadata } from "next";
import Link from "next/link";
import { exigirVisaoAluno } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProgressoCurso, resumo } from "@/lib/progresso";
import { BarraProgresso } from "@/components/ui/barra-progresso";
import { Contador } from "@/components/ui/contador";
import { ModulosVazio } from "@/components/ilustracoes";

export const metadata: Metadata = {
  title: "Meu painel — CSMG",
};

type Modulo = {
  id: string;
  slug: string;
  titulo: string;
  descricao: string | null;
  instrutor: string | null;
  ordem: number;
};

export default async function PainelPage() {
  await exigirVisaoAluno();
  const supabase = await createSupabaseServerClient();

  const [
    { data: modulos },
    { data: disciplinas },
    { data: aulas },
    { data: progresso },
    progressoCurso,
  ] = await Promise.all([
    supabase
      .from("modulos")
      .select("id, slug, titulo, descricao, instrutor, ordem")
      .order("ordem", { ascending: true })
      .returns<Modulo[]>(),
    supabase.from("disciplinas").select("id, modulo_id"),
    supabase.from("aulas").select("id, disciplina_id"),
    supabase.from("progresso_aula").select("aula_id"),
    getProgressoCurso(supabase),
  ]);

  // Mapeia aula → módulo (via disciplina) para o progresso por módulo.
  const discToMod = new Map(
    (disciplinas ?? []).map((d) => [d.id as string, d.modulo_id as string]),
  );
  const assistidas = new Set((progresso ?? []).map((p) => p.aula_id as string));
  const porModulo = new Map<string, { total: number; feitas: number }>();
  for (const aula of aulas ?? []) {
    const mod = discToMod.get(aula.disciplina_id as string);
    if (!mod) continue;
    const acc = porModulo.get(mod) ?? { total: 0, feitas: 0 };
    acc.total += 1;
    if (assistidas.has(aula.id as string)) acc.feitas += 1;
    porModulo.set(mod, acc);
  }

  const temModulos = modulos && modulos.length > 0;

  return (
    <div className="animate-aparecer">
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        Meus módulos
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Acompanhe aqui o seu avanço nas mentorias, disciplinas e avaliações.
      </p>

      {/* Progresso geral do aluno (aulas assistidas + avaliações aprovadas). */}
      <ProgressoGeralCard progresso={progressoCurso} />

      {temModulos ? (
        <ul className="escalonado mt-8 grid gap-4 sm:grid-cols-2" data-tour="modulos">
          {modulos.map((modulo) => {
            const p = porModulo.get(modulo.id) ?? { total: 0, feitas: 0 };
            const r = resumo(p.feitas, p.total);
            return (
              <li key={modulo.id}>
                <Link
                  href={`/modulos/${modulo.slug}`}
                  data-conteudo={p.total > 0 ? "1" : "0"}
                  className="block h-full rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                >
                  <h2 className="font-semibold text-brand-900 dark:text-brand-100">
                    {modulo.titulo}
                  </h2>
                  {modulo.instrutor ? (
                    <p className="mt-0.5 text-sm text-slate-500">
                      {modulo.instrutor}
                    </p>
                  ) : null}
                  {modulo.descricao ? (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {modulo.descricao}
                    </p>
                  ) : null}
                  <div className="mt-4">
                    <BarraProgresso
                      pct={r.pct}
                      label={`${r.feitas} de ${r.total} aulas`}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-superficie p-10 text-center">
          <ModulosVazio className="h-36 w-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            Os módulos estão sendo preparados.
          </p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            O conteúdo em vídeo, os materiais e as avaliações aparecerão aqui
            assim que forem publicados.
          </p>
        </div>
      )}
    </div>
  );
}

function ProgressoGeralCard({
  progresso,
}: {
  progresso: Awaited<ReturnType<typeof getProgressoCurso>>;
}) {
  const { aulas, quizzesAprovados, quizzesTotal, geral } = progresso;

  return (
    <div
      className="mt-6 rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm"
      data-tour="progresso"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-brand-900 dark:text-brand-100">Progresso geral</h2>
        <Contador
          valor={geral.pct}
          sufixo="%"
          className="font-display text-2xl font-bold text-brand-900 dark:text-brand-100"
        />
      </div>
      <div className="mt-3">
        <BarraProgresso pct={geral.pct} />
      </div>
      <p className="mt-3 text-sm text-slate-500">
        {aulas.feitas} de {aulas.total} aulas assistidas · {quizzesAprovados} de{" "}
        {quizzesTotal} avaliações aprovadas.
      </p>
    </div>
  );
}
