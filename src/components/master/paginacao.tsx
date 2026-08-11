// Paginador compartilhado das listas da administração (eventos, alunos da
// visão Turma). Números além do Anterior/Próxima: sem eles o master não
// sabe o tamanho da lista nem consegue pular pro fim.

import Link from "next/link";
import { janelaDePaginas } from "@/lib/paginacao";

const BOTAO =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm transition";

export function Paginacao({
  pagina,
  paginas,
  hrefPara,
}: {
  pagina: number;
  paginas: number;
  hrefPara: (pagina: number) => string;
}) {
  if (paginas <= 1) return null;
  const itens = janelaDePaginas(pagina, paginas);

  return (
    <nav
      aria-label="Paginação"
      className="mt-4 flex flex-wrap items-center justify-center gap-1.5"
    >
      {pagina > 1 ? (
        <Link
          href={hrefPara(pagina - 1)}
          rel="prev"
          className={`${BOTAO} border-slate-300 font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700`}
        >
          Anterior
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={`${BOTAO} border-transparent text-slate-300`}
        >
          Anterior
        </span>
      )}

      {itens.map((item, i) =>
        item === "…" ? (
          <span
            key={`corte-${i}`}
            aria-hidden="true"
            className="px-1 text-sm text-slate-400"
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefPara(item)}
            aria-current={item === pagina ? "page" : undefined}
            aria-label={`Página ${item}`}
            className={`${BOTAO} tabular-nums ${
              item === pagina
                ? "border-brand-600 bg-brand-600 font-semibold text-white"
                : "border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700"
            }`}
          >
            {item}
          </Link>
        ),
      )}

      {pagina < paginas ? (
        <Link
          href={hrefPara(pagina + 1)}
          rel="next"
          className={`${BOTAO} border-slate-300 font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700`}
        >
          Próxima
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={`${BOTAO} border-transparent text-slate-300`}
        >
          Próxima
        </span>
      )}
    </nav>
  );
}
