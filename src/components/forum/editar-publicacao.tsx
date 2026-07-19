"use client";

// Edição inline da própria publicação (post ou resposta) e exclusão com
// confirmação em dois cliques — nada de dialog nativo.

import { useActionState, useState } from "react";
import {
  apagarPost,
  apagarResposta,
  editarPost,
  editarResposta,
  type ForumState,
} from "@/app/(plataforma)/(aluno)/forum/actions";
import { useFeedbackDeAcao } from "@/components/ui/form-acao";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function EditarPublicacao({
  postId,
  respostaId,
  titulo,
  corpo,
}: {
  postId: string;
  /** Presente = edição de resposta; ausente = edição do post. */
  respostaId?: string;
  titulo?: string;
  corpo: string | null;
}) {
  const [state, action, pending] = useActionState<ForumState, FormData>(
    respostaId ? editarResposta : editarPost,
    undefined,
  );
  const [aberto, setAberto] = useState(false);
  // Toast de "Edição salva." + fecha o form; erro (ex.: recusa da IA, que
  // pode ser longo) fica inline.
  useFeedbackDeAcao(state, {
    toastErro: false,
    aoSucesso: () => setAberto(false),
  });

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-brand-300 hover:text-brand-900 dark:hover:text-brand-100"
      >
        Editar
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 w-full space-y-2">
      <input type="hidden" name="postId" value={postId} />
      {respostaId ? (
        <input type="hidden" name="respostaId" value={respostaId} />
      ) : null}
      {respostaId ? null : (
        <input
          name="titulo"
          type="text"
          defaultValue={titulo}
          required
          minLength={3}
          maxLength={200}
          className={inputClass}
        />
      )}
      <textarea
        name="corpo"
        rows={4}
        maxLength={5000}
        required={Boolean(respostaId)}
        defaultValue={corpo ?? ""}
        className={inputClass}
      />
      {state && "error" in state ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Salvando… (passa pela moderação)" : "Salvar edição"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function ApagarPublicacao({
  postId,
  respostaId,
}: {
  postId: string;
  /** Presente = apaga a resposta; ausente = apaga o post inteiro. */
  respostaId?: string;
}) {
  const [state, action, pending] = useActionState<ForumState, FormData>(
    respostaId ? apagarResposta : apagarPost,
    undefined,
  );
  const [confirmando, setConfirmando] = useState(false);
  // "Resposta apagada." vira toast (post apagado redireciona, sem estado).
  useFeedbackDeAcao(state, { toastErro: false });

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        Apagar
      </button>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="postId" value={postId} />
      {respostaId ? (
        <input type="hidden" name="respostaId" value={respostaId} />
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {pending
          ? "Apagando…"
          : respostaId
            ? "Confirmar: apagar resposta"
            : "Confirmar: apagar publicação e respostas"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="text-xs text-slate-500 underline-offset-2 hover:underline"
      >
        cancelar
      </button>
      {state && "error" in state ? (
        <span className="text-xs text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}
