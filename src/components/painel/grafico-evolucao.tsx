import { formatarTaxaConversao } from "@/lib/conversao";
import type { PontoSerie } from "@/lib/metricas";

/** "2026-07-03" -> "03/07" (a data já vem no fuso de São Paulo do banco). */
function diaMes(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/**
 * Gráfico de barras da evolução diária. Server component, sem biblioteca
 * externa: as barras são divs com altura proporcional ao pico. Com a
 * migração 0014 aplicada, cada dia mostra as visitas (barra clara ao fundo)
 * e as inscrições (barra cheia) — o vão entre elas é o funil do dia.
 */
export function GraficoEvolucao({ serie }: { serie: PontoSerie[] }) {
  // Sem a migração 0014 nenhum ponto tem "visitas" — o gráfico fica como era.
  const medeVisitas = serie.some((p) => p.visitas !== undefined);
  const maximo = Math.max(1, ...serie.map((p) => Math.max(p.total, p.visitas ?? 0)));
  const totalPeriodo = serie.reduce((soma, p) => soma + p.total, 0);
  const visitasPeriodo = serie.reduce((soma, p) => soma + (p.visitas ?? 0), 0);

  function altura(valor: number): string {
    return `${Math.max((valor / maximo) * 100, valor > 0 ? 4 : 0)}%`;
  }

  function rotulo(ponto: PontoSerie): string {
    const inscricoes = `${ponto.total} inscrição(ões)`;
    if (!medeVisitas) return `${diaMes(ponto.dia)}: ${inscricoes}`;
    const taxa = formatarTaxaConversao(ponto.visitas, ponto.total);
    const conversao = taxa === "—" ? "" : ` — conversão ${taxa}`;
    return `${diaMes(ponto.dia)}: ${ponto.visitas ?? 0} visita(s), ${inscricoes}${conversao}`;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">
          {medeVisitas ? "Evolução do funil" : "Evolução das inscrições"}
        </h2>
        <span className="text-sm text-slate-500">
          {medeVisitas ? `${visitasPeriodo} visitas · ` : null}
          {totalPeriodo} inscrições nos últimos {serie.length} dias
        </span>
      </div>

      {totalPeriodo === 0 && visitasPeriodo === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Nenhuma inscrição registrada no período.
        </p>
      ) : (
        <>
          <div className="mt-6 flex h-40 items-end gap-1">
            {serie.map((ponto) => (
              <div
                key={ponto.dia}
                className="group relative flex flex-1 items-end"
                style={{ height: "100%" }}
                title={rotulo(ponto)}
              >
                {medeVisitas ? (
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-brand-500/25 transition-[height] duration-500"
                    style={{ height: altura(ponto.visitas ?? 0) }}
                  />
                ) : null}
                <div
                  className="relative w-full rounded-t bg-brand-500 transition-[height,background-color] duration-500 group-hover:bg-brand-600"
                  style={{ height: altura(ponto.total) }}
                />
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>{diaMes(serie[0].dia)}</span>
            {serie.length > 2 ? (
              <span>{diaMes(serie[Math.floor(serie.length / 2)].dia)}</span>
            ) : null}
            <span>{diaMes(serie[serie.length - 1].dia)}</span>
          </div>

          {medeVisitas ? (
            <div className="mt-3 flex gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-brand-500/25" aria-hidden />
                Visitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-brand-500" aria-hidden />
                Inscrições
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
