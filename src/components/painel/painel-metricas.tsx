// Conteúdo do painel de métricas de inscrição, compartilhado entre o
// /relatorios (senha única, sem conta) e a aba Relatórios da administração.
// Os filtros (turma, período) ficam na BarraFiltros de cada página — aqui
// é só o conteúdo do recorte já resolvido.

import type { Metricas } from "@/lib/metricas";
import { linkRelatorio } from "@/lib/relatorios-links";
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

export function PainelMetricas({
  metricas,
  dias,
  turma = null,
}: {
  metricas: Metricas;
  dias: number;
  /** Recorte por turma ativo — null mostra todas (padrão pré-0023). */
  turma?: number | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-brand-900 dark:text-brand-100">
          Acompanhamento de inscrições
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
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
          href={linkRelatorio("/relatorios/exportar", { tipo: "origens", dias, turma })}
          className="underline transition hover:text-brand-900 dark:hover:text-brand-100"
        >
          origens do tráfego
        </a>{" "}
        ·{" "}
        <a
          href={linkRelatorio("/relatorios/exportar", { tipo: "serie", dias, turma })}
          className="underline transition hover:text-brand-900 dark:hover:text-brand-100"
        >
          série diária
        </a>{" "}
        — abre direto no Excel/planilha.
      </p>
    </div>
  );
}
