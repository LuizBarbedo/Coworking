import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAluno } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  contagensDosPosts,
  nomesDosAutores,
  votosDaEnquete,
  votosDasRespostas,
} from "@/lib/forum/dados";
import { BadgeSolucao, BadgeStatus, BadgeTipo } from "@/components/forum/badges";
import { BotaoUtil } from "@/components/forum/botao-util";
import { Enquete, type OpcaoEnquete } from "@/components/forum/enquete";
import { FormReenviar } from "@/components/forum/form-reenviar";
import { FormResposta } from "@/components/forum/form-resposta";
import { MarcarSolucao } from "@/components/forum/marcar-solucao";

export const metadata: Metadata = { title: "Fórum — CSMG" };
export const dynamic = "force-dynamic";

function dataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const aluno = await exigirAluno();
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // O RLS decide a visibilidade: aprovado pra todos, pendente/rejeitado só
  // pro autor — quem não pode ver recebe 404.
  const { data: post } = await supabase
    .from("forum_posts")
    .select(
      "id, titulo, corpo, tipo, status, autor_id, disciplina_id, created_at, motivo_rejeicao, resposta_solucao_id, disciplinas ( titulo )",
    )
    .eq("id", id)
    .single();
  if (!post) notFound();

  const souAutor = post.autor_id === aluno.id;
  const aprovado = post.status === "aprovado";
  // A relação vem sem tipo do supabase-js — objeto único por FK.
  const disciplina = post.disciplinas as unknown as { titulo: string } | null;

  const [{ data: respostas }, { data: opcoes }, { data: meusVotosPost }] =
    await Promise.all([
      supabase
        .from("forum_respostas")
        .select("id, corpo, status, autor_id, created_at, motivo_rejeicao")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true }),
      post.tipo === "enquete"
        ? supabase
            .from("forum_enquete_opcoes")
            .select("id, texto, ordem")
            .eq("post_id", post.id)
            .order("ordem", { ascending: true })
        : Promise.resolve({ data: null }),
      supabase
        .from("forum_votos_posts")
        .select("post_id")
        .eq("post_id", post.id)
        .eq("aluno_id", aluno.id),
    ]);

  const listaRespostas = respostas ?? [];
  const respostaIds = listaRespostas.map((r) => r.id);

  const [nomes, votosRespostas, votosEnquete, meusVotosRespostas, contagens] =
    await Promise.all([
      nomesDosAutores([post.autor_id, ...listaRespostas.map((r) => r.autor_id)]),
      votosDasRespostas(respostaIds),
      post.tipo === "enquete" ? votosDaEnquete(post.id) : Promise.resolve(new Map()),
      respostaIds.length > 0
        ? supabase
            .from("forum_votos_respostas")
            .select("resposta_id")
            .eq("aluno_id", aluno.id)
            .in("resposta_id", respostaIds)
            .then((r) => new Set((r.data ?? []).map((v) => v.resposta_id)))
        : Promise.resolve(new Set<string>()),
      contagensDosPosts([post.id]),
    ]);
  const votosDoPost = contagens.get(post.id)?.votos ?? 0;

  let votoEnqueteDoAluno: string | null = null;
  if (post.tipo === "enquete") {
    const { data } = await supabase
      .from("forum_votos_enquete")
      .select("opcao_id")
      .eq("post_id", post.id)
      .eq("aluno_id", aluno.id)
      .maybeSingle();
    votoEnqueteDoAluno = (data?.opcao_id as string | undefined) ?? null;
  }

  const opcoesComVotos: OpcaoEnquete[] = (opcoes ?? []).map((o) => ({
    id: o.id as string,
    texto: o.texto as string,
    votos: (votosEnquete as Map<string, number>).get(o.id as string) ?? 0,
  }));

  // Solução primeiro; o resto na ordem cronológica.
  const ordenadas = [...listaRespostas].sort((a, b) => {
    if (a.id === post.resposta_solucao_id) return -1;
    if (b.id === post.resposta_solucao_id) return 1;
    return 0;
  });

  return (
    <main className="animate-aparecer mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link
        href="/forum"
        className="text-sm text-slate-500 transition hover:text-brand-900 dark:hover:text-brand-100"
      >
        ← Voltar ao fórum
      </Link>

      {souAutor && post.status !== "aprovado" ? (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm ${
            post.status === "pendente"
              ? "border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
              : "border-red-200 bg-red-50/60 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
          }`}
        >
          {post.status === "pendente" ? (
            "Sua publicação está em análise — ela aparece pros colegas assim que for aprovada."
          ) : (
            <>
              Sua publicação não foi aprovada.
              {post.motivo_rejeicao ? ` Motivo: ${post.motivo_rejeicao}` : null}
              <FormReenviar
                postId={post.id}
                titulo={post.titulo}
                corpo={post.corpo}
              />
            </>
          )}
        </div>
      ) : null}

      <article className="mt-4 rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <BadgeTipo tipo={post.tipo as "duvida" | "enquete"} />
          {souAutor ? (
            <BadgeStatus
              status={post.status as "pendente" | "aprovado" | "rejeitado"}
            />
          ) : null}
          {disciplina ? (
            <span className="text-xs text-slate-400">{disciplina.titulo}</span>
          ) : (
            <span className="text-xs text-slate-400">Área geral</span>
          )}
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
          {post.titulo}
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          {nomes.get(post.autor_id)} · {dataHora(post.created_at)}
        </p>
        {post.corpo ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
            {post.corpo}
          </p>
        ) : null}

        {post.tipo === "enquete" && aprovado ? (
          <div className="mt-4">
            <Enquete
              postId={post.id}
              opcoes={opcoesComVotos}
              votoDoAluno={votoEnqueteDoAluno}
              mostrarResultado={souAutor}
            />
          </div>
        ) : null}

        {aprovado ? (
          <div className="mt-4">
            <BotaoUtil
              postId={post.id}
              votos={votosDoPost}
              votou={(meusVotosPost ?? []).length > 0}
            />
          </div>
        ) : null}
      </article>

      {aprovado ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Respostas
          </h2>
          {ordenadas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Ainda sem respostas — seja a primeira pessoa a ajudar!
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {ordenadas.map((r) => {
                const minha = r.autor_id === aluno.id;
                const ehSolucao = r.id === post.resposta_solucao_id;
                return (
                  <li
                    key={r.id}
                    className={`rounded-xl border p-4 shadow-sm ${
                      ehSolucao
                        ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-superficie"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {ehSolucao ? <BadgeSolucao /> : null}
                      {minha ? (
                        <BadgeStatus
                          status={r.status as "pendente" | "aprovado" | "rejeitado"}
                        />
                      ) : null}
                      <span>
                        {nomes.get(r.autor_id)} · {dataHora(r.created_at)}
                      </span>
                    </div>
                    {minha && r.status === "rejeitado" && r.motivo_rejeicao ? (
                      <p className="mt-1 text-xs text-red-600">
                        Não aprovada: {r.motivo_rejeicao}
                      </p>
                    ) : null}
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                      {r.corpo}
                    </p>
                    {r.status === "aprovado" ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <BotaoUtil
                          postId={post.id}
                          respostaId={r.id}
                          votos={votosRespostas.get(r.id) ?? 0}
                          votou={(meusVotosRespostas as Set<string>).has(r.id)}
                        />
                        {souAutor && !ehSolucao ? (
                          <MarcarSolucao postId={post.id} respostaId={r.id} />
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-5">
            <FormResposta postId={post.id} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
