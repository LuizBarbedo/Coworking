import type { Metadata } from "next";
import { exigirPermissao } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { FormAcao } from "@/components/ui/form-acao";
import { resumoConvitesPorTurma } from "@/lib/convites-resumo";
import { filtrarPorTurmaLiberada } from "@/lib/turmas";
import { buscarTurmas } from "@/lib/turmas-dados";
import { dispararConvites, conferirDevolucoes } from "./actions";

export const metadata: Metadata = { title: "E-mails — CSMG Master" };
export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  enviado:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  falha: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  devolvido:
    "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

export default async function EmailsMasterPage() {
  await exigirPermissao("gerenciar_emails");
  const admin = createSupabaseAdminClient();

  const contarPorStatus = (status: string) =>
    admin
      .from("envios_email")
      .select("id", { count: "exact", head: true })
      .eq("status", status);

  const [
    primeiraBusca,
    enviosRes,
    turmas,
    convidadosRes,
    enviadosRes,
    falhasRes,
    devolvidosRes,
  ] = await Promise.all([
    admin.from("inscricoes").select("id, email, selecionado, ativado_em, turma"),
    admin
      .from("envios_email")
      .select("id, email, status, erro, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    buscarTurmas(),
    // Quem já recebeu convite — a tabela inteira, mesma régua do disparo.
    admin
      .from("envios_email")
      .select("email")
      .eq("tipo", "convite_acesso")
      .eq("status", "enviado"),
    // Totais por status sem o viés dos 300 últimos.
    contarPorStatus("enviado"),
    contarPorStatus("falha"),
    contarPorStatus("devolvido"),
  ]);
  // Coluna turma só existe com a 0023 — sem ela, refaz sem a coluna.
  const inscricoesRes = primeiraBusca.error
    ? await admin.from("inscricoes").select("id, email, selecionado, ativado_em")
    : primeiraBusca;

  const inscricoes = (inscricoesRes.data ?? []) as Array<{
    id: string;
    email: string;
    selecionado: boolean;
    ativado_em: string | null;
    turma?: number | null;
  }>;
  const envios = enviosRes.data;
  const semTabela = Boolean(enviosRes.error);
  const { aguardando } = filtrarPorTurmaLiberada(
    inscricoes.filter((i) => !i.ativado_em),
    turmas,
  );
  const totais = {
    inscritos: inscricoes.length,
    liberados: inscricoes.filter((i) => i.selecionado).length,
    ativados: inscricoes.filter((i) => i.ativado_em).length,
    aguardandoTurma: aguardando.length,
    enviados: enviadosRes.count ?? 0,
    falhas: falhasRes.count ?? 0,
    devolvidos: devolvidosRes.count ?? 0,
  };

  const emailsConvidados = new Set(
    (convidadosRes.data ?? []).map((e) => e.email.toLowerCase()),
  );
  // Cards só das turmas com data de liberação (a 1 é liberada desde sempre).
  const resumoTurmas = resumoConvitesPorTurma(
    inscricoes,
    emailsConvidados,
    turmas,
  ).filter((t) => t.dataLiberacao !== "");

  return (
    <div className="animate-aparecer">
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        E-mails de acesso
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Libere as inscrições, envie os convites com a matrícula e acompanhe
        cada envio — incluindo falhas e devoluções.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["Inscritos", totais.inscritos],
            ["Liberados", totais.liberados],
            ["Já ativaram", totais.ativados],
            ...(totais.aguardandoTurma > 0
              ? [["Aguardando turma", totais.aguardandoTurma]]
              : []),
            ["Enviados", totais.enviados],
            ["Falhas", totais.falhas],
            ["Devolvidos", totais.devolvidos],
          ] as Array<[string, number]>
        ).map(([rotulo, valor]) => (
          <div
            key={rotulo}
            className="rounded-xl border border-slate-200 bg-superficie p-4 text-center shadow-sm"
          >
            <p className="font-display text-2xl font-bold text-brand-900 dark:text-brand-100">
              {valor}
            </p>
            <p className="text-xs text-slate-500">{rotulo}</p>
          </div>
        ))}
      </div>

      {resumoTurmas.map((t) => (
        <section
          key={t.numero}
          className={`mt-6 rounded-xl border p-5 shadow-sm ${
            t.liberada
              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30"
              : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">
              {t.nome}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                t.liberada
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
              }`}
            >
              {t.liberada
                ? `Liberada em ${t.dataLiberacao}`
                : `Libera em ${t.dataLiberacao}`}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <strong>{t.inscritos}</strong>{" "}
            {t.inscritos === 1 ? "inscrito" : "inscritos"} ·{" "}
            <strong>{t.semConvite}</strong> sem convite ·{" "}
            <strong>{t.ativados}</strong>{" "}
            {t.ativados === 1 ? "conta ativada" : "contas ativadas"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t.liberada
              ? "A turma já abriu: o botão abaixo envia o convite de quem ainda não recebeu."
              : "Os convites desta turma só saem a partir da liberação — o botão abaixo não os envia antes disso."}
          </p>
        </section>
      ))}

      <div className="mt-6 flex flex-wrap gap-3">
        <FormAcao action={dispararConvites}>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
          >
            Liberar inscrições e enviar convites
          </button>
        </FormAcao>
        <FormAcao action={conferirDevolucoes}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Conferir devoluções na caixa
          </button>
        </FormAcao>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        O disparo pula quem já recebeu convite e quem já ativou a conta —
        pode rodar de novo sem duplicar e-mail. Falha e devolução voltam a
        ser incluídas na próxima rodada. Inscrições de turma que ainda não
        abriu ficam de fora e entram no disparo a partir da data de
        liberação.
      </p>

      {semTabela ? (
        <p className="mt-8 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          A migração 0020 (registro de e-mails) ainda não foi aplicada no
          Supabase — o registro dos envios aparece aqui depois dela.
        </p>
      ) : (envios ?? []).length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
          Nenhum envio registrado ainda.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-superficie shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Quando</th>
                <th className="px-4 py-2.5 font-medium">E-mail</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Erro</th>
              </tr>
            </thead>
            <tbody>
              {(envios ?? []).map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {new Intl.DateTimeFormat("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(e.created_at))}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {e.email}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[e.status] ?? ""}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="max-w-72 truncate px-4 py-2 text-xs text-slate-500">
                    {e.erro ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
