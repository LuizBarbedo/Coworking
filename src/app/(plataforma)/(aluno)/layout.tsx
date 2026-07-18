import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirAluno, getSessaoEquipe } from "@/lib/auth";
import { podeVerComoAluno } from "@/lib/permissoes";
import { logout } from "@/app/(plataforma)/actions";
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
  // Monitor sem a permissão visao_aluno não navega o AVA como aluno.
  if (!podeVerComoAluno(sessao)) redirect("/master");
  const ehEquipe = sessao !== null;
  const nome =
    (user.user_metadata?.nome as string | undefined) ??
    user.email ??
    "Aluno(a)";
  const primeiroNome = nome.split(" ")[0];

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
            {ehEquipe ? (
              <Link
                href="/master"
                data-tour="area-master"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Área do Master
              </Link>
            ) : null}
            <span className="hidden text-sm text-slate-600 sm:block">
              Olá, {primeiroNome}
            </span>
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
