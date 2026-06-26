import Image from "next/image";
import Link from "next/link";
import { exigirAluno } from "@/lib/auth";
import { logout } from "@/app/(plataforma)/actions";
import { Patrocinadores } from "@/components/patrocinadores";

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await exigirAluno();
  const nome =
    (user.user_metadata?.nome as string | undefined) ??
    user.email ??
    "Aluno(a)";
  const primeiroNome = nome.split(" ")[0];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/painel" className="flex items-center gap-2.5">
            <Image
              src="/logo-coworking.jpeg"
              alt="CSMG"
              width={36}
              height={36}
              priority
              className="h-9 w-9 flex-none rounded-md object-cover ring-1 ring-black/5"
            />
            <span className="text-sm font-semibold text-brand-900">
              CSMG
              <span className="ml-1 font-normal text-slate-400">· AVA</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:block">
              Olá, {primeiroNome}
            </span>
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
    </div>
  );
}
