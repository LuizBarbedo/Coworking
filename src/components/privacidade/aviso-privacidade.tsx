"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  avisoVisto,
  EVENTO_AVISO,
  marcarAvisoVisto,
} from "@/lib/aviso-privacidade";

function assinar(avisar: () => void) {
  window.addEventListener(EVENTO_AVISO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO_AVISO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

// No servidor o aviso não aparece (evita flash na hidratação); no cliente,
// aparece só enquanto o visitante não dispensar.
function snapshotServidor(): boolean {
  return true;
}

export function AvisoPrivacidade() {
  const visto = useSyncExternalStore(assinar, avisoVisto, snapshotServidor);

  if (visto) return null;

  return (
    <aside
      role="region"
      aria-label="Aviso de privacidade"
      className="animate-surgir fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-slate-200 bg-superficie p-5 shadow-lg sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">
          Este site usa apenas cookies essenciais (sessão e preferências) e
          conta as visitas de forma anônima para medir a divulgação — sem
          cookies de terceiros e sem identificar você.{" "}
          <Link
            href="/privacidade"
            className="font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
          >
            Saiba mais
          </Link>
        </p>
        <button
          type="button"
          onClick={marcarAvisoVisto}
          className="flex-none rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 active:scale-[0.98] dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-white"
        >
          Entendi
        </button>
      </div>
    </aside>
  );
}
