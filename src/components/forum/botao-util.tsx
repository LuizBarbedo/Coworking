"use client";

// Voto "útil" (up-only, alterna): usado em posts e respostas.

import { useActionState } from "react";
import {
  alternarVotoPost,
  alternarVotoResposta,
  type ForumState,
} from "@/app/(plataforma)/(aluno)/forum/actions";
import { useFeedbackDeAcao } from "@/components/ui/form-acao";

export function BotaoUtil({
  postId,
  respostaId,
  votos,
  votou,
}: {
  postId: string;
  respostaId?: string;
  votos: number;
  votou: boolean;
}) {
  const [state, action, pending] = useActionState<ForumState, FormData>(
    respostaId ? alternarVotoResposta : alternarVotoPost,
    undefined,
  );
  // Voto que falhar avisa por toast (antes o erro era engolido em silêncio).
  useFeedbackDeAcao(state);

  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="postId" value={postId} />
      {respostaId ? (
        <input type="hidden" name="respostaId" value={respostaId} />
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-pressed={votou}
        title={votou ? "Remover o voto" : "Marcar como útil"}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition active:scale-[0.97] disabled:opacity-60 ${
          votou
            ? "border-brand-300 bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200"
            : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-900 dark:hover:text-brand-100"
        }`}
      >
        <span aria-hidden>▲</span>
        Útil
        <span className="tabular-nums">{votos}</span>
      </button>
    </form>
  );
}
