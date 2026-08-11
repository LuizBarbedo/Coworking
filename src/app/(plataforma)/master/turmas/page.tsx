import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { FormAcao } from "@/components/ui/form-acao";
import { paraInputLocal } from "@/lib/datas";
import { dataLiberacaoFormatada, turmaLiberada } from "@/lib/turmas";
import { buscarTurmas } from "@/lib/turmas-dados";
import { salvarTurma, criarTurma } from "./actions";

export const metadata: Metadata = { title: "Turmas — CSMG Master" };
export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export default async function TurmasMasterPage() {
  await exigirAdmin();
  const turmas = await buscarTurmas();
  const admin = createSupabaseAdminClient();

  // Contagens por turma (coluna existe junto com a tabela — 0023).
  const inscritosPorTurma = new Map<number, { total: number; ativados: number }>();
  if (turmas.length > 0) {
    const { data } = await admin.from("inscricoes").select("turma, ativado_em");
    for (const i of data ?? []) {
      const numero = (i.turma as number | null) ?? 1;
      const atual = inscritosPorTurma.get(numero) ?? { total: 0, ativados: 0 };
      atual.total++;
      if (i.ativado_em) atual.ativados++;
      inscritosPorTurma.set(numero, atual);
    }
  }

  return (
    <div className="animate-aparecer">
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        Turmas
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        A data de liberação controla o acesso na hora: antes dela, inscrição
        da turma não ativa conta e cai na página de espera; depois dela, o
        acesso abre sozinho. O e-mail de convite continua saindo pelo botão
        da aba E-mails.
      </p>

      {turmas.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          A migração 0023 (turmas) ainda não foi aplicada no Supabase — as
          turmas aparecem aqui depois dela.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {turmas.map((t) => {
            const liberada = turmaLiberada(t);
            const contagem = inscritosPorTurma.get(t.numero) ?? {
              total: 0,
              ativados: 0,
            };
            return (
              <section
                key={t.numero}
                className="rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-brand-900 dark:text-brand-100">
                    {t.nome ?? `Turma ${t.numero}`}
                  </h2>
                  {liberada ? (
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Liberada
                    </span>
                  ) : (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      Abre em {dataLiberacaoFormatada(t)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {contagem.total} inscrição(ões) · {contagem.ativados}{" "}
                  conta(s) ativada(s)
                </p>
                <FormAcao action={salvarTurma} className="mt-4">
                  <input type="hidden" name="numero" value={t.numero} />
                  <label
                    htmlFor={`turma-${t.numero}-liberacao`}
                    className="mb-1 block text-xs font-medium text-slate-500"
                  >
                    Liberação do acesso (Brasília) — vazio = liberada
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id={`turma-${t.numero}-liberacao`}
                      name="liberacao"
                      type="datetime-local"
                      defaultValue={paraInputLocal(t.liberacao_em)}
                      className={`${inputClass} max-w-56`}
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
                    >
                      Salvar
                    </button>
                  </div>
                </FormAcao>
              </section>
            );
          })}

          <section className="rounded-xl border border-dashed border-slate-300 bg-superficie p-4">
            <h2 className="font-display text-lg font-bold text-brand-900 dark:text-brand-100">
              Nova turma
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Cria a Turma{" "}
              {Math.max(...turmas.map((t) => t.numero)) + 1} e, a partir daí,
              <strong> toda inscrição nova cai nela</strong>. Crie só quando a
              virada for pra valer.
            </p>
            <FormAcao action={criarTurma} className="mt-4">
              <label
                htmlFor="nova-turma-liberacao"
                className="mb-1 block text-xs font-medium text-slate-500"
              >
                Liberação do acesso (Brasília) — vazio = já liberada
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="nova-turma-liberacao"
                  name="liberacao"
                  type="datetime-local"
                  className={`${inputClass} max-w-56`}
                />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                >
                  Criar turma
                </button>
              </div>
            </FormAcao>
          </section>
        </div>
      )}
    </div>
  );
}
