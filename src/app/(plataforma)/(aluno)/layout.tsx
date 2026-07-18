import Image from "next/image";
import Link from "next/link";
import { exigirAluno, getSessaoEquipe } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "@/app/(plataforma)/actions";
import { Avatar } from "@/components/perfil/avatar";
import { Patrocinadores } from "@/components/patrocinadores";
import { TemaToggle } from "@/components/ui/tema-toggle";
import { SomToggle } from "@/components/ui/som-toggle";
import { ContextoIAProvider } from "@/components/ava/contexto-ia";
import { AssistenteFlutuante } from "@/components/ava/assistente-flutuante";
import { BotaoTour } from "@/components/tour/botao-tour";

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await exigirAluno();
  const sessao = await getSessaoEquipe();
  // O bloqueio de monitor sem visao_aluno fica nas páginas de CONTEÚDO
  // (painel, disciplinas) via exigirVisaoAluno — fórum e perfil são de
  // comunidade e ficam abertos pra toda a equipe.
  const ehEquipe = sessao !== null;
  const nome =
    (user.user_metadata?.nome as string | undefined) ??
    user.email ??
    "Aluno(a)";
  const primeiroNome = nome.split(" ")[0];
  // Foto do perfil pro header (antes da migração 0016 a query só falha e o
  // avatar cai nas iniciais).
  const supabase = await createSupabaseServerClient();
  const { data: perfil } = await supabase
    .from("perfis")
    .select("avatar_url")
    .eq("aluno_id", user.id)
    .maybeSingle();

  return (
    <ContextoIAProvider>
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-superficie/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/painel" className="group flex items-center gap-2.5" data-tour="marca">
            <Image
              src="/logo-roda.svg"
              alt="Roda CSMG — quatro pessoas de mãos dadas em círculo"
              width={34}
              height={34}
              priority
              className="h-[34px] w-[34px] flex-none transition-transform duration-500 group-hover:rotate-90"
            />
            <span className="font-display text-sm font-bold tracking-tight text-brand-900 dark:text-brand-100">
              CSMG
              <span className="ml-1 font-sans font-normal text-slate-400">· AVA</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Wrapper com data-tour: o tour navega pelo 1º link DE DENTRO
                do contêiner, então o atributo não pode ficar no próprio <a>. */}
            <span data-tour="forum">
              <Link
                href="/forum"
                className="text-sm font-medium text-slate-600 transition hover:text-brand-900 dark:text-slate-300 dark:hover:text-brand-100"
              >
                Fórum
              </Link>
            </span>
            {ehEquipe ? (
              <Link
                href="/master"
                data-tour="area-master"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Área do Master
              </Link>
            ) : null}
            <Link
              href="/perfil"
              data-tour="perfil"
              title="Meu perfil"
              className="flex items-center gap-2"
            >
              <Avatar
                id={user.id}
                nome={nome}
                avatarUrl={perfil?.avatar_url ?? null}
                tamanho="sm"
              />
              <span className="hidden text-sm text-slate-600 sm:block">
                {primeiroNome}
              </span>
            </Link>
            <BotaoTour perfil="aluno" />
            <SomToggle />
            <TemaToggle />
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</div>

      <Patrocinadores />
      <AssistenteFlutuante />
    </div>
    </ContextoIAProvider>
  );
}
