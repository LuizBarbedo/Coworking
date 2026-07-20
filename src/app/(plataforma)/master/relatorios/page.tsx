import type { Metadata } from "next";
import Link from "next/link";
import { exigirPermissao } from "@/lib/auth";
import { obterMetricas } from "@/lib/metricas";
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
  }>;
}) {
  await exigirPermissao("ver_relatorios");
  const parametros = await searchParams;
  const dias = resolverDias(parametros.dias);
  const visao = parametros.visao === "turma" ? "turma" : "inscricoes";

  return (
    <div className="animate-aparecer space-y-6">
      <nav aria-label="Visões do relatório" className="flex gap-1.5">
        {VISOES.map((v) => (
          <Link
            key={v.valor}
            href={
              v.valor === "inscricoes"
                ? "/master/relatorios"
                : `/master/relatorios?visao=${v.valor}`
            }
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
        />
      ) : (
        <>
          <PainelMetricas
            metricas={await obterMetricas(dias)}
            dias={dias}
            basePath="/master/relatorios"
          />
          <CardSaudeForum />
        </>
      )}
    </div>
  );
}
