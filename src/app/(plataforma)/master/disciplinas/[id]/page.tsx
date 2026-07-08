import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigirMaster } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  atualizarDisciplina,
  excluirDisciplina,
  criarAula,
  excluirAula,
  criarMaterial,
  excluirMaterial,
  atualizarQuiz,
  criarPergunta,
  excluirPergunta,
} from "../../actions";

export const metadata: Metadata = { title: "Editar disciplina — CSMG" };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
const cardClass = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
const btnPrimario =
  "rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700";

type Params = { id: string };

export default async function DisciplinaMasterPage({
  params,
}: {
  params: Promise<Params>;
}) {
  await exigirMaster();
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: disciplina } = await admin
    .from("disciplinas")
    .select("id, modulo_id, titulo, descricao, publicado")
    .eq("id", id)
    .maybeSingle();
  if (!disciplina) notFound();

  const [{ data: aulas }, { data: materiais }, { data: quiz }] =
    await Promise.all([
      admin
        .from("aulas")
        .select("id, titulo, provider, video_uid, ordem")
        .eq("disciplina_id", id)
        .order("ordem", { ascending: true }),
      admin
        .from("materiais")
        .select("id, titulo, tipo, url, ordem")
        .eq("disciplina_id", id)
        .order("ordem", { ascending: true }),
      admin
        .from("quizzes")
        .select("id, titulo, nota_minima")
        .eq("disciplina_id", id)
        .maybeSingle(),
    ]);

  let perguntas:
    | {
        id: string;
        enunciado: string;
        alternativas: { id: string; texto: string; correta: boolean }[];
      }[]
    | null = null;
  if (quiz) {
    const { data: pergs } = await admin
      .from("quiz_perguntas")
      .select("id, enunciado, ordem")
      .eq("quiz_id", quiz.id)
      .order("ordem", { ascending: true });
    const pergIds = (pergs ?? []).map((p) => p.id as string);
    const { data: alts } = pergIds.length
      ? await admin
          .from("quiz_alternativas")
          .select("id, pergunta_id, texto, correta, ordem")
          .in("pergunta_id", pergIds)
          .order("ordem", { ascending: true })
      : { data: [] as { id: string; pergunta_id: string; texto: string; correta: boolean }[] };
    const porPergunta = new Map<
      string,
      { id: string; texto: string; correta: boolean }[]
    >();
    for (const a of alts ?? []) {
      const arr = porPergunta.get(a.pergunta_id as string) ?? [];
      arr.push({
        id: a.id as string,
        texto: a.texto as string,
        correta: a.correta as boolean,
      });
      porPergunta.set(a.pergunta_id as string, arr);
    }
    perguntas = (pergs ?? []).map((p) => ({
      id: p.id as string,
      enunciado: p.enunciado as string,
      alternativas: porPergunta.get(p.id as string) ?? [],
    }));
  }

  const letras = ["a", "b", "c", "d", "e"];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/master/modulos/${disciplina.modulo_id}`}
          className="text-sm text-brand-600 transition hover:text-brand-700"
        >
          ← Voltar ao módulo
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-brand-900">
          {disciplina.titulo}
        </h1>
      </div>

      {/* Editar disciplina */}
      <section className={cardClass}>
        <h2 className="font-semibold text-brand-900">Dados da disciplina</h2>
        <form action={atualizarDisciplina} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={disciplina.id} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Título
            </label>
            <input
              name="titulo"
              required
              defaultValue={disciplina.titulo}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Descrição
            </label>
            <textarea
              name="descricao"
              rows={2}
              defaultValue={disciplina.descricao ?? ""}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="publicado"
              defaultChecked={disciplina.publicado}
              className="h-4 w-4 accent-brand-600"
            />
            Publicada
          </label>
          <div className="flex justify-end">
            <button type="submit" className={btnPrimario}>
              Salvar
            </button>
          </div>
        </form>
      </section>

      {/* Aulas */}
      <section className={cardClass}>
        <h2 className="font-semibold text-brand-900">Aulas (vídeo)</h2>
        {aulas && aulas.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {aulas.map((a, i) => (
              <li
                key={a.id as string}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="min-w-0 text-sm text-slate-700">
                  <span className="font-medium text-brand-900">
                    {i + 1}. {a.titulo as string}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    {a.video_uid ? (a.provider as string) : "sem vídeo"}
                  </span>
                </span>
                <FormExcluir
                  action={excluirAula}
                  id={a.id as string}
                  disciplinaId={disciplina.id}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Nenhuma aula ainda.</p>
        )}

        <form action={criarAula} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="disciplina_id" value={disciplina.id} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Título da aula
            </label>
            <input name="titulo" required className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Link do vídeo (YouTube)
            </label>
            <input
              name="video_link"
              placeholder="https://youtu.be/…"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Descrição (opcional)
            </label>
            <input name="descricao" className={inputClass} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className={btnPrimario}>
              Adicionar aula
            </button>
          </div>
        </form>
      </section>

      {/* Materiais */}
      <section className={cardClass}>
        <h2 className="font-semibold text-brand-900">Materiais</h2>
        {materiais && materiais.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {materiais.map((m) => (
              <li
                key={m.id as string}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <a
                  href={m.url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-sm font-medium text-brand-700 hover:underline"
                >
                  {m.titulo as string}
                </a>
                <FormExcluir
                  action={excluirMaterial}
                  id={m.id as string}
                  disciplinaId={disciplina.id}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Nenhum material ainda.</p>
        )}

        <form action={criarMaterial} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="disciplina_id" value={disciplina.id} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Título
            </label>
            <input name="titulo" required className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tipo
            </label>
            <input name="tipo" defaultValue="pdf" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              URL
            </label>
            <input name="url" required className={inputClass} />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <button type="submit" className={btnPrimario}>
              Adicionar material
            </button>
          </div>
        </form>
      </section>

      {/* Avaliação */}
      <section className={cardClass}>
        <h2 className="font-semibold text-brand-900">Avaliação final</h2>

        <form
          action={atualizarQuiz}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="disciplina_id" value={disciplina.id} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Título
            </label>
            <input
              name="titulo"
              defaultValue={quiz?.titulo ?? "Avaliação final"}
              className={inputClass}
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nota mín. (%)
            </label>
            <input
              name="nota_minima"
              type="number"
              min={0}
              max={100}
              defaultValue={quiz?.nota_minima ?? 70}
              className={inputClass}
            />
          </div>
          <button type="submit" className={btnPrimario}>
            Salvar avaliação
          </button>
        </form>

        {/* Perguntas existentes */}
        {perguntas && perguntas.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {perguntas.map((p, i) => (
              <li
                key={p.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-brand-900">
                    {i + 1}. {p.enunciado}
                  </p>
                  <FormExcluir
                    action={excluirPergunta}
                    id={p.id}
                    disciplinaId={disciplina.id}
                  />
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {p.alternativas.map((alt, j) => (
                    <li
                      key={alt.id}
                      className={
                        alt.correta
                          ? "font-medium text-green-700"
                          : "text-slate-600"
                      }
                    >
                      {String.fromCharCode(65 + j)}) {alt.texto}
                      {alt.correta ? " ✓" : ""}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Nenhuma pergunta ainda.
          </p>
        )}

        {/* Nova pergunta */}
        <form
          action={criarPergunta}
          className="mt-6 rounded-lg border border-dashed border-slate-300 p-4"
        >
          <input type="hidden" name="disciplina_id" value={disciplina.id} />
          <h3 className="text-sm font-semibold text-brand-900">
            Nova pergunta
          </h3>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Enunciado
            </label>
            <textarea name="enunciado" required rows={2} className={inputClass} />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Preencha as alternativas e marque a correta. Deixe em branco as que
            não usar (mínimo 2).
          </p>
          <div className="mt-2 space-y-2">
            {letras.map((letra) => (
              <div key={letra} className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  <input
                    type="radio"
                    name="correta"
                    value={letra}
                    className="h-4 w-4 accent-brand-600"
                    required={letra === "a"}
                  />
                  {letra.toUpperCase()}
                </label>
                <input
                  name={`alt_${letra}`}
                  placeholder={`Alternativa ${letra.toUpperCase()}`}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className={btnPrimario}>
              Adicionar pergunta
            </button>
          </div>
        </form>
      </section>

      {/* Excluir disciplina */}
      <form action={excluirDisciplina}>
        <input type="hidden" name="id" value={disciplina.id} />
        <input type="hidden" name="modulo_id" value={disciplina.modulo_id} />
        <button
          type="submit"
          className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          Excluir disciplina
        </button>
      </form>
    </div>
  );
}

/** Botãozinho de excluir reutilizável (form com id + disciplina). */
function FormExcluir({
  action,
  id,
  disciplinaId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  disciplinaId: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="disciplina_id" value={disciplinaId} />
      <button
        type="submit"
        className="flex-none rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        Excluir
      </button>
    </form>
  );
}
