import type { PontoSerie } from "@/lib/metricas";

/** "2026-07-03" -> "03/07" (a data já vem no fuso de São Paulo do banco). */
function diaMes(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/**
 * Gráfico de barras da evolução diária de inscrições. Server component, sem
 * biblioteca externa: as barras são divs com altura proporcional ao pico.
 */
export function GraficoEvolucao({ serie }: { serie: PontoSerie[] }) {
  const maximo = Math.max(1, ...serie.map((p) => p.total));
  const totalPeriodo = serie.reduce((soma, p) => soma + p.total, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">Evolução das inscrições</h2>
        <span className="text-sm text-slate-500">
          {totalPeriodo} nos últimos {serie.length} dias
        </span>
      </div>

      {totalPeriodo === 0 ? (
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
              >
                <div
                  className="w-full rounded-t bg-brand-500 transition-[height,background-color] duration-500 group-hover:bg-brand-600"
                  style={{
                    height: `${Math.max((ponto.total / maximo) * 100, ponto.total > 0 ? 4 : 0)}%`,
                  }}
                  title={`${diaMes(ponto.dia)}: ${ponto.total} inscrição(ões)`}
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
        </>
      )}
    </div>
  );
}
