import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Eventos — CSMG Master" };
export const dynamic = "force-dynamic";

const FILTROS = [
  { valor: "", rotulo: "Tudo" },
  { valor: "sessao.", rotulo: "Sessões" },
  { valor: "conta.", rotulo: "Ativações" },
  { valor: "aula.", rotulo: "Aulas" },
  { valor: "quiz.", rotulo: "Avaliações" },
  { valor: "forum.", rotulo: "Fórum" },
  { valor: "moderacao.", rotulo: "Moderação" },
  { valor: "conteudo.", rotulo: "Conteúdo" },
  { valor: "equipe.", rotulo: "Equipe" },
] as const;

export default async function EventosMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  await exigirAdmin();
  const { tipo = "" } = await searchParams;
  const admin = createSupabaseAdminClient();

  let consulta = admin
    .from("eventos")
    .select("id, ator_id, ator_papel, acao, alvo_tipo, alvo_id, detalhes, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (tipo) consulta = consulta.like("acao", `${tipo}%`);

  const [{ data: eventos, error }, { data: usuarios }] = await Promise.all([
    consulta,
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const nomePorId = new Map(
    (usuarios?.users ?? []).map((u) => [
      u.id,
      (u.user_metadata as { nome?: string })?.nome ?? u.email ?? u.id,
    ]),
  );

  return (
    <div className="animate-aparecer">
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        Eventos
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Trilha de auditoria: quem fez o quê e quando, em toda a plataforma.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor ? `/master/eventos?tipo=${f.valor}` : "/master/eventos"}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              tipo === f.valor
                ? "border-brand-600 bg-brand-50 font-medium text-brand-900 dark:bg-brand-950/60 dark:text-brand-200"
                : "border-slate-200 text-slate-500 hover:border-brand-300"
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="mt-8 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          A migração 0021 (trilha de auditoria) ainda não foi aplicada no
          Supabase — os eventos aparecem aqui depois dela.
        </p>
      ) : (eventos ?? []).length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
          Nenhum evento registrado ainda{tipo ? " nesse filtro" : ""}.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-superficie shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Quando</th>
                <th className="px-4 py-2.5 font-medium">Quem</th>
                <th className="px-4 py-2.5 font-medium">Ação</th>
                <th className="px-4 py-2.5 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {(eventos ?? []).map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {new Intl.DateTimeFormat("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(new Date(e.created_at))}
                  </td>
                  <td className="max-w-44 truncate px-4 py-2 text-slate-700 dark:text-slate-300">
                    {e.ator_id
                      ? (nomePorId.get(e.ator_id) ?? "conta removida")
                      : "sistema"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
                      {e.acao}
                    </span>
                  </td>
                  <td className="max-w-80 truncate px-4 py-2 text-xs text-slate-500">
                    {[
                      e.alvo_tipo ? `${e.alvo_tipo} ${String(e.alvo_id).slice(0, 8)}` : null,
                      e.detalhes ? JSON.stringify(e.detalhes) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
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
