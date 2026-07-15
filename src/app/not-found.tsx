import Link from "next/link";
import { RodaQuebrada } from "@/components/ilustracoes";

export default function NaoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-20 text-center">
      <RodaQuebrada className="h-44 w-auto text-slate-300" />
      <p className="mt-6 font-display text-2xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        Página não encontrada
      </p>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        O endereço que você tentou abrir não existe ou foi movido. Vamos te
        levar de volta ao começo.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
