"use client";

import { useSyncExternalStore } from "react";

// A classe `dark` no <html> é a fonte da verdade do tema; o script
// anti-flash do root layout a define antes da primeira pintura e o toggle
// notifica os assinantes ao alterá-la.
const assinantes = new Set<() => void>();

function assinar(cb: () => void) {
  assinantes.add(cb);
  return () => assinantes.delete(cb);
}

function lerTema() {
  return document.documentElement.classList.contains("dark");
}

/**
 * Alterna entre tema claro e escuro. A escolha persiste em localStorage
 * ("csmg-tema") — o script anti-flash do root layout a reaplica no load.
 */
export function TemaToggle({ className = "" }: { className?: string }) {
  // No servidor renderiza como claro; o cliente lê a classe real do <html>.
  const escuro = useSyncExternalStore(assinar, lerTema, () => false);

  function alternar() {
    const novo = !escuro;
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem("csmg-tema", novo ? "escuro" : "claro");
    } catch {
      /* navegação privada sem storage: só não persiste */
    }
    assinantes.forEach((cb) => cb());
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
      title={escuro ? "Usar tema claro" : "Usar tema escuro"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-brand-300 hover:text-brand-600 ${className}`}
    >
      {escuro ? (
        /* sol */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        /* lua */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
