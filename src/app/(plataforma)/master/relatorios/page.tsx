import type { Metadata } from "next";
import Link from "next/link";
import { exigirPermissao } from "@/lib/auth";
import { obterMetricas } from "@/lib/metricas";
import {
  linkRelatorio,
  resolverTurma,
  turmaValida,
} from "@/lib/relatorios-links";
import { buscarTurmas } from "@/lib/turmas-dados";
import {
  PainelMetricas,
  resolverDias,
} from "@/components/painel/painel-metricas";
import { CardSaudeForum } from "@/components/painel/card-saude-forum";
import { DesempenhoTurma } from "@/components/painel/desempenho-turma";

export const metadata: Metadata = { title: "Relatórios — CSMG" };

// Métricas ao vivo a cada visita (mesmo comportamento do /relatorios).
export const dynamic = "force-dynamic";

const VISOES = [
  { valor: "inscricoes", rotulo: "Inscrições" },
  { valor: "turma", rotulo: "Turma" },
] as const;

export default async function RelatoriosMasterPage({
  searchParams,
}: {
  searchParams: Promise<{
    dias?: string;
    visao?: string;
    aluno?: string;
    pagina?: string;
    turma?: string;
  }>;
}) {
  await exigirPermissao("ver_relatorios");
  const parametros = await searchParams;
  const dias = resolverDias(parametros.dias);
  const visao = parametros.visao === "turma" ? "turma" : "inscricoes";
  const turmas = await buscarTurmas();
  const turma = turmaValida(resolverTurma(parametros.turma), turmas);

  return (
    <div className="animate-aparecer space-y-6">
      <nav aria-label="Visões do relatório" className="flex gap-1.5">
        {VISOES.map((v) => (
          <Link
            key={v.valor}
            href={linkRelatorio("/master/relatorios", { visao: v.valor, turma })}
            aria-current={visao === v.valor ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              visao === v.valor
                ? "border-brand-600 bg-brand-50 font-medium text-brand-900 dark:bg-brand-950/60 dark:text-brand-200"
                : "border-slate-200 text-slate-500 hover:border-brand-300"
            }`}
          >
            {v.rotulo}
          </Link>
        ))}
      </nav>

      {visao === "turma" ? (
        <DesempenhoTurma
          busca={parametros.aluno ?? ""}
          pagina={Math.max(1, Number.parseInt(parametros.pagina ?? "1", 10) || 1)}
          turma={turma}
        />
      ) : (
        <>
          <PainelMetricas
            metricas={await obterMetricas(dias, turma)}
            dias={dias}
            basePath="/master/relatorios"
            turma={turma}
            turmas={turmas}
          />
          <CardSaudeForum />
        </>
      )}
    </div>
  );
}
