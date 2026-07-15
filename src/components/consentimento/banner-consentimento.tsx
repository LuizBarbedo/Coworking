"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  EVENTO_CONSENTIMENTO,
  lerConsentimento,
  salvarConsentimento,
  type Consentimento,
} from "@/lib/consentimento";

function assinar(avisar: () => void) {
  window.addEventListener(EVENTO_CONSENTIMENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO_CONSENTIMENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

// No servidor o banner não aparece (evita flash na hidratação); no cliente,
// aparece só enquanto não houver decisão salva.
function snapshotServidor(): Consentimento | null {
  return "essencial";
}

export function BannerConsentimento() {
  const consentimento = useSyncExternalStore(
    assinar,
    lerConsentimento,
    snapshotServidor,
  );

  if (consentimento !== null) return null;

  return (
    <aside
      role="region"
      aria-label="Aviso de privacidade"
      className="animate-surgir fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-slate-200 bg-superficie p-5 shadow-lg sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">
          Usamos seus dados de inscrição para criar sua conta e registramos, de
          forma agregada, a origem da visita (ex.: campanha no Instagram) para
          medir nossa divulgação. Se você aceitar, também poderemos usar
          cookies de medição de parceiros.{" "}
          <Link
            href="/privacidade"
            className="font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
          >
            Saiba mais
          </Link>
        </p>
        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            onClick={() => salvarConsentimento("essencial")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Só o essencial
          </button>
          <button
            type="button"
            onClick={() => salvarConsentimento("total")}
            className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 active:scale-[0.98] dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-white"
          >
            Aceitar
          </button>
        </div>
      </div>
    </aside>
  );
}
