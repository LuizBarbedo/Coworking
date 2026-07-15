import type { Metadata } from "next";
import { painelAutenticado } from "@/lib/painel-auth";
import { obterMetricas } from "@/lib/metricas";
import { sairPainel } from "@/app/(painel)/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { SenhaForm } from "@/components/painel/senha-form";
import { GraficoEvolucao } from "@/components/painel/grafico-evolucao";
import { TemaToggle } from "@/components/ui/tema-toggle";
import { Contador } from "@/components/ui/contador";

export const metadata: Metadata = {
  title: "Painel de inscrições — CSMG",
  robots: { index: false, follow: false },
};

// Sempre renderiza no servidor com dados frescos (lê cookie + conta ao vivo).
export const dynamic = "force-dynamic";

function formatarUltima(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function Cartao({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: number;
  detalhe?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{rotulo}</p>
      <Contador
        valor={valor}
        className="mt-2 block font-display text-3xl font-bold text-brand-900 dark:text-brand-100"
      />
      {detalhe ? <p className="mt-1 text-xs text-slate-400">{detalhe}</p> : null}
    </div>
  );
}

export default async function RelatoriosPage() {
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

  const metricas = await obterMetricas(30);

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

      <div className="animate-aparecer mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
            Acompanhamento de inscrições
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Última inscrição em {formatarUltima(metricas.ultima)}.
          </p>
        </div>

        <div className="escalonado grid gap-4 sm:grid-cols-3">
          <Cartao
            rotulo="Total de inscritos"
            valor={metricas.total}
            detalhe="Desde o início das inscrições"
          />
          <Cartao
            rotulo="Hoje"
            valor={metricas.hoje}
            detalhe="Novas inscrições de hoje"
          />
          <Cartao
            rotulo="Últimos 7 dias"
            valor={metricas.semana}
            detalhe="Inclui o dia de hoje"
          />
        </div>

        <GraficoEvolucao serie={metricas.serie} />
      </div>
    </main>
  );
}
