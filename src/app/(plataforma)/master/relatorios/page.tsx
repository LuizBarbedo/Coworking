import type { Metadata } from "next";
import { exigirPermissao } from "@/lib/auth";
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
import {
  PainelMetricas,
  PERIODOS,
  resolverDias,
} from "@/components/painel/painel-metricas";
import { BarraFiltros, type LinhaDeFiltro } from "@/components/painel/barra-filtros";
import { CardSaudeForum } from "@/components/painel/card-saude-forum";
import { DesempenhoTurma } from "@/components/painel/desempenho-turma";

export const metadata: Metadata = { title: "Relatórios — CSMG" };

// Métricas ao vivo a cada visita (mesmo comportamento do /relatorios).
export const dynamic = "force-dynamic";

const VISOES = [
  { valor: "inscricoes", rotulo: "Inscrições" },
  { valor: "turma", rotulo: "Turma" },
] as const;

const BASE = "/master/relatorios";

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

  const nomeAtual = nomeDaTurma(turma, turmas);

  // O período só existe na visão de inscrições; ao trocar de visão ele é
  // deixado pra trás de propósito, em vez de virar estado fantasma na URL.
  const linhas: LinhaDeFiltro[] = [
    {
      rotulo: "Visão",
      destaque: true,
      ativo: visao,
      opcoes: VISOES.map((v) => ({ valor: v.valor, rotulo: v.rotulo })),
      hrefPara: (v) =>
        v === "turma"
          ? linkRelatorio(BASE, { visao: "turma", turma })
          : linkRelatorio(BASE, { visao: "inscricoes", turma, dias }),
    },
    {
      rotulo: "Turma",
      ativo: turma,
      opcoes: opcoesDeTurma(turmas),
      hrefPara: (t) =>
        linkRelatorio(BASE, {
          visao,
          turma: t as number | null,
          ...(visao === "inscricoes" ? { dias } : {}),
        }),
    },
    {
      rotulo: "Período",
      ativo: visao === "inscricoes" ? dias : null,
      opcoes:
        visao === "inscricoes"
          ? PERIODOS.map((p) => ({ valor: p.dias, rotulo: p.rotulo }))
          : [],
      hrefPara: (d) =>
        linkRelatorio(BASE, { visao, turma, dias: d as number }),
    },
  ];

  const noPadrao = turma === null && (visao !== "inscricoes" || dias === 30);

  return (
    <div className="animate-aparecer space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
          Relatórios
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Captação pela landing e avanço de quem já está estudando.
        </p>
      </div>

      <BarraFiltros
        linhas={linhas}
        resumo={resumoDoRecorte({
          nomeDaTurma: nomeAtual,
          dias: visao === "inscricoes" ? dias : null,
        })}
        hrefLimpar={
          noPadrao ? undefined : linkRelatorio(BASE, { visao, dias: 30 })
        }
      />

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
            turma={turma}
          />
          <CardSaudeForum />
        </>
      )}
    </div>
  );
}
