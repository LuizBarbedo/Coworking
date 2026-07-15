"use client";

import { useSyncExternalStore } from "react";
import { definirSom, somAtivo, tocarConclusao } from "@/lib/som/sons";

// Assinantes para refletir a mudança da preferência entre instâncias.
const assinantes = new Set<() => void>();
function assinar(cb: () => void) {
  assinantes.add(cb);
  return () => assinantes.delete(cb);
}

/** Liga/desliga os sons de conquista (desligado por padrão). */
export function SomToggle({ className = "" }: { className?: string }) {
  const ativo = useSyncExternalStore(assinar, somAtivo, () => false);

  function alternar() {
    const novo = !ativo;
    definirSom(novo);
    assinantes.forEach((cb) => cb());
    if (novo) tocarConclusao(); // prévia ao ativar
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={ativo ? "Desligar sons de conquista" : "Ligar sons de conquista"}
      aria-pressed={ativo}
      title={ativo ? "Sons ativados" : "Sons desativados"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-brand-300 hover:text-brand-600 ${className}`}
    >
      {ativo ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
          <path d="M22 9l-6 6M16 9l6 6" />
        </svg>
      )}
    </button>
  );
}
