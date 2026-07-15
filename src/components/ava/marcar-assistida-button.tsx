"use client";

import { useActionState, useEffect } from "react";
import {
  marcarAulaAssistida,
  type MarcarState,
} from "@/app/(plataforma)/(aluno)/actions";
import { tocarConclusao } from "@/lib/som/sons";

export function MarcarAssistidaButton({
  aulaId,
  caminho,
  jaAssistida,
}: {
  aulaId: string;
  caminho: string;
  jaAssistida: boolean;
}) {
  const [state, action, pending] = useActionState<MarcarState, FormData>(
    marcarAulaAssistida,
    undefined,
  );

  // Som discreto só na transição (marcou agora), não se já vinha assistida.
  const marcouAgora = Boolean(state && "ok" in state);
  useEffect(() => {
    if (marcouAgora) tocarConclusao();
  }, [marcouAgora]);

  const concluida = jaAssistida || marcouAgora;

  if (concluida) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3.5 py-2 text-sm font-medium text-green-700">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
            clipRule="evenodd"
          />
        </svg>
        Aula concluída
      </span>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="aulaId" value={aulaId} />
      <input type="hidden" name="caminho" value={caminho} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Registrando…" : "Marcar como assistida"}
      </button>
      {state && "error" in state ? (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
