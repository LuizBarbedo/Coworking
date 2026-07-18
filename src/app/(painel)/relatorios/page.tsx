import type { Metadata } from "next";
import { painelAutenticado } from "@/lib/painel-auth";
import { obterMetricas } from "@/lib/metricas";
import { sairPainel } from "@/app/(painel)/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { SenhaForm } from "@/components/painel/senha-form";
import {
  PainelMetricas,
  resolverDias,
} from "@/components/painel/painel-metricas";
import { TemaToggle } from "@/components/ui/tema-toggle";

export const metadata: Metadata = {
  title: "Painel de inscrições — CSMG",
  robots: { index: false, follow: false },
};

// Sempre renderiza no servidor com dados frescos (lê cookie + conta ao vivo).
export const dynamic = "force-dynamic";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  // Portão de senha: quem não está autenticado vê só o formulário.
  if (!(await painelAutenticado())) {
    return (
      <AuthShell
        titulo="Painel de inscrições"
        subtitulo="Área restrita à coordenação. Informe a senha de acesso."
      >
        <SenhaForm />
      </AuthShell>
    );
  }

  const parametros = await searchParams;
  const dias = resolverDias(parametros.dias);
  const metricas = await obterMetricas(dias);

  return (
    <main className="flex flex-1 flex-col bg-background">
      <header className="border-b border-slate-200 bg-superficie">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div>
            <h1 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
              CSMG <span className="font-normal text-slate-400">· Painel</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <TemaToggle />
            <form action={sairPainel}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="animate-aparecer mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <PainelMetricas metricas={metricas} dias={dias} basePath="/relatorios" />
      </div>
    </main>
  );
}
