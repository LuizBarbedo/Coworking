"use client";

// Tabela "Origem do tráfego" do painel. Client component por causa da linha
// "outros sites (N)": clicar expande uma sublinha por site agrupado.

import { Fragment, useState } from "react";

import { formatarTaxaConversao } from "@/lib/conversao";
import type { OrigemAgregada } from "@/lib/metricas";
import { prepararOrigens, type LinhaOrigem } from "@/lib/origens-painel";

function rotuloOrigem(valor: string | null, vazio: string): string {
  return valor ?? vazio;
}

/** Barrinha de participação da linha nas visitas (proporcional ao pico). */
function BarraVisitas({ visitas, pico }: { visitas: number; pico: number }) {
  if (pico <= 0) return null;
  return (
    <span className="ml-auto mt-1 block h-1 w-16 overflow-hidden rounded-full bg-slate-100">
      <span
        className="block h-full rounded-full bg-brand-500/70"
        style={{
          width: `${Math.max((visitas / pico) * 100, visitas > 0 ? 5 : 0)}%`,
        }}
      />
    </span>
  );
}

function LinhaTabela({
  linha,
  medeVisitas,
  picoVisitas,
}: {
  linha: LinhaOrigem;
  medeVisitas: boolean;
  picoVisitas: number;
}) {
  const [aberta, setAberta] = useState(false);
  const agrupadas = linha.agrupadas;

  return (
    <Fragment>
      <tr className="border-b border-slate-100 last:border-0">
        <td className="py-2 pr-4 font-medium text-brand-900 dark:text-brand-100">
          {agrupadas ? (
            <button
              type="button"
              onClick={() => setAberta((v) => !v)}
              aria-expanded={aberta}
              className="flex items-center gap-1.5 font-medium transition hover:text-brand-600"
            >
              <span
                aria-hidden
                className={`text-[10px] transition-transform ${aberta ? "rotate-90" : ""}`}
              >
                ▶
              </span>
              {rotuloOrigem(linha.source, "direto / orgânico")}
            </button>
          ) : (
            rotuloOrigem(linha.source, "direto / orgânico")
          )}
        </td>
        <td className="py-2 pr-4 text-slate-500">
          {rotuloOrigem(linha.medium, "—")}
        </td>
        <td className="py-2 pr-4 text-slate-500">
          {rotuloOrigem(linha.campaign, "—")}
        </td>
        {medeVisitas ? (
          <td className="py-2 pr-4 text-right tabular-nums text-slate-500">
            {linha.visitas ?? 0}
            <BarraVisitas visitas={linha.visitas ?? 0} pico={picoVisitas} />
          </td>
        ) : null}
        <td className="py-2 text-right tabular-nums text-brand-900 dark:text-brand-100">
          {linha.total}
        </td>
        {medeVisitas ? (
          <td className="py-2 pl-4 text-right tabular-nums text-slate-500">
            {formatarTaxaConversao(linha.visitas, linha.total)}
          </td>
        ) : null}
      </tr>
      {aberta && agrupadas
        ? agrupadas.map((site) => (
            <tr
              key={site.source}
              className="border-b border-slate-100 text-xs last:border-0"
            >
              <td colSpan={3} className="py-1.5 pl-6 pr-4 text-slate-500">
                {site.source}
              </td>
              {medeVisitas ? (
                <td className="py-1.5 pr-4 text-right tabular-nums text-slate-400">
                  {site.visitas}
                </td>
              ) : null}
              <td className="py-1.5 text-right tabular-nums text-slate-400">
                0
              </td>
              {medeVisitas ? <td className="py-1.5 pl-4" /> : null}
            </tr>
          ))
        : null}
    </Fragment>
  );
}

export function TabelaOrigens({
  origens,
  dias,
  visitasPeriodo,
}: {
  origens: OrigemAgregada[];
  dias: number;
  visitasPeriodo?: number;
}) {
  const linhas = prepararOrigens(origens);
  const totalPeriodo = linhas.reduce((soma, o) => soma + o.total, 0);
  // Antes da migração 0013 não há contagem de visitas — esconde as colunas.
  const medeVisitas = visitasPeriodo !== undefined;
  const picoVisitas = Math.max(0, ...linhas.map((o) => o.visitas ?? 0));
  // Inscrição sem visita rastreada (rastreio chegou depois, bloqueadores…)
  // faz a conversão passar de 100% — merece a nota de rodapé.
  const conversaoEstoura =
    medeVisitas && linhas.some((o) => (o.visitas ?? 0) < o.total);

  return (
    <section className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
        Origem do tráfego
      </h3>
      <p className="mt-1 text-xs text-slate-400">
        Últimos {dias} dias por UTM da campanha (anúncios da Meta, links
        divulgados). Sem UTM = acesso direto ou orgânico.
        {medeVisitas ? " Conversão = inscrições ÷ visitas." : null}
      </p>
      {linhas.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Nenhuma visita ou inscrição no período.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4 font-medium">Fonte</th>
                <th className="py-2 pr-4 font-medium">Meio</th>
                <th className="py-2 pr-4 font-medium">Campanha</th>
                {medeVisitas ? (
                  <th className="py-2 pr-4 text-right font-medium">Visitas</th>
                ) : null}
                <th className="py-2 text-right font-medium">Inscrições</th>
                {medeVisitas ? (
                  <th className="py-2 pl-4 text-right font-medium">
                    Conversão
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, i) => (
                <LinhaTabela
                  key={`${linha.source}-${linha.medium}-${linha.campaign}-${i}`}
                  linha={linha}
                  medeVisitas={medeVisitas}
                  picoVisitas={picoVisitas}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="text-xs text-slate-400">
                <td className="pt-2" colSpan={3}>
                  Total no período
                </td>
                {medeVisitas ? (
                  <td className="pt-2 text-right tabular-nums">
                    {visitasPeriodo}
                  </td>
                ) : null}
                <td className="pt-2 text-right tabular-nums">{totalPeriodo}</td>
                {medeVisitas ? (
                  <td className="pt-2 pl-4 text-right tabular-nums">
                    {formatarTaxaConversao(visitasPeriodo, totalPeriodo)}
                  </td>
                ) : null}
              </tr>
            </tfoot>
          </table>
          {conversaoEstoura ? (
            <p className="mt-3 text-xs text-slate-400">
              Conversão acima de 100% = inscrições cuja visita não foi
              rastreada (o rastreio de visitas começou depois das inscrições;
              bloqueadores de anúncio também escondem visitas).
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
