// Conteúdo do painel de métricas de inscrição, compartilhado entre o
// /relatorios (senha única, sem conta) e a aba Relatórios da administração.
// basePath parametriza os links de período/exportação de cada contexto.

import Link from "next/link";
import type { Metricas } from "@/lib/metricas";
import { compararPeriodos, type Variacao } from "@/lib/variacao";
import { Contador } from "@/components/ui/contador";
import { GraficoEvolucao } from "@/components/painel/grafico-evolucao";
import { TabelaOrigens } from "@/components/painel/tabela-origens";
import { GeradorUtm } from "@/components/painel/gerador-utm";

export const PERIODOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
] as const;

/** Resolve o ?dias= da URL pra um período válido (padrão 30). */
export function resolverDias(valor: string | undefined): number {
  return PERIODOS.find((p) => String(p.dias) === valor)?.dias ?? 30;
}

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

const CORES_VARIACAO = {
  alta: "text-emerald-600 dark:text-emerald-400",
  queda: "text-red-600 dark:text-red-400",
  estavel: "text-slate-400",
} as const;

function Cartao({
  rotulo,
  valor,
  detalhe,
  variacao,
  referencia,
}: {
  rotulo: string;
  valor: number;
  detalhe?: string;
  /** Comparação com o período anterior — some sem a migração 0014. */
  variacao?: Variacao | null;
  referencia?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{rotulo}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <Contador
          valor={valor}
          className="block font-display text-3xl font-bold text-brand-900 dark:text-brand-100"
        />
        {variacao ? (
          <span
            className={`text-xs font-medium ${CORES_VARIACAO[variacao.direcao]}`}
          >
            {variacao.direcao === "alta" ? "▲ " : null}
            {variacao.direcao === "queda" ? "▼ " : null}
            {variacao.texto}
            {referencia ? ` vs. ${referencia}` : null}
          </span>
        ) : null}
      </div>
      {detalhe ? <p className="mt-1 text-xs text-slate-400">{detalhe}</p> : null}
    </div>
  );
}

function FiltroPeriodo({ dias, basePath }: { dias: number; basePath: string }) {
  return (
    <nav
      aria-label="Período do relatório"
      className="inline-flex rounded-lg border border-slate-200 bg-superficie p-0.5 text-sm shadow-sm"
    >
      {PERIODOS.map((p) => (
        <Link
          key={p.dias}
          href={`${basePath}?dias=${p.dias}`}
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

export function PainelMetricas({
  metricas,
  dias,
  basePath,
}: {
  metricas: Metricas;
  dias: number;
  basePath: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
            Acompanhamento de inscrições
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Última inscrição em {formatarUltima(metricas.ultima)}.
          </p>
        </div>
        <FiltroPeriodo dias={dias} basePath={basePath} />
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
          variacao={compararPeriodos(metricas.hoje, metricas.ontem)}
          referencia="ontem"
        />
        <Cartao
          rotulo="Últimos 7 dias"
          valor={metricas.semana}
          detalhe="Inclui o dia de hoje"
          variacao={compararPeriodos(metricas.semana, metricas.semana_anterior)}
          referencia="semana anterior"
        />
      </div>

      <GraficoEvolucao serie={metricas.serie} />

      {metricas.origens ? (
        <TabelaOrigens
          origens={metricas.origens}
          dias={dias}
          visitasPeriodo={metricas.visitas_periodo}
        />
      ) : null}

      <GeradorUtm
        enderecoBase={`https://${process.env.DOMINIO_LANDING ?? "coworkingsocial.com.br"}/`}
      />

      <p className="text-xs text-slate-400">
        Exportar CSV:{" "}
        <a
          href={`/relatorios/exportar?tipo=origens&dias=${dias}`}
          className="underline transition hover:text-brand-900 dark:hover:text-brand-100"
        >
          origens do tráfego
        </a>{" "}
        ·{" "}
        <a
          href={`/relatorios/exportar?tipo=serie&dias=${dias}`}
          className="underline transition hover:text-brand-900 dark:hover:text-brand-100"
        >
          série diária
        </a>{" "}
        — abre direto no Excel/planilha.
      </p>
    </div>
  );
}
