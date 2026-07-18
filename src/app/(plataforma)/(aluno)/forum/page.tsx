import type { Metadata } from "next";
import Link from "next/link";
import { exigirAluno } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { autoresComPerfil, contagensDosPosts } from "@/lib/forum/dados";
import { BadgeEquipe, BadgeStatus, BadgeTipo } from "@/components/forum/badges";
import { Avatar } from "@/components/perfil/avatar";
import { Comunidade } from "@/components/ilustracoes";

export const metadata: Metadata = { title: "Fórum — CSMG" };
export const dynamic = "force-dynamic";

const ORDENS = [
  { valor: "recentes", rotulo: "Recentes" },
  { valor: "uteis", rotulo: "Mais úteis" },
  { valor: "sem-resposta", rotulo: "Sem resposta" },
] as const;

type PostLista = {
  id: string;
  titulo: string;
  tipo: "duvida" | "enquete";
  status: "pendente" | "aprovado" | "rejeitado";
  disciplina_id: string | null;
  autor_id: string;
  created_at: string;
  resposta_solucao_id: string | null;
};

function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ disciplina?: string; ordem?: string }>;
}) {
  const aluno = await exigirAluno();
  const parametros = await searchParams;
  const ordem =
    ORDENS.find((o) => o.valor === parametros.ordem)?.valor ?? "recentes";
  const filtroDisciplina = parametros.disciplina ?? "";

  const supabase = await createSupabaseServerClient();

  let consulta = supabase
    .from("forum_posts")
    .select(
      "id, titulo, tipo, status, disciplina_id, autor_id, created_at, resposta_solucao_id",
    )
    .eq("status", "aprovado")
    .order("created_at", { ascending: false })
    .limit(50);
  if (filtroDisciplina === "geral") consulta = consulta.is("disciplina_id", null);
  else if (filtroDisciplina) consulta = consulta.eq("disciplina_id", filtroDisciplina);

  const [{ data: posts }, { data: disciplinas }, { data: meus }] =
    await Promise.all([
      consulta.returns<PostLista[]>(),
      supabase
        .from("disciplinas")
        .select("id, titulo")
        .order("ordem", { ascending: true }),
      supabase
        .from("forum_posts")
        .select("id, titulo, tipo, status, created_at")
        .eq("autor_id", aluno.id)
        .neq("status", "aprovado")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const lista = posts ?? [];
  const [contagens, autores] = await Promise.all([
    contagensDosPosts(lista.map((p) => p.id)),
    autoresComPerfil(lista.map((p) => p.autor_id)),
  ]);

  let ordenados = [...lista];
  if (ordem === "uteis") {
    ordenados.sort(
      (a, b) =>
        (contagens.get(b.id)?.votos ?? 0) - (contagens.get(a.id)?.votos ?? 0),
    );
  } else if (ordem === "sem-resposta") {
    ordenados = ordenados.filter(
      (p) => p.tipo === "duvida" && (contagens.get(p.id)?.respostas ?? 0) === 0,
    );
  }

  const tituloDisciplina = new Map(
    (disciplinas ?? []).map((d) => [d.id, d.titulo]),
  );

  function linkFiltro(disciplina: string, novaOrdem: string = ordem): string {
    const q = new URLSearchParams();
    if (disciplina) q.set("disciplina", disciplina);
    if (novaOrdem !== "recentes") q.set("ordem", novaOrdem);
    const query = q.toString();
    return query ? `/forum?${query}` : "/forum";
  }

  return (
    <main className="animate-aparecer mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
            Fórum
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tire dúvidas, abra enquetes e ajude colegas.
          </p>
        </div>
        <Link
          href="/forum/novo"
          data-tour="forum-novo"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
        >
          Nova publicação
        </Link>
      </div>

      {meus && meus.length > 0 ? (
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Suas publicações em análise
          </h2>
          <ul className="mt-2 space-y-1.5">
            {meus.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <BadgeStatus
                  status={p.status as "pendente" | "rejeitado"}
                />
                <Link
                  href={`/forum/${p.id}`}
                  className="text-slate-700 underline-offset-2 hover:underline dark:text-slate-300"
                >
                  {p.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <nav
          aria-label="Ordenação"
          className="inline-flex rounded-lg border border-slate-200 bg-superficie p-0.5 shadow-sm"
        >
          {ORDENS.map((o) => (
            <Link
              key={o.valor}
              href={linkFiltro(filtroDisciplina, o.valor)}
              aria-current={o.valor === ordem ? "page" : undefined}
              className={
                o.valor === ordem
                  ? "rounded-md bg-brand-900 px-3 py-1 font-medium text-white dark:bg-brand-100 dark:text-brand-900"
                  : "rounded-md px-3 py-1 text-slate-500 transition hover:text-brand-900 dark:hover:text-brand-100"
              }
            >
              {o.rotulo}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={linkFiltro("")}
            className={`rounded-full border px-3 py-1 text-xs transition ${!filtroDisciplina ? "border-brand-600 bg-brand-50 font-medium text-brand-900 dark:bg-brand-950/60 dark:text-brand-200" : "border-slate-200 text-slate-500 hover:border-brand-300"}`}
          >
            Tudo
          </Link>
          <Link
            href={linkFiltro("geral")}
            className={`rounded-full border px-3 py-1 text-xs transition ${filtroDisciplina === "geral" ? "border-brand-600 bg-brand-50 font-medium text-brand-900 dark:bg-brand-950/60 dark:text-brand-200" : "border-slate-200 text-slate-500 hover:border-brand-300"}`}
          >
            Área geral
          </Link>
          {(disciplinas ?? []).map((d) => (
            <Link
              key={d.id}
              href={linkFiltro(d.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${filtroDisciplina === d.id ? "border-brand-600 bg-brand-50 font-medium text-brand-900 dark:bg-brand-950/60 dark:text-brand-200" : "border-slate-200 text-slate-500 hover:border-brand-300"}`}
            >
              {d.titulo}
            </Link>
          ))}
        </div>
      </div>

      {ordenados.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <Comunidade className="h-36 w-auto text-slate-300" />
          <p className="text-sm text-slate-500">
            {ordem === "sem-resposta"
              ? "Nenhuma dúvida sem resposta — a comunidade está em dia!"
              : "Ainda não tem publicação por aqui. Que tal abrir a primeira?"}
          </p>
        </div>
      ) : (
        <ul className="escalonado mt-4 space-y-3">
          {ordenados.map((p) => {
            const c = contagens.get(p.id) ?? { votos: 0, respostas: 0 };
            return (
              <li key={p.id}>
                <Link
                  href={`/forum/${p.id}`}
                  className="block rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <BadgeTipo tipo={p.tipo} />
                    {p.resposta_solucao_id ? (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        ✓ solucionada
                      </span>
                    ) : null}
                    {p.disciplina_id ? (
                      <span className="text-xs text-slate-400">
                        {tituloDisciplina.get(p.disciplina_id)}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-1.5 font-medium text-brand-900 dark:text-brand-100">
                    {p.titulo}
                  </h2>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <Avatar
                      id={p.autor_id}
                      nome={autores.get(p.autor_id)?.nome ?? "Aluno(a)"}
                      avatarUrl={autores.get(p.autor_id)?.avatarUrl ?? null}
                      tamanho="sm"
                    />
                    {autores.get(p.autor_id)?.nome}
                    {autores.get(p.autor_id)?.equipe ? <BadgeEquipe /> : null}{" "}
                    · {dataCurta(p.created_at)} · {c.votos} útil ·{" "}
                    {c.respostas} resposta(s)
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
