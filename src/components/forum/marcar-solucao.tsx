"use client";

import { useActionState } from "react";
import {
  marcarSolucao,
  type ForumState,
} from "@/app/(plataforma)/(aluno)/forum/actions";
import { useFeedbackDeAcao } from "@/components/ui/form-acao";

export function MarcarSolucao({
  postId,
  respostaId,
}: {
  postId: string;
  respostaId: string;
}) {
  const [state, action, pending] = useActionState<ForumState, FormData>(
    marcarSolucao,
    undefined,
  );
  useFeedbackDeAcao(state, { toastErro: false });

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="respostaId" value={respostaId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-emerald-300 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
      >
        {pending ? "Marcando…" : "Marcar como solução"}
      </button>
      {state && "error" in state ? (
        <span className="text-xs text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}
