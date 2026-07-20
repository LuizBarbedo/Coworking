"use client";

// Card de avaliação da disciplina: aparece quando o aluno conclui (aulas
// vistas e avaliação aprovada, quando houver). Estrelas 1–5 + comentário
// opcional; o feedback vai anônimo pro relatório da equipe.
import { useState } from "react";
import { FormAcao } from "@/components/ui/form-acao";
import { avaliarDisciplina } from "@/app/(plataforma)/(aluno)/actions";

export function AvaliacaoDisciplina({
  disciplinaId,
  avaliacaoAtual,
}: {
  disciplinaId: string;
  avaliacaoAtual: { estrelas: number; comentario: string | null } | null;
}) {
  const [estrelas, setEstrelas] = useState(avaliacaoAtual?.estrelas ?? 0);

  return (
    <section className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-900 dark:bg-brand-950/30">
      <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">
        {avaliacaoAtual
          ? "Sua avaliação desta disciplina"
          : "Você concluiu — o que achou desta disciplina?"}
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Sua opinião vai anônima pra equipe do curso e ajuda a melhorar as
        próximas turmas.
      </p>

      <FormAcao action={avaliarDisciplina} className="mt-4 space-y-3">
        <input type="hidden" name="disciplinaId" value={disciplinaId} />
        <input type="hidden" name="estrelas" value={estrelas || ""} />
        <div
          role="radiogroup"
          aria-label="Nota de 1 a 5 estrelas"
          className="flex gap-1"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={estrelas === n}
              aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
              onClick={() => setEstrelas(n)}
              className={`text-3xl transition hover:scale-110 ${
                n <= estrelas ? "text-amber-400" : "text-slate-300 dark:text-slate-600"
              }`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          name="comentario"
          rows={2}
          maxLength={1000}
          defaultValue={avaliacaoAtual?.comentario ?? ""}
          placeholder="Quer contar mais? (opcional)"
          className="w-full rounded-lg border border-slate-300 bg-superficie px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
        <button
          type="submit"
          disabled={estrelas === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {avaliacaoAtual ? "Atualizar avaliação" : "Enviar avaliação"}
        </button>
      </FormAcao>
    </section>
  );
}
