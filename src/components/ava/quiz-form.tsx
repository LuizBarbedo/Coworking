"use client";

import { useActionState } from "react";
import {
  submeterQuiz,
  type QuizState,
} from "@/app/(plataforma)/(aluno)/actions";

type Alternativa = { id: string; texto: string };
type Pergunta = { id: string; enunciado: string; alternativas: Alternativa[] };

export function QuizForm({
  quizId,
  notaMinima,
  perguntas,
}: {
  quizId: string;
  notaMinima: number;
  perguntas: Pergunta[];
}) {
  const [state, action, pending] = useActionState<QuizState, FormData>(
    submeterQuiz,
    undefined,
  );

  // Resultado da correção → tela de resultado.
  if (state && "nota" in state) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-500">Sua nota</p>
        <p className="mt-1 text-4xl font-bold text-brand-900">
          {state.nota.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
        </p>
        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${
            state.aprovado
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {state.aprovado ? "Aprovado" : `Abaixo de ${notaMinima}%`}
        </span>
        <p className="mt-3 text-sm text-slate-500">
          {state.aprovado
            ? "Avaliação concluída com aproveitamento."
            : "Você pode revisar o conteúdo e tentar novamente."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Refazer avaliação
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="quizId" value={quizId} />

      {perguntas.map((pergunta, i) => (
        <fieldset
          key={pergunta.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <legend className="px-1 text-sm font-semibold text-brand-900">
            {i + 1}. {pergunta.enunciado}
          </legend>
          <div className="mt-3 space-y-2">
            {pergunta.alternativas.map((alt) => (
              <label
                key={alt.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
              >
                <input
                  type="radio"
                  name={`resposta_${pergunta.id}`}
                  value={alt.id}
                  required
                  className="h-4 w-4 accent-brand-600"
                />
                {alt.texto}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {state && "error" in state ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Corrigindo…" : "Enviar respostas"}
      </button>
    </form>
  );
}
