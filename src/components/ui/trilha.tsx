// Trilha de navegação (breadcrumb) das páginas fundas: cada nível anterior é
// um botão clicável; o nível atual é só texto. Separador em chevron SVG.
import Link from "next/link";

export type ItemTrilha = { titulo: string; href?: string };

function Separador() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-slate-400"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function Trilha({ itens }: { itens: ItemTrilha[] }) {
  return (
    <nav aria-label="Trilha de navegação">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {itens.map((item, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 ? <Separador /> : null}
            {item.href ? (
              <Link
                href={item.href}
                className="inline-flex max-w-56 items-center rounded-lg border border-slate-300 bg-superficie px-2.5 py-1 font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 active:scale-[0.98] dark:hover:text-brand-100"
              >
                <span className="truncate">{item.titulo}</span>
              </Link>
            ) : (
              <span
                aria-current="page"
                className="max-w-56 truncate px-1 py-1 text-slate-500"
              >
                {item.titulo}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
