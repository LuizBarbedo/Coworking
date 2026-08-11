"use client";

import { useActionState, useState } from "react";
import {
  cadastrarMonitor,
  type EquipeState,
} from "@/app/(plataforma)/master/equipe/actions";
import { PERMISSOES, ROTULOS_PERMISSOES } from "@/lib/permissoes";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function MensagemEquipe({ state }: { state: EquipeState }) {
  if (!state) return null;
  if ("error" in state) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      <p>{state.ok}</p>
      {state.link ? <CampoLinkConvite link={state.link} /> : null}
    </div>
  );
}

/** Link direto do convite, pronto pra copiar e mandar por qualquer canal. */
function CampoLinkConvite({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex items-center gap-1.5">
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full min-w-0 rounded-md border border-emerald-200 bg-superficie px-2 py-1 text-xs text-slate-700 dark:border-emerald-900"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
        className="flex-none rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-medium transition hover:bg-emerald-100 dark:border-emerald-800 dark:hover:bg-emerald-900/40"
      >
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

export function FormCadastrarMonitor() {
  const [state, action, pending] = useActionState<EquipeState, FormData>(
    cadastrarMonitor,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <div>
        <label
          htmlFor="monitor-nome"
          className="mb-1 block text-xs font-medium text-slate-500"
        >
          Nome
        </label>
        <input
          id="monitor-nome"
          name="nome"
          type="text"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="monitor-email"
          className="mb-1 block text-xs font-medium text-slate-500"
        >
          E-mail
        </label>
        <input
          id="monitor-email"
          name="email"
          type="email"
          required
          className={inputClass}
        />
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-slate-500">
          Permissões
        </legend>
        <div className="space-y-1.5">
          {PERMISSOES.map((p) => (
            <label
              key={p}
              className="flex items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name="permissoes"
                value={p}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              {ROTULOS_PERMISSOES[p]}
            </label>
          ))}
        </div>
      </fieldset>

      <MensagemEquipe state={state} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Enviando convite…" : "Cadastrar e convidar"}
      </button>
    </form>
  );
}
