// Barra "Anterior / Próxima" no rodapé da disciplina: transforma o catálogo
// em trilha de curso. Recebe as vizinhas já resolvidas (lib/navegacao-curso).
import Link from "next/link";
import type { Vizinha } from "@/lib/navegacao-curso";

function Chevron({ lado }: { lado: "esq" | "dir" }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d={lado === "esq" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

export function NavSequencial({
  anterior,
  proxima,
}: {
  anterior: Vizinha | null;
  proxima: Vizinha | null;
}) {
  if (!anterior && !proxima) return null;

  return (
    <nav
      aria-label="Navegação entre disciplinas"
      className="mt-10 flex items-stretch justify-between gap-3 border-t border-slate-200 pt-6"
    >
      {anterior ? (
        <Link
          href={anterior.href}
          className="inline-flex max-w-[48%] items-center gap-2 rounded-lg border border-slate-300 bg-superficie px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 active:scale-[0.98] dark:text-slate-200 dark:hover:text-brand-100"
        >
          <Chevron lado="esq" />
          <span className="min-w-0">
            <span className="block text-xs font-normal text-slate-500">
              Anterior{anterior.modulo ? ` · ${anterior.modulo}` : ""}
            </span>
            <span className="block truncate">{anterior.titulo}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {proxima ? (
        <Link
          href={proxima.href}
          className="inline-flex max-w-[48%] items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-right text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
        >
          <span className="min-w-0">
            <span className="block text-xs font-normal text-brand-100">
              Próxima{proxima.modulo ? ` · ${proxima.modulo}` : ""}
            </span>
            <span className="block truncate">{proxima.titulo}</span>
          </span>
          <Chevron lado="dir" />
        </Link>
      ) : null}
    </nav>
  );
}
