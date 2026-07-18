"use client";

// Recurso do autor: edita o post rejeitado e reenvia pra moderação.

import { useActionState, useState } from "react";
import {
  reenviarPost,
  type ForumState,
} from "@/app/(plataforma)/(aluno)/forum/actions";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function FormReenviar({
  postId,
  titulo,
  corpo,
}: {
  postId: string;
  titulo: string;
  corpo: string | null;
}) {
  const [state, action, pending] = useActionState<ForumState, FormData>(
    reenviarPost,
    undefined,
  );
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100/50 dark:text-red-300"
      >
        Editar e reenviar pra moderação
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <input
        name="titulo"
        type="text"
        defaultValue={titulo}
        required
        minLength={3}
        maxLength={200}
        className={inputClass}
      />
      <textarea
        name="corpo"
        rows={4}
        maxLength={5000}
        defaultValue={corpo ?? ""}
        className={inputClass}
      />
      {state && "error" in state ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Reenviando… (passa pela moderação)" : "Reenviar"}
      </button>
    </form>
  );
}
