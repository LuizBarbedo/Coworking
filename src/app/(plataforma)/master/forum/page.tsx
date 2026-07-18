import type { Metadata } from "next";
import Link from "next/link";
import { exigirPermissao } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { nomesDosAutores } from "@/lib/forum/dados";
import { ItemModeracao } from "@/components/master/item-moderacao";
import { Comunidade } from "@/components/ilustracoes";

export const metadata: Metadata = { title: "Moderação do fórum — CSMG" };
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

export default async function ModeracaoForumPage() {
  await exigirPermissao("moderar_forum");
  const admin = createSupabaseAdminClient();

  const [{ data: posts }, { data: respostas }] = await Promise.all([
    admin
      .from("forum_posts")
      .select(
        "id, titulo, corpo, tipo, autor_id, created_at, veredito_ia, motivo_ia, disciplinas ( titulo ), forum_enquete_opcoes ( texto, ordem )",
      )
      .eq("status", "pendente")
      .order("created_at", { ascending: true }),
    admin
      .from("forum_respostas")
      .select(
        "id, corpo, autor_id, created_at, veredito_ia, motivo_ia, forum_posts ( titulo )",
      )
      .eq("status", "pendente")
      .order("created_at", { ascending: true }),
  ]);

  const listaPosts = posts ?? [];
  const listaRespostas = respostas ?? [];
  const nomes = await nomesDosAutores([
    ...listaPosts.map((p) => p.autor_id as string),
    ...listaRespostas.map((r) => r.autor_id as string),
  ]);
  const total = listaPosts.length + listaRespostas.length;

  return (
    <div className="animate-aparecer">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
          Moderação do fórum
        </h1>
        <Link
          href="/forum"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Abrir o fórum →
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Publicações que a IA marcou pra revisão (ou não conseguiu avaliar).
        Aprovadas entram no ar na hora; rejeições podem levar um motivo, que o
        autor vê. Suas publicações no fórum entram sem passar pela fila e
        levam o selo Equipe.
      </p>

      {total === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <Comunidade className="h-32 w-auto text-slate-300" />
          <p className="text-sm text-slate-500">
            Caixa zerada — nada aguardando revisão.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {listaPosts.map((p) => {
            const disciplina = p.disciplinas as unknown as {
              titulo: string;
            } | null;
            const opcoes = (
              (p.forum_enquete_opcoes as { texto: string; ordem: number }[]) ??
              []
            )
              .sort((a, b) => a.ordem - b.ordem)
              .map((o) => o.texto);
            return (
              <ItemModeracao
                key={p.id as string}
                tipo="post"
                id={p.id as string}
                titulo={p.titulo as string}
                corpo={p.corpo as string | null}
                opcoes={opcoes}
                autor={nomes.get(p.autor_id as string) ?? "Aluno(a)"}
                contexto={disciplina?.titulo ?? "Área geral"}
                criadoEm={dataHora(p.created_at as string)}
                vereditoIa={
                  p.veredito_ia as "aprovado" | "suspeito" | "erro" | null
                }
                motivoIa={p.motivo_ia as string | null}
              />
            );
          })}
          {listaRespostas.map((r) => {
            const post = r.forum_posts as unknown as { titulo: string } | null;
            return (
              <ItemModeracao
                key={r.id as string}
                tipo="resposta"
                id={r.id as string}
                titulo={`Resposta em: ${post?.titulo ?? "post removido"}`}
                corpo={r.corpo as string}
                autor={nomes.get(r.autor_id as string) ?? "Aluno(a)"}
                contexto="resposta"
                criadoEm={dataHora(r.created_at as string)}
                vereditoIa={
                  r.veredito_ia as "aprovado" | "suspeito" | "erro" | null
                }
                motivoIa={r.motivo_ia as string | null}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
