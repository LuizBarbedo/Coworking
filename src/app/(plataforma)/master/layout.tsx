import Link from "next/link";
import Image from "next/image";
import { exigirMaster, getSessaoEquipe } from "@/lib/auth";
import { podeVerComoAluno, temPermissao } from "@/lib/permissoes";
import { logout } from "@/app/(plataforma)/actions";
import { NavMaster, type AbaMaster } from "@/components/master/nav-master";
import { TemaToggle } from "@/components/ui/tema-toggle";
import { SomToggle } from "@/components/ui/som-toggle";
import { BotaoTour } from "@/components/tour/botao-tour";
import { ContextoIAProvider } from "@/components/ava/contexto-ia";
import { AssistenteFlutuante } from "@/components/ava/assistente-flutuante";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await exigirMaster();
  const sessao = await getSessaoEquipe();

  const abas: AbaMaster[] = [];
  if (temPermissao(sessao, "editar_conteudo"))
    abas.push({ href: "/master", rotulo: "Conteúdo" });
  if (temPermissao(sessao, "ver_relatorios"))
    abas.push({ href: "/master/relatorios", rotulo: "Relatórios" });
  if (temPermissao(sessao, "moderar_forum"))
    abas.push({ href: "/master/forum", rotulo: "Fórum" });
  if (sessao?.nivel === "admin")
    abas.push({ href: "/master/equipe", rotulo: "Equipe" });

  return (
    <ContextoIAProvider>
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-slate-200 bg-brand-900 text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/master" className="flex items-center gap-2.5 text-sm font-semibold">
            <Image
              src="/logo-roda.svg"
              alt="Logo do CSMG — a Roda"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            CSMG
            <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-medium">
              Área do Master
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {podeVerComoAluno(sessao) ? (
              <Link
                href="/painel"
                className="text-brand-100 transition hover:text-white"
              >
                Ver como aluno
              </Link>
            ) : null}
            <BotaoTour perfil="master" className="border-white/20 text-white/70 hover:text-white hover:border-white/40" />
            <SomToggle className="border-white/20 text-white/70 hover:text-white hover:border-white/40" />
            <TemaToggle className="border-white/20 text-white/70 hover:text-white hover:border-white/40" />
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-white/25 px-3 py-1.5 font-medium text-white transition hover:bg-white/10"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <NavMaster abas={abas} />
        <div className={abas.length >= 2 ? "pt-6" : undefined}>{children}</div>
      </div>
      <AssistenteFlutuante />
    </div>
    </ContextoIAProvider>
  );
}
