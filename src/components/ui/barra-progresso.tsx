/** Barra de progresso simples. `pct` de 0 a 100. */
export function BarraProgresso({
  pct,
  label,
}: {
  pct: number;
  label?: string;
}) {
  const valor = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span className="font-medium text-slate-700">{valor}%</span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            valor >= 100 ? "bg-ambar-500" : "bg-brand-600"
          }`}
          style={{ width: `${valor}%` }}
        />
        {/* 100% vira âmbar: a cor de celebração da marca. */}
      </div>
    </div>
  );
}
