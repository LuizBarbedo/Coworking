import Link from "next/link";

import { IconeSeta } from "./icones-landing";

/**
 * Casca comum das seções da landing de rolagem: largura, respiro, alternância
 * de fundo e o par título/subtítulo. Centralizar isso é o que mantém o ritmo
 * da página longa previsível — e o `id` é o destino das âncoras.
 *
 * `scroll-mt-24` existe por causa do CTA fixo: sem ele, a âncora encosta o
 * título embaixo da barra.
 */
export function Secao({
  id,
  titulo,
  sobretitulo,
  fundo = "background",
  children,
  className = "",
}: {
  id: string;
  titulo?: string;
  sobretitulo?: string;
  fundo?: "background" | "superficie";
  children: React.ReactNode;
  className?: string;
}) {
  const cor =
    fundo === "superficie"
      ? "bg-superficie"
      : "bg-background";
  return (
    <section
      id={id}
      className={`scroll-mt-24 border-t border-brand-100 dark:border-brand-800 ${cor} ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        {(sobretitulo || titulo) && (
          <header className="animate-surgir max-w-3xl">
            {sobretitulo && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">
                {sobretitulo}
              </p>
            )}
            {titulo && (
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-brand-900 dark:text-brand-50 sm:text-4xl">
                {titulo}
              </h2>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

/** Parágrafo padrão das seções (mesma medida de linha em toda a página). */
export function Paragrafo({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-3xl text-base leading-relaxed text-brand-900/80 dark:text-brand-100/80">
      {children}
    </p>
  );
}

/**
 * CTA da página. Sempre âncora interna para o formulário — a inscrição vive na
 * própria landing, então não há navegação a fazer, e âncora mantém o histórico
 * limpo e funciona sem JavaScript.
 */
export function BotaoCTA({
  children,
  variante = "primaria",
  className = "",
  comSeta = false,
  destino = "#inscricao",
  tabIndex,
}: {
  children: React.ReactNode;
  variante?: "primaria" | "secundaria" | "clara";
  className?: string;
  comSeta?: boolean;
  destino?: string;
  tabIndex?: number;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]";
  const variantes = {
    primaria:
      "bg-brand-800 text-white hover:bg-brand-700 focus-visible:outline-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500",
    secundaria:
      "bg-superficie text-brand-900 ring-1 ring-brand-200 hover:bg-brand-50 focus-visible:outline-brand-500 dark:text-brand-50 dark:ring-brand-700 dark:hover:bg-brand-800",
    clara:
      "bg-white text-brand-900 hover:bg-brand-50 focus-visible:outline-white",
  } as const;

  return (
    <Link
      href={destino}
      tabIndex={tabIndex}
      className={`${base} ${variantes[variante]} ${className}`}
    >
      {children}
      {comSeta && <IconeSeta />}
    </Link>
  );
}
