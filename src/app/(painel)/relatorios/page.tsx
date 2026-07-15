import type { Metadata } from "next";
import Link from "next/link";
import { painelAutenticado } from "@/lib/painel-auth";
import { obterMetricas, type OrigemAgregada } from "@/lib/metricas";
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

const PERIODOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
] as const;

function FiltroPeriodo({ dias }: { dias: number }) {
  return (
    <nav
      aria-label="Período do relatório"
      className="inline-flex rounded-lg border border-slate-200 bg-superficie p-0.5 text-sm shadow-sm"
    >
      {PERIODOS.map((p) => (
        <Link
          key={p.dias}
          href={`/relatorios?dias=${p.dias}`}
          aria-current={p.dias === dias ? "page" : undefined}
          className={
            p.dias === dias
              ? "rounded-md bg-brand-900 px-3 py-1 font-medium text-white dark:bg-brand-100 dark:text-brand-900"
              : "rounded-md px-3 py-1 text-slate-500 transition hover:text-brand-900 dark:hover:text-brand-100"
          }
        >
          {p.rotulo}
        </Link>
      ))}
    </nav>
  );
}

function rotuloOrigem(valor: string | null, vazio: string): string {
  return valor ?? vazio;
}

function TabelaOrigens({
  origens,
  dias,
}: {
  origens: OrigemAgregada[];
  dias: number;
}) {
  const totalPeriodo = origens.reduce((soma, o) => soma + o.total, 0);
  return (
    <section className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
        Origem do tráfego
      </h3>
      <p className="mt-1 text-xs text-slate-400">
        Inscrições dos últimos {dias} dias por UTM da campanha (anúncios da
        Meta, links divulgados). Sem UTM = acesso direto ou orgânico.
      </p>
      {origens.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Nenhuma inscrição no período.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4 font-medium">Fonte</th>
                <th className="py-2 pr-4 font-medium">Meio</th>
                <th className="py-2 pr-4 font-medium">Campanha</th>
                <th className="py-2 text-right font-medium">Inscrições</th>
              </tr>
            </thead>
            <tbody>
              {origens.map((o, i) => (
                <tr
                  key={`${o.source}-${o.medium}-${o.campaign}-${i}`}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="py-2 pr-4 font-medium text-brand-900 dark:text-brand-100">
                    {rotuloOrigem(o.source, "direto / orgânico")}
                  </td>
                  <td className="py-2 pr-4 text-slate-500">
                    {rotuloOrigem(o.medium, "—")}
                  </td>
                  <td className="py-2 pr-4 text-slate-500">
                    {rotuloOrigem(o.campaign, "—")}
                  </td>
                  <td className="py-2 text-right tabular-nums text-brand-900 dark:text-brand-100">
                    {o.total}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-xs text-slate-400">
                <td className="pt-2" colSpan={3}>
                  Total no período
                </td>
                <td className="pt-2 text-right tabular-nums">{totalPeriodo}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

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
  const dias =
    PERIODOS.find((p) => String(p.dias) === parametros.dias)?.dias ?? 30;
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

      <div className="animate-aparecer mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
              Acompanhamento de inscrições
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Última inscrição em {formatarUltima(metricas.ultima)}.
            </p>
          </div>
          <FiltroPeriodo dias={dias} />
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

        {metricas.origens ? (
          <TabelaOrigens origens={metricas.origens} dias={dias} />
        ) : null}
      </div>
    </main>
  );
}
