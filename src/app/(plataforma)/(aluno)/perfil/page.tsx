import type { Metadata } from "next";
import Link from "next/link";
import { BotaoVoltar } from "@/components/ui/botao-voltar";
import { exigirAluno } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/perfil/avatar";
import { FormFoto, FormPerfil } from "@/components/perfil/form-perfil";

export const metadata: Metadata = { title: "Meu perfil — CSMG" };
export const dynamic = "force-dynamic";

export default async function MeuPerfilPage() {
  const aluno = await exigirAluno();
  const supabase = await createSupabaseServerClient();
  const { data: perfil } = await supabase
    .from("perfis")
    .select("bio, avatar_url")
    .eq("aluno_id", aluno.id)
    .maybeSingle();

  const nome =
    (aluno.user_metadata as { nome?: string })?.nome ?? aluno.email ?? "";

  return (
    <main className="animate-aparecer mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <BotaoVoltar href="/painel">Meus módulos</BotaoVoltar>

      <div className="mt-4 flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
          Meu perfil
        </h1>
        <Link
          href={`/perfil/${aluno.id}`}
          className="text-sm text-slate-500 underline-offset-2 transition hover:text-brand-900 hover:underline dark:hover:text-brand-100"
        >
          Ver como a turma vê
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Seu nome, foto e bio aparecem pros colegas no fórum.
      </p>

      <div className="mt-6 space-y-6">
        <section className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar
              id={aluno.id}
              nome={nome}
              avatarUrl={perfil?.avatar_url ?? null}
              tamanho="lg"
            />
            <div className="min-w-0 flex-1">
              <FormFoto />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
          <FormPerfil nome={nome} bio={perfil?.bio ?? ""} />
        </section>
      </div>
    </main>
  );
}
