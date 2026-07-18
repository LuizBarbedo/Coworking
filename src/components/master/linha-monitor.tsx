"use client";

// Linha da equipe: admin é só leitura; monitor tem checkboxes de permissão,
// reenvio de convite e remoção — cada ação com seu próprio estado.

import { useActionState } from "react";
import {
  atualizarPermissoesMonitor,
  reenviarConviteMonitor,
  removerMonitor,
  type EquipeState,
} from "@/app/(plataforma)/master/equipe/actions";
import {
  PERMISSOES,
  ROTULOS_PERMISSOES,
  type Permissao,
} from "@/lib/permissoes";
import { MensagemEquipe } from "@/components/master/form-cadastrar-monitor";

export function LinhaMonitor({
  id,
  nome,
  email,
  nivel,
  permissoes,
}: {
  id: string;
  nome: string;
  email: string;
  nivel: "admin" | "monitor";
  permissoes: Permissao[];
}) {
  const [salvar, salvarAction, salvando] = useActionState<
    EquipeState,
    FormData
  >(atualizarPermissoesMonitor, undefined);
  const [reenviar, reenviarAction, reenviando] = useActionState<
    EquipeState,
    FormData
  >(reenviarConviteMonitor, undefined);
  const [remover, removerAction, removendo] = useActionState<
    EquipeState,
    FormData
  >(removerMonitor, undefined);

  return (
    <li className="rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-brand-900 dark:text-brand-100">
            {nome}
          </p>
          <p className="text-xs text-slate-500">{email}</p>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            nivel === "admin"
              ? "bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {nivel === "admin" ? "Administrador" : "Monitor"}
        </span>
      </div>

      {nivel === "admin" ? (
        <p className="mt-2 text-xs text-slate-400">
          Acesso total à plataforma.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <form action={salvarAction} className="space-y-2">
            <input type="hidden" name="userId" value={id} />
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {PERMISSOES.map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"
                >
                  <input
                    type="checkbox"
                    name="permissoes"
                    value={p}
                    defaultChecked={permissoes.includes(p)}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                  />
                  {ROTULOS_PERMISSOES[p]}
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar permissões"}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <form action={reenviarAction}>
              <input type="hidden" name="userId" value={id} />
              <button
                type="submit"
                disabled={reenviando}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {reenviando ? "Reenviando…" : "Reenviar convite"}
              </button>
            </form>
            <form action={removerAction}>
              <input type="hidden" name="userId" value={id} />
              <button
                type="submit"
                disabled={removendo}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                {removendo ? "Removendo…" : "Remover da equipe"}
              </button>
            </form>
          </div>

          <MensagemEquipe state={salvar ?? reenviar ?? remover} />
        </div>
      )}
    </li>
  );
}
