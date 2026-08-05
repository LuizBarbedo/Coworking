import { FormAcao } from "@/components/ui/form-acao";
import { BotaoVoltar } from "@/components/ui/botao-voltar";
import { paraInputLocal } from "@/lib/datas";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigirPermissao } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  atualizarModulo,
  excluirModulo,
  criarDisciplina,
} from "../../actions";
import { ListaDisciplinas } from "./lista-disciplinas";

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
    // "*" para tolerar ambientes sem a migration 0018 (capa_url).
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!modulo) notFound();
  const capaAtual = (modulo as { capa_url?: string | null }).capa_url ?? null;

  const { data: disciplinas } = await admin
    .from("disciplinas")
    .select("id, titulo, publicado, ordem")
    .eq("modulo_id", id)
    .order("ordem", { ascending: true });

  return (
    <div className="animate-aparecer">
      <BotaoVoltar href="/master">Módulos</BotaoVoltar>

      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">{modulo.titulo}</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Disciplinas */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Disciplinas
          </h2>
          <ListaDisciplinas moduloId={modulo.id} disciplinas={disciplinas ?? []} />
          {disciplinas && disciplinas.length > 1 ? (
            <p className="mt-2 text-xs text-slate-500">
              Arraste pela alça ou use as setas para reordenar. A ordem vale para
              os alunos.
            </p>
          ) : null}

          <div className="mt-6 rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
            <h3 className="font-display font-semibold text-brand-900 dark:text-brand-100">Nova disciplina</h3>
            <FormAcao action={criarDisciplina} className="mt-4 space-y-3">
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
            </FormAcao>
          </div>
        </div>

        {/* Editar módulo */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
            <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">Editar módulo</h2>
            <FormAcao action={atualizarModulo} className="mt-4 space-y-3">
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
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Capa do módulo
                </label>
                {capaAtual ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={capaAtual}
                    alt="Capa atual do módulo"
                    className="mb-2 aspect-video w-full max-w-xs rounded-lg border border-slate-200 object-cover"
                  />
                ) : null}
                <input
                  type="file"
                  name="capa"
                  accept="image/*"
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                />
                <p className="mt-1 text-xs text-slate-500">
                  JPG/PNG/WebP até 5 MB. Aparece como thumbnail na lista de
                  módulos do aluno.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Disponibilizar em (opcional)
                </label>
                <input
                  type="datetime-local"
                  name="publicar_em"
                  defaultValue={paraInputLocal(
                    (modulo as { publicar_em?: string | null }).publicar_em,
                  )}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Horário de Brasília. Na hora marcada o módulo é publicado
                  sozinho; limpe o campo pra cancelar o agendamento.
                </p>
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
            </FormAcao>
          </div>

          <FormAcao action={excluirModulo}>
            <input type="hidden" name="id" value={modulo.id} />
            <button
              type="submit"
              className="w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Excluir módulo
            </button>
          </FormAcao>
        </div>
      </div>
    </div>
  );
}
