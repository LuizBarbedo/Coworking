import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigirPermissao } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  atualizarModulo,
  excluirModulo,
  criarDisciplina,
} from "../../actions";

export const metadata: Metadata = { title: "Editar módulo — CSMG" };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

type Params = { id: string };

export default async function ModuloMasterPage({
  params,
}: {
  params: Promise<Params>;
}) {
  await exigirPermissao("editar_conteudo");
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: modulo } = await admin
    .from("modulos")
    .select("id, titulo, descricao, instrutor, publicado")
    .eq("id", id)
    .maybeSingle();
  if (!modulo) notFound();

  const { data: disciplinas } = await admin
    .from("disciplinas")
    .select("id, titulo, publicado, ordem")
    .eq("modulo_id", id)
    .order("ordem", { ascending: true });

  return (
    <div className="animate-aparecer">
      <Link
        href="/master"
        className="text-sm text-brand-600 transition hover:text-brand-700"
      >
        ← Módulos
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">{modulo.titulo}</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Disciplinas */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Disciplinas
          </h2>
          {disciplinas && disciplinas.length > 0 ? (
            <ul className="escalonado mt-3 space-y-3" data-tour="master-disciplinas">
              {disciplinas.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/master/disciplinas/${d.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                  >
                    <h3 className="truncate font-semibold text-brand-900 dark:text-brand-100">
                      {d.titulo}
                    </h3>
                    <span
                      className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        d.publicado
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {d.publicado ? "Publicada" : "Rascunho"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
              Nenhuma disciplina ainda.
            </p>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
            <h3 className="font-display font-semibold text-brand-900 dark:text-brand-100">Nova disciplina</h3>
            <form action={criarDisciplina} className="mt-4 space-y-3">
              <input type="hidden" name="modulo_id" value={modulo.id} />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Título
                </label>
                <input name="titulo" required className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Descrição (opcional)
                </label>
                <textarea name="descricao" rows={2} className={inputClass} />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
              >
                Criar disciplina
              </button>
            </form>
          </div>
        </div>

        {/* Editar módulo */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
            <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">Editar módulo</h2>
            <form action={atualizarModulo} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={modulo.id} />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Título
                </label>
                <input
                  name="titulo"
                  required
                  defaultValue={modulo.titulo}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Instrutor
                </label>
                <input
                  name="instrutor"
                  defaultValue={modulo.instrutor ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Descrição
                </label>
                <textarea
                  name="descricao"
                  rows={3}
                  defaultValue={modulo.descricao ?? ""}
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="publicado"
                  defaultChecked={modulo.publicado}
                  className="h-4 w-4 accent-brand-600"
                />
                Publicado (visível para os alunos)
              </label>
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
              >
                Salvar
              </button>
            </form>
          </div>

          <form action={excluirModulo}>
            <input type="hidden" name="id" value={modulo.id} />
            <button
              type="submit"
              className="w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Excluir módulo
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
