import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAluno } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { estatisticasDoAluno } from "@/lib/perfil/estatisticas";
import { lerSessaoEquipe } from "@/lib/permissoes";
import { Avatar } from "@/components/perfil/avatar";
import { BadgeEquipe } from "@/components/forum/badges";
import { BarraProgresso } from "@/components/ui/barra-progresso";

export const metadata: Metadata = { title: "Perfil — CSMG" };
export const dynamic = "force-dynamic";

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-bold text-brand-900 dark:text-brand-100">
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">{rotulo}</p>
    </div>
  );
}

export default async function PerfilPublicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const eu = await exigirAluno();
  const { id } = await params;

  // Nome vem do Auth (fonte da verdade); conta inexistente → 404.
  const admin = createSupabaseAdminClient();
  const { data: conta } = await admin.auth.admin.getUserById(id);
  if (!conta?.user) notFound();
  const nome =
    (conta.user.user_metadata as { nome?: string })?.nome ??
    conta.user.email ??
    "Aluno(a)";

  const supabase = await createSupabaseServerClient();
  const [{ data: perfil }, stats] = await Promise.all([
    supabase
      .from("perfis")
      .select("bio, avatar_url")
      .eq("aluno_id", id)
      .maybeSingle(),
    estatisticasDoAluno(id),
  ]);

  const souEu = eu.id === id;

  return (
    <main className="animate-aparecer mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <Link
        href="/forum"
        className="text-sm text-slate-500 transition hover:text-brand-900 dark:hover:text-brand-100"
      >
        ← Voltar ao fórum
      </Link>

      <section className="mt-4 rounded-xl border border-slate-200 bg-superficie p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar
            id={id}
            nome={nome}
            avatarUrl={perfil?.avatar_url ?? null}
            tamanho="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
              {nome}
              {lerSessaoEquipe(conta.user.app_metadata) ? <BadgeEquipe /> : null}
            </h1>
            {perfil?.bio ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
                {perfil.bio}
              </p>
            ) : (
              <p className="mt-1 text-sm italic text-slate-400">
                {souEu
                  ? "Você ainda não escreveu sua bio."
                  : "Sem bio por enquanto."}
              </p>
            )}
          </div>
          {souEu ? (
            <Link
              href="/perfil"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Editar perfil
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
          Participação no fórum
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Numero valor={stats.posts} rotulo="Publicações" />
          <Numero valor={stats.respostas} rotulo="Respostas" />
          <Numero valor={stats.uteisRecebidos} rotulo="Úteis recebidos" />
          <Numero valor={stats.solucoes} rotulo="Soluções" />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
          Progresso no curso
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Aulas concluídas
              </span>
              <span className="tabular-nums text-slate-500">
                {stats.aulasConcluidas} de {stats.totalAulas}
              </span>
            </div>
            <div className="mt-1.5">
              <BarraProgresso
                pct={
                  (stats.aulasConcluidas / Math.max(stats.totalAulas, 1)) * 100
                }
              />
            </div>
          </div>
          <Numero
            valor={stats.avaliacoesAprovadas}
            rotulo="Avaliações aprovadas"
          />
        </div>
      </section>
    </main>
  );
}
