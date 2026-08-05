import { FormAcao } from "@/components/ui/form-acao";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { exigirMaster, getSessaoEquipe } from "@/lib/auth";
import { primeiraRotaPermitida, temPermissao } from "@/lib/permissoes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { criarModulo } from "./actions";
import { ListaModulos } from "./lista-modulos";

export const metadata: Metadata = { title: "Área do Master — CSMG" };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

type Modulo = {
  id: string;
  titulo: string;
  publicado: boolean;
  instrutor: string | null;
};

export default async function MasterHome() {
  await exigirMaster();
  // A home do hub é a aba Conteúdo: monitor sem essa permissão vai pra
  // primeira aba que pode ver (ou pro painel de aluno, se nenhuma).
  const sessao = await getSessaoEquipe();
  if (sessao && !temPermissao(sessao, "editar_conteudo")) {
    redirect(primeiraRotaPermitida(sessao) ?? "/painel");
  }
  const admin = createSupabaseAdminClient();
  const { data: modulos } = await admin
    .from("modulos")
    .select("id, titulo, publicado, instrutor")
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Modulo[]>();

  return (
    <div className="animate-aparecer">
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">Gerenciar conteúdo</h1>
      <p className="mt-1 text-sm text-slate-500">
        Crie e organize os módulos, disciplinas, aulas, materiais e avaliações do
        curso.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Lista de módulos */}
        <div data-tour="master-modulos">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Módulos
          </h2>
          <ListaModulos modulos={modulos ?? []} />
          {modulos && modulos.length > 1 ? (
            <p className="mt-2 text-xs text-slate-500">
              Arraste pela alça ou use as setas para reordenar. A ordem vale para
              os alunos.
            </p>
          ) : null}
        </div>

        {/* Criar módulo */}
        <div className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
          <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">Novo módulo</h2>
          <FormAcao action={criarModulo} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Título
              </label>
              <input name="titulo" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Instrutor (opcional)
              </label>
              <input name="instrutor" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Descrição (opcional)
              </label>
              <textarea name="descricao" rows={3} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Disponibilizar em (opcional)
              </label>
              <input
                type="datetime-local"
                name="publicar_em"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Horário de Brasília. Na hora marcada o módulo é publicado
                sozinho; até lá os alunos veem o card &quot;Em breve&quot;.
              </p>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
            >
              Criar módulo
            </button>
          </FormAcao>
        </div>
      </div>
    </div>
  );
}
