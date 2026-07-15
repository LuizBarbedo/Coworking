"use client";

import { useState } from "react";

/**
 * Bloco "Adicionar …" que começa fechado: mostra só um botão. Ao clicar, expande
 * o formulário (server-rendered, passado como children). Um "Cancelar" recolhe.
 */
export function BlocoAdicionar({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-4 w-full rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-brand-600 transition hover:border-brand-300 hover:bg-brand-50 active:scale-[0.98] dark:text-brand-300 dark:hover:bg-brand-900/40"
      >
        + {rotulo}
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-brand-900 dark:text-brand-100">{rotulo}</span>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
        >
          Cancelar
        </button>
      </div>
      {children}
    </div>
  );
}
