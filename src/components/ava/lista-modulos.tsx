"use client";

// Lista de módulos do painel do aluno: alterna entre miniaturas (padrão, com
// capa) e lista compacta; módulos ainda não publicados aparecem esmaecidos e
// inacessíveis com o selo "Em breve". A preferência fica no localStorage.
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarraProgresso } from "@/components/ui/barra-progresso";

export type CardModulo = {
  id: string;
  titulo: string;
  instrutor: string | null;
  capaUrl: string | null;
  /** Presentes só nos publicados — o teaser "em breve" não expõe conteúdo. */
  slug?: string;
  descricao?: string | null;
  pct?: number;
  feitas?: number;
  total?: number;
  publicado: boolean;
  /** Texto já formatado ("20/07 às 8h") de quando o módulo libera. */
  disponivelEm?: string | null;
};

type Visualizacao = "miniaturas" | "lista";
const CHAVE = "modulos-visualizacao";

function Capa({
  modulo,
  className,
}: {
  modulo: CardModulo;
  className: string;
}) {
  if (modulo.capaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={modulo.capaUrl}
        alt=""
        aria-hidden
        className={`${className} object-cover ${modulo.publicado ? "" : "grayscale"}`}
      />
    );
  }
  // Sem capa: gradiente da marca com a inicial do módulo.
  return (
    <div
      aria-hidden
      className={`${className} flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-500`}
    >
      <span className="font-display text-3xl font-bold text-white/60">
        {modulo.titulo.charAt(0)}
      </span>
    </div>
  );
}

function SeloEmBreve({ quando }: { quando?: string | null }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      {quando ? `Em breve · ${quando}` : "Em breve"}
    </span>
  );
}

export function ListaModulos({ modulos }: { modulos: CardModulo[] }) {
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("miniaturas");

  useEffect(() => {
    const salva = window.localStorage.getItem(CHAVE);
    if (salva === "lista") {
      // setState síncrono em effect é proibido pelo lint do projeto.
      const timer = setTimeout(() => setVisualizacao("lista"), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  function trocar(nova: Visualizacao) {
    setVisualizacao(nova);
    window.localStorage.setItem(CHAVE, nova);
  }

  const botaoToggle = (ativa: boolean) =>
    `inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
      ativa
        ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
        : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600"
    }`;

  return (
    <div>
      <div className="mt-8 flex items-center justify-end gap-2">
        <button
          type="button"
          aria-pressed={visualizacao === "miniaturas"}
          title="Ver como miniaturas"
          onClick={() => trocar("miniaturas")}
          className={botaoToggle(visualizacao === "miniaturas")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
        <button
          type="button"
          aria-pressed={visualizacao === "lista"}
          title="Ver como lista"
          onClick={() => trocar("lista")}
          className={botaoToggle(visualizacao === "lista")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>
      </div>

      {visualizacao === "miniaturas" ? (
        <ul className="escalonado mt-3 grid gap-4 sm:grid-cols-2" data-tour="modulos">
          {modulos.map((m) =>
            m.publicado && m.slug ? (
              <li key={m.id}>
                <Link
                  href={`/modulos/${m.slug}`}
                  data-conteudo={(m.total ?? 0) > 0 ? "1" : "0"}
                  className="block h-full overflow-hidden rounded-xl border border-slate-200 bg-superficie shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                >
                  <Capa modulo={m} className="aspect-video w-full" />
                  <div className="p-5">
                    <h2 className="font-semibold text-brand-900 dark:text-brand-100">
                      {m.titulo}
                    </h2>
                    {m.instrutor ? (
                      <p className="mt-0.5 text-sm text-slate-500">{m.instrutor}</p>
                    ) : null}
                    {m.descricao ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {m.descricao}
                      </p>
                    ) : null}
                    <div className="mt-4">
                      <BarraProgresso
                        pct={m.pct ?? 0}
                        label={`${m.feitas ?? 0} de ${m.total ?? 0} aulas`}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            ) : (
              <li key={m.id}>
                <div className="h-full overflow-hidden rounded-xl border border-dashed border-slate-300 bg-superficie opacity-70 shadow-sm">
                  <Capa modulo={m} className="aspect-video w-full opacity-80" />
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-semibold text-slate-600 dark:text-slate-300">
                        {m.titulo}
                      </h2>
                      <SeloEmBreve quando={m.disponivelEm} />
                    </div>
                    {m.instrutor ? (
                      <p className="mt-0.5 text-sm text-slate-500">{m.instrutor}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      ) : (
        <ul className="escalonado mt-3 space-y-2" data-tour="modulos">
          {modulos.map((m) =>
            m.publicado && m.slug ? (
              <li key={m.id}>
                <Link
                  href={`/modulos/${m.slug}`}
                  data-conteudo={(m.total ?? 0) > 0 ? "1" : "0"}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 bg-superficie p-3 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <Capa modulo={m} className="h-14 w-24 flex-none rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-brand-900 dark:text-brand-100">
                      {m.titulo}
                    </h2>
                    {m.instrutor ? (
                      <p className="truncate text-sm text-slate-500">{m.instrutor}</p>
                    ) : null}
                  </div>
                  <div className="hidden w-40 flex-none sm:block">
                    <BarraProgresso
                      pct={m.pct ?? 0}
                      label={`${m.feitas ?? 0} de ${m.total ?? 0} aulas`}
                    />
                  </div>
                </Link>
              </li>
            ) : (
              <li key={m.id}>
                <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-superficie p-3 opacity-70">
                  <Capa modulo={m} className="h-14 w-24 flex-none rounded-lg opacity-80" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-slate-600 dark:text-slate-300">
                      {m.titulo}
                    </h2>
                    {m.instrutor ? (
                      <p className="truncate text-sm text-slate-500">{m.instrutor}</p>
                    ) : null}
                  </div>
                  <SeloEmBreve quando={m.disponivelEm} />
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
