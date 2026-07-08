import Link from "next/link";
import { exigirMaster } from "@/lib/auth";
import { logout } from "@/app/(plataforma)/actions";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await exigirMaster();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-slate-200 bg-brand-900 text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/master" className="flex items-center gap-2 text-sm font-semibold">
            CSMG
            <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-medium">
              Área do Master
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/painel"
              className="text-brand-100 transition hover:text-white"
            >
              Ver como aluno
            </Link>
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

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
