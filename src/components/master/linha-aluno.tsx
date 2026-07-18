"use client";

import { useActionState } from "react";
import {
  reenviarConviteAluno,
  type EquipeState,
} from "@/app/(plataforma)/master/equipe/actions";
import { MensagemEquipe } from "@/components/master/form-cadastrar-monitor";

export function LinhaAluno({
  id,
  nome,
  email,
  matricula,
  ativado,
}: {
  id: string;
  nome: string;
  email: string;
  matricula: string;
  ativado: boolean;
}) {
  const [state, action, pending] = useActionState<EquipeState, FormData>(
    reenviarConviteAluno,
    undefined,
  );

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-brand-900 dark:text-brand-100">
          {nome}
        </p>
        <p className="truncate text-xs text-slate-500">
          {email} · matrícula {matricula}
        </p>
        <MensagemEquipe state={state} />
      </div>
      {ativado ? (
        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Ativo
        </span>
      ) : (
        <form action={action}>
          <input type="hidden" name="inscricaoId" value={id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {pending ? "Reenviando…" : "Reenviar convite"}
          </button>
        </form>
      )}
    </li>
  );
}
