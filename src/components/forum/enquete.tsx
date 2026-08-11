"use client";

// Enquete do post: quem não votou escolhe uma opção (voto definitivo);
// quem já votou (ou é o autor) vê os resultados em barras.

import { useActionState, useState } from "react";
import {
  votarEnquete,
  type ForumState,
} from "@/app/(plataforma)/(aluno)/forum/actions";

export type OpcaoEnquete = { id: string; texto: string; votos: number };

export function Enquete({
  postId,
  opcoes,
  votoDoAluno,
  mostrarResultado,
}: {
  postId: string;
  opcoes: OpcaoEnquete[];
  votoDoAluno: string | null;
  mostrarResultado: boolean;
}) {
  const [state, action, pending] = useActionState<ForumState, FormData>(
    votarEnquete,
    undefined,
  );
  const [escolha, setEscolha] = useState<string | null>(null);
  const total = opcoes.reduce((soma, o) => soma + o.votos, 0);

  if (votoDoAluno || mostrarResultado) {
    return (
      <div className="space-y-2">
        {opcoes.map((o) => {
          const pct = total > 0 ? Math.round((o.votos / total) * 100) : 0;
          const minha = o.id === votoDoAluno;
          return (
            <div key={o.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span
                  className={
                    minha
                      ? "font-medium text-brand-900 dark:text-brand-100"
                      : "text-slate-700"
                  }
                >
                  {o.texto}
                  {minha ? " · seu voto" : ""}
                </span>
                <span className="tabular-nums text-xs text-slate-400">
                  {o.votos} ({pct}%)
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500/80"
                  style={{ width: `${Math.max(pct, o.votos > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-xs text-slate-400">
          {total} voto(s) — o voto é definitivo.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      {opcoes.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-brand-300"
        >
          <input
            type="radio"
            name="opcaoId"
            value={o.id}
            checked={escolha === o.id}
            onChange={() => setEscolha(o.id)}
            className="h-4 w-4 accent-brand-600"
          />
          {o.texto}
        </label>
      ))}
      {state && "error" in state ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !escolha}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Votando…" : "Votar"}
      </button>
    </form>
  );
}
