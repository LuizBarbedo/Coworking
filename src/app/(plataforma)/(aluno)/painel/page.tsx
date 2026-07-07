import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProgressoCurso, resumo } from "@/lib/progresso";
import { BarraProgresso } from "@/components/ui/barra-progresso";

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
    <div>
      <h1 className="text-2xl font-bold text-brand-900">Meus módulos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Conclua 70% do conteúdo e seja aprovado(a) nas avaliações para emitir sua
        declaração de participação.
      </p>

      {/* Declaração de participação (bloqueada até 70% + quizzes aprovados). */}
      <DeclaracaoCard progresso={progressoCurso} />

      {temModulos ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {modulos.map((modulo) => {
            const p = porModulo.get(modulo.id) ?? { total: 0, feitas: 0 };
            const r = resumo(p.feitas, p.total);
            return (
              <li key={modulo.id}>
                <Link
                  href={`/modulos/${modulo.slug}`}
                  className="block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <h2 className="font-semibold text-brand-900">
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
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-700">
            Os módulos estão sendo preparados.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            O conteúdo em vídeo, os materiais e as avaliações aparecerão aqui
            assim que forem publicados.
          </p>
        </div>
      )}
    </div>
  );
}

function DeclaracaoCard({
  progresso,
}: {
  progresso: Awaited<ReturnType<typeof getProgressoCurso>>;
}) {
  const { aulas, quizzesAprovados, quizzesTotal, aprovadoParaDeclaracao } =
    progresso;

  return (
    <div
      className={`mt-6 rounded-xl border p-5 ${
        aprovadoParaDeclaracao
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-brand-900">
            Declaração de participação
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {aprovadoParaDeclaracao
              ? "Você concluiu os requisitos. Sua declaração está liberada."
              : `Progresso: ${aulas.pct}% das aulas · ${quizzesAprovados}/${quizzesTotal} avaliações aprovadas.`}
          </p>
        </div>
        <button
          type="button"
          disabled={!aprovadoParaDeclaracao}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            aprovadoParaDeclaracao
              ? "Emitir declaração"
              : "Disponível ao concluir 70% das aulas e todas as avaliações"
          }
        >
          Emitir declaração
        </button>
      </div>
    </div>
  );
}
