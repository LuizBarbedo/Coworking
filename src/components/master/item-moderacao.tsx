"use client";

// Item pendente na caixa de moderação: conteúdo completo, veredito da IA e
// as ações de aprovar/rejeitar (com motivo opcional, visível ao autor).

import { useActionState, useState } from "react";
import {
  aprovarItemForum,
  rejeitarItemForum,
  type ModeracaoState,
} from "@/app/(plataforma)/master/forum/actions";

const VEREDITO_ROTULO = {
  suspeito: "IA marcou como suspeito",
  erro: "IA indisponível — revisar manualmente",
  aprovado: "IA aprovou",
} as const;

export function ItemModeracao({
  tipo,
  id,
  titulo,
  corpo,
  opcoes,
  autor,
  contexto,
  criadoEm,
  vereditoIa,
  motivoIa,
}: {
  tipo: "post" | "resposta";
  id: string;
  titulo: string;
  corpo: string | null;
  opcoes?: string[];
  autor: string;
  contexto: string;
  criadoEm: string;
  vereditoIa: "aprovado" | "suspeito" | "erro" | null;
  motivoIa: string | null;
}) {
  const [aprovar, aprovarAction, aprovando] = useActionState<
    ModeracaoState,
    FormData
  >(aprovarItemForum, undefined);
  const [rejeitar, rejeitarAction, rejeitando] = useActionState<
    ModeracaoState,
    FormData
  >(rejeitarItemForum, undefined);
  const [rejeitando_aberto, setRejeitandoAberto] = useState(false);

  const state = aprovar ?? rejeitar;

  return (
    <li className="rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
          {tipo === "post" ? "Post" : "Resposta"}
        </span>
        <span>
          {autor} · {contexto} · {criadoEm}
        </span>
      </div>

      {vereditoIa ? (
        <p className="mt-2 rounded-lg bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {VEREDITO_ROTULO[vereditoIa]}
          {motivoIa ? ` — ${motivoIa}` : null}
        </p>
      ) : null}

      <h3 className="mt-2 font-medium text-brand-900 dark:text-brand-100">
        {titulo}
      </h3>
      {corpo ? (
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
          {corpo}
        </p>
      ) : null}
      {opcoes && opcoes.length > 0 ? (
        <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
          {opcoes.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={aprovarAction}>
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={aprovando}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {aprovando ? "Aprovando…" : "Aprovar"}
          </button>
        </form>
        {rejeitando_aberto ? (
          <form action={rejeitarAction} className="flex flex-1 flex-wrap gap-2">
            <input type="hidden" name="tipo" value={tipo} />
            <input type="hidden" name="id" value={id} />
            <input
              name="motivo"
              type="text"
              maxLength={300}
              placeholder="Motivo (o autor vai ver)"
              className="min-w-48 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={rejeitando}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {rejeitando ? "Rejeitando…" : "Confirmar rejeição"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setRejeitandoAberto(true)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
          >
            Rejeitar…
          </button>
        )}
      </div>

      {state && "error" in state ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
    </li>
  );
}
