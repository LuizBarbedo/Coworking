"use client";

import { useActionState, useEffect } from "react";
import {
  submeterQuiz,
  type QuizState,
} from "@/app/(plataforma)/(aluno)/actions";
import { tocarConquista } from "@/lib/som/sons";

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

  // Som de conquista ao ser aprovado (respeita a preferência do aluno).
  const aprovadoAgora = Boolean(state && "nota" in state && state.aprovado);
  useEffect(() => {
    if (aprovadoAgora) tocarConquista();
  }, [aprovadoAgora]);

  // Resultado da correção → tela de resultado.
  if (state && "nota" in state) {
    return (
      <div className="animate-surgir rounded-xl border border-slate-200 bg-superficie p-6 text-center shadow-sm">
        {/* Selo com o ícone que se desenha: ✓ aprovado, ✗ reprovado. */}
        <span
          className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${
            state.aprovado ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <svg
            viewBox="0 0 52 52"
            className={`h-9 w-9 ${state.aprovado ? "text-green-700" : "text-red-700"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {state.aprovado ? (
              <path d="M14 27l8 8 16-18" className="quiz-traco" />
            ) : (
              <>
                <path d="M18 18l16 16" className="quiz-traco" />
                <path d="M34 18l-16 16" className="quiz-traco quiz-traco-2" />
              </>
            )}
          </svg>
        </span>
        <p className="text-sm text-slate-500">Sua nota</p>
        <p className="mt-1 font-display text-4xl font-bold text-brand-900 dark:text-brand-100">
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
    <form action={action} className="space-y-6" data-tour="avaliacao">
      <input type="hidden" name="quizId" value={quizId} />

      {perguntas.map((pergunta, i) => (
        <div
          key={pergunta.id}
          role="group"
          aria-labelledby={`pergunta-${pergunta.id}`}
          className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm"
        >
          <p
            id={`pergunta-${pergunta.id}`}
            className="text-sm font-semibold text-brand-900 dark:text-brand-100"
          >
            {i + 1}. {pergunta.enunciado}
          </p>
          <div className="mt-3 space-y-2">
            {pergunta.alternativas.map((alt, j) => (
              <label
                key={alt.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:has-[:checked]:bg-brand-900/40"
              >
                <input
                  type="radio"
                  name={`resposta_${pergunta.id}`}
                  value={alt.id}
                  required
                  className="peer sr-only"
                />
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md border border-slate-300 text-xs font-semibold text-slate-500 peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white">
                  {String.fromCharCode(65 + j)}
                </span>
                {alt.texto}
              </label>
            ))}
          </div>
        </div>
      ))}

      {state && "error" in state ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Corrigindo…" : "Enviar respostas"}
      </button>
    </form>
  );
}
