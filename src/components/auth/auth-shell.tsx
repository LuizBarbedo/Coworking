import Image from "next/image";
import Link from "next/link";
import { Patrocinadores } from "@/components/patrocinadores";

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
      <div className="flex flex-1 flex-col bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-6 py-10">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <Link href="/" className="mb-8 flex items-center gap-3 text-white">
          <Image
            src="/logo-coworking.jpeg"
            alt="Coworking Social de Mudanças Globais"
            width={44}
            height={44}
            priority
            className="h-11 w-11 flex-none rounded-lg object-cover ring-1 ring-white/20"
          />
          <span className="text-sm font-semibold leading-tight">
            Coworking Social de Mudanças Globais
            <span className="block text-xs font-normal text-brand-100/80">
              Ambiente Virtual de Aprendizagem
            </span>
          </span>
        </Link>

        <div className="rounded-2xl bg-white p-7 shadow-xl ring-1 ring-black/5">
          <h1 className="text-xl font-bold text-brand-900">{titulo}</h1>
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
