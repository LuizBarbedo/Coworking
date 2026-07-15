import Image from "next/image";
import Link from "next/link";
import { Patrocinadores } from "@/components/patrocinadores";
import { TemaToggle } from "@/components/ui/tema-toggle";

/** Moldura visual das telas de autenticação: gradiente da marca + card central. */
export function AuthShell({
  titulo,
  subtitulo,
  children,
  rodape,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <div className="relative flex flex-1 flex-col bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-6 py-10">
        <TemaToggle className="absolute right-6 top-6 border-white/20 text-white/70 hover:border-white/40 hover:text-white" />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <Link href="/" className="group mb-8 flex items-center gap-3 text-white">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
            <Image
              src="/logo-roda.svg"
              alt="Coworking Social de Mudanças Globais"
              width={34}
              height={34}
              priority
              className="h-[34px] w-[34px] transition-transform duration-500 group-hover:rotate-90"
            />
          </span>
          <span className="font-display text-sm font-bold leading-tight tracking-tight">
            Coworking Social de Mudanças Globais
            <span className="block font-sans text-xs font-normal tracking-normal text-brand-100/80">
              Ambiente Virtual de Aprendizagem
            </span>
          </span>
        </Link>

        <div className="animate-escalar rounded-2xl bg-superficie p-7 shadow-xl ring-1 ring-black/5">
          <h1 className="font-display text-xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
            {titulo}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
          <div className="mt-6">{children}</div>
        </div>

        {rodape ? (
          <p className="mt-6 text-center text-sm text-brand-100/80">{rodape}</p>
        ) : null}
        </div>
      </div>

      <Patrocinadores />
    </main>
  );
}
