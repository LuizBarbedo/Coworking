import type { Metadata } from "next";
import Link from "next/link";
import { painelAutenticado } from "@/lib/painel-auth";
import { obterMetricas } from "@/lib/metricas";
import {
  linkRelatorio,
  nomeDaTurma,
  opcoesDeTurma,
  resolverTurma,
  turmaValida,
} from "@/lib/relatorios-links";
import { resumoDoRecorte } from "@/lib/resumo-filtros";
import { buscarTurmas } from "@/lib/turmas-dados";
import { sairPainel } from "@/app/(painel)/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { SenhaForm } from "@/components/painel/senha-form";
import { BarraFiltros } from "@/components/painel/barra-filtros";
import {
  PainelMetricas,
  PERIODOS,
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
  searchParams: Promise<{ dias?: string; turma?: string }>;
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
  const turmas = await buscarTurmas();
  const turma = turmaValida(resolverTurma(parametros.turma), turmas);
  const nomeAtual = nomeDaTurma(turma, turmas);
  const metricas = await obterMetricas(dias, turma);

  return (
    <main className="flex flex-1 flex-col bg-background">
      <header className="border-b border-slate-200 bg-superficie">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link
            href="/"
            title="Ir para o site"
            className="rounded-lg transition hover:opacity-80"
          >
            <h1 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
              CSMG <span className="font-normal text-slate-400">· Painel</span>
            </h1>
          </Link>
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
        <BarraFiltros
          linhas={[
            {
              rotulo: "Turma",
              ativo: turma,
              opcoes: opcoesDeTurma(turmas),
              hrefPara: (t) =>
                linkRelatorio("/relatorios", {
                  dias,
                  turma: t as number | null,
                }),
            },
            {
              rotulo: "Período",
              ativo: dias,
              opcoes: PERIODOS.map((p) => ({
                valor: p.dias,
                rotulo: p.rotulo,
              })),
              hrefPara: (d) =>
                linkRelatorio("/relatorios", { dias: d as number, turma }),
            },
          ]}
          resumo={resumoDoRecorte({ nomeDaTurma: nomeAtual, dias })}
          hrefLimpar={
            turma === null && dias === 30
              ? undefined
              : linkRelatorio("/relatorios", { dias: 30 })
          }
        />
        <PainelMetricas
          metricas={metricas}
          dias={dias}
          turma={turma}
        />
      </div>
    </main>
  );
}
