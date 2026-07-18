import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigirVisaoAluno } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resumo } from "@/lib/progresso";
import { urlAssistir, chaveAula, chaveThumb } from "@/lib/r2";
import { BarraProgresso } from "@/components/ui/barra-progresso";
import { ListaAulas } from "@/components/ava/lista-aulas";
import { AbasDisciplina } from "@/components/ava/abas-disciplina";
import { QuizForm } from "@/components/ava/quiz-form";
import { ChatIA } from "@/components/ava/chat-ia";

type Params = { modulo: string; disciplina: string };

async function carregar(moduloSlug: string, disciplinaSlug: string) {
  const supabase = await createSupabaseServerClient();

  const { data: modulo } = await supabase
    .from("modulos")
    .select("id, titulo")
    .eq("slug", moduloSlug)
    .maybeSingle();
  if (!modulo) return null;

  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("id, titulo, descricao")
    .eq("modulo_id", modulo.id)
    .eq("slug", disciplinaSlug)
    .maybeSingle();
  if (!disciplina) return null;

  return { supabase, modulo, disciplina };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { modulo, disciplina } = await params;
  const ctx = await carregar(modulo, disciplina);
  return {
    title: ctx ? `${ctx.disciplina.titulo} — CSMG` : "Disciplina — CSMG",
  };
}

export default async function DisciplinaPage({
  params,
}: {
  params: Promise<Params>;
}) {
  await exigirVisaoAluno();
  const { modulo: moduloSlug, disciplina: disciplinaSlug } = await params;
  const ctx = await carregar(moduloSlug, disciplinaSlug);
  if (!ctx) notFound();

  const { supabase, modulo, disciplina } = ctx;
  const caminho = `/modulos/${moduloSlug}/${disciplinaSlug}`;

  const [{ data: aulas }, { data: materiais }, { data: quiz }] =
    await Promise.all([
      supabase
        .from("aulas")
        // "*" para tolerar ambientes sem a migration 0011 (video_status vem
        // como undefined até ela ser aplicada, e o código trata como null).
        .select("*")
        .eq("disciplina_id", disciplina.id)
        .order("ordem", { ascending: true }),
      supabase
        .from("materiais")
        .select("id, titulo, tipo, url, ordem")
        .eq("disciplina_id", disciplina.id)
        .order("ordem", { ascending: true }),
      supabase
        .from("quizzes")
        .select("id, titulo, nota_minima")
        .eq("disciplina_id", disciplina.id)
        .maybeSingle(),
    ]);

  const aulaIds = (aulas ?? []).map((a) => a.id as string);

  // Progresso das aulas + perguntas/alternativas + tentativas do quiz.
  const [{ data: progresso }, perguntasRes, tentativasRes] = await Promise.all([
    aulaIds.length
      ? supabase.from("progresso_aula").select("aula_id").in("aula_id", aulaIds)
      : Promise.resolve({ data: [] as { aula_id: string }[] }),
    quiz
      ? supabase
          .from("quiz_perguntas")
          .select("id, enunciado, ordem")
          .eq("quiz_id", quiz.id)
          .order("ordem", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; enunciado: string }[] }),
    quiz
      ? supabase
          .from("quiz_tentativas")
          .select("nota, aprovado, created_at")
          .eq("quiz_id", quiz.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({
          data: [] as { nota: number; aprovado: boolean }[],
        }),
  ]);

  const perguntas = perguntasRes.data ?? [];
  const perguntaIds = perguntas.map((p) => p.id as string);
  const { data: alternativas } = perguntaIds.length
    ? await supabase
        .from("quiz_alternativas_publicas")
        .select("id, pergunta_id, texto, ordem")
        .in("pergunta_id", perguntaIds)
        .order("ordem", { ascending: true })
    : { data: [] as { id: string; pergunta_id: string; texto: string }[] };

  const porPergunta = new Map<string, { id: string; texto: string }[]>();
  for (const alt of alternativas ?? []) {
    const arr = porPergunta.get(alt.pergunta_id as string) ?? [];
    arr.push({ id: alt.id as string, texto: alt.texto as string });
    porPergunta.set(alt.pergunta_id as string, arr);
  }
  const perguntasCompletas = perguntas.map((p) => ({
    id: p.id as string,
    enunciado: p.enunciado as string,
    alternativas: porPergunta.get(p.id as string) ?? [],
  }));

  const assistidas = new Set((progresso ?? []).map((p) => p.aula_id as string));
  const tentativas = tentativasRes.data ?? [];
  const ultimaTentativa = tentativas[0] ?? null;
  const quizAprovado = tentativas.some((t) => t.aprovado);

  // Progresso da disciplina: aulas assistidas + avaliação aprovada.
  const totalItens = (aulas ?? []).length + (quiz ? 1 : 0);
  const feitosItens =
    (aulas ?? []).filter((a) => assistidas.has(a.id as string)).length +
    (quizAprovado ? 1 : 0);
  const progDisc = resumo(feitosItens, totalItens);

  // ── Painéis das abas (montados no servidor) ────────────────────────────────
  const painelAulas = (
    <ListaAulas
      caminho={caminho}
      aulas={await Promise.all(
        (aulas ?? []).map(async (aula) => {
          const provider = aula.provider as string;
          const status = (aula.video_status as string | null) ?? null;
          // Vídeo próprio pronto: gera URLs assinadas (curtas) no servidor.
          // Em try/catch para não derrubar a página se as envs de R2 faltarem
          // (urlAssistir lança de forma síncrona quando não há credenciais).
          let srcR2: string | null = null;
          let poster: string | null = null;
          if (provider === "r2" && status === "pronta") {
            try {
              srcR2 = await urlAssistir(chaveAula(aula.id as string));
            } catch {
              srcR2 = null;
            }
            if (srcR2) {
              try {
                poster = await urlAssistir(chaveThumb(aula.id as string));
              } catch {
                poster = null; // poster é opcional
              }
            }
          }
          return {
            id: aula.id as string,
            titulo: aula.titulo as string,
            descricao: (aula.descricao as string | null) ?? null,
            provider,
            videoUid: (aula.video_uid as string | null) ?? null,
            jaAssistida: assistidas.has(aula.id as string),
            srcR2,
            poster,
            videoStatus: status,
          };
        }),
      )}
    />
  );

  const painelMateriais =
    materiais && materiais.length > 0 ? (
      <ul className="space-y-2">
        {materiais.map((m) => (
          <li key={m.id as string}>
            <a
              href={m.url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-superficie px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-300"
            >
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                {(m.tipo as string) ?? "arquivo"}
              </span>
              {m.titulo as string}
            </a>
          </li>
        ))}
      </ul>
    ) : (
      <p className="rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
        Nenhum material disponível nesta disciplina.
      </p>
    );

  const painelAvaliacao = !quiz ? (
    <p className="rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
      Esta disciplina ainda não tem avaliação.
    </p>
  ) : perguntasCompletas.length === 0 ? (
    <p className="rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
      A avaliação ainda não tem perguntas.
    </p>
  ) : (
    <div>
      <div className="mb-4">
        <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">{quiz.titulo as string}</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Nota mínima para aprovação: {quiz.nota_minima}%.
          {ultimaTentativa
            ? ` Última tentativa: ${Number(ultimaTentativa.nota).toLocaleString(
                "pt-BR",
                { maximumFractionDigits: 1 },
              )}% — ${ultimaTentativa.aprovado ? "aprovado" : "não aprovado"}.`
            : ""}
        </p>
      </div>
      <QuizForm
        quizId={quiz.id as string}
        notaMinima={quiz.nota_minima as number}
        perguntas={perguntasCompletas}
      />
    </div>
  );

  return (
    <div className="animate-aparecer">
      <Link
        href={`/modulos/${moduloSlug}`}
        className="text-sm text-brand-600 transition hover:text-brand-700"
      >
        ← {modulo.titulo}
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        {disciplina.titulo}
      </h1>
      {disciplina.descricao ? (
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {disciplina.descricao}
        </p>
      ) : null}

      <div className="mt-4 max-w-md">
        <BarraProgresso
          pct={progDisc.pct}
          label={`Seu progresso nesta disciplina`}
        />
      </div>

      <div className="mt-6">
        <AbasDisciplina
          aulas={painelAulas}
          materiais={painelMateriais}
          avaliacao={painelAvaliacao}
          assistente={
            <ChatIA
              disciplinaId={disciplina.id}
              disciplinaTitulo={disciplina.titulo}
            />
          }
          contadores={{
            aulas: (aulas ?? []).length,
            materiais: (materiais ?? []).length,
          }}
        />
      </div>
    </div>
  );
}
