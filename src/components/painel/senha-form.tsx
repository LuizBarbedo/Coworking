"use client";

import { useActionState } from "react";
import { entrarPainel, type PainelState } from "@/app/(painel)/actions";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function SenhaForm() {
  const [state, action, pending] = useActionState<PainelState, FormData>(
    entrarPainel,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="senha"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Senha de acesso
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
