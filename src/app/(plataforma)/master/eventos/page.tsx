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

const POR_PAGINA = 50;

export default async function EventosMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; q?: string; pagina?: string }>;
}) {
  await exigirAdmin();
  const { tipo = "", q = "", pagina = "1" } = await searchParams;
  const paginaAtual = Math.max(1, Number.parseInt(pagina, 10) || 1);
  const admin = createSupabaseAdminClient();

  const { data: usuarios } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const nomePorId = new Map(
    (usuarios?.users ?? []).map((u) => [
      u.id,
      (u.user_metadata as { nome?: string })?.nome ?? u.email ?? u.id,
    ]),
  );

  let consulta = admin
    .from("eventos")
    .select(
      "id, ator_id, ator_papel, acao, alvo_tipo, alvo_id, detalhes, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });
  if (tipo) consulta = consulta.like("acao", `${tipo}%`);

  const termo = q.trim();
  if (termo) {
    // Busca por ação OU por quem fez (nome/e-mail resolvido pra ids).
    const seguro = termo.replace(/[%,()]/g, "").toLowerCase();
    const atoresQueBatem = (usuarios?.users ?? [])
      .filter((u) => {
        const nome = (
          (u.user_metadata as { nome?: string })?.nome ?? ""
        ).toLowerCase();
        return nome.includes(seguro) || (u.email ?? "").includes(seguro);
      })
      .map((u) => u.id)
      .slice(0, 50);
    consulta = atoresQueBatem.length
      ? consulta.or(
          `acao.ilike.%${seguro}%,ator_id.in.(${atoresQueBatem.join(",")})`,
        )
      : consulta.ilike("acao", `%${seguro}%`);
  }

  const de = (paginaAtual - 1) * POR_PAGINA;
  const {
    data: eventos,
    error,
    count,
  } = await consulta.range(de, de + POR_PAGINA - 1);
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  function link(params: { tipo?: string; q?: string; pagina?: string }): string {
    const query = new URLSearchParams();
    const final = { tipo, q: termo, pagina: "1", ...params };
    if (final.tipo) query.set("tipo", final.tipo);
    if (final.q) query.set("q", final.q);
    if (final.pagina !== "1") query.set("pagina", final.pagina);
    const s = query.toString();
    return s ? `/master/eventos?${s}` : "/master/eventos";
  }

  return (
    <div className="animate-aparecer">
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        Eventos
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Trilha de auditoria: quem fez o quê e quando, em toda a plataforma.
      </p>

      <form action="/master/eventos" className="mt-5 flex max-w-xl gap-2">
        <input
          type="search"
          name="q"
          defaultValue={termo}
          placeholder="Buscar por ação (ex.: quiz) ou por pessoa…"
          className="w-full min-w-0 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
        {tipo ? <input type="hidden" name="tipo" value={tipo} /> : null}
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
        >
          Buscar
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={link({ tipo: f.valor })}
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

      <p className="mt-3 text-xs text-slate-500">
        {total} evento(s){termo ? ` pra “${termo}”` : ""} — página {paginaAtual}{" "}
        de {paginas}
      </p>

      {error ? (
        <p className="mt-8 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          A migração 0021 (trilha de auditoria) ainda não foi aplicada no
          Supabase — os eventos aparecem aqui depois dela.
        </p>
      ) : (eventos ?? []).length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
          Nenhum evento registrado{tipo || termo ? " com esses filtros" : " ainda"}.
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

      {paginas > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          {paginaAtual > 1 ? (
            <Link
              href={link({ pagina: String(paginaAtual - 1) })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:text-slate-200"
            >
              Anterior
            </Link>
          ) : (
            <span />
          )}
          {paginaAtual < paginas ? (
            <Link
              href={link({ pagina: String(paginaAtual + 1) })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:text-slate-200"
            >
              Próxima
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
