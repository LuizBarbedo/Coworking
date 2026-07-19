import { FormAcao } from "@/components/ui/form-acao";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { exigirMaster, getSessaoEquipe } from "@/lib/auth";
import { primeiraRotaPermitida, temPermissao } from "@/lib/permissoes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { criarModulo } from "./actions";

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

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Lista de módulos */}
        <div data-tour="master-modulos">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Módulos
          </h2>
          {modulos && modulos.length > 0 ? (
            <ul className="escalonado mt-3 space-y-3">
              {modulos.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/master/modulos/${m.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-brand-900 dark:text-brand-100">
                        {m.titulo}
                      </h3>
                      {m.instrutor ? (
                        <p className="truncate text-sm text-slate-500">
                          {m.instrutor}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        m.publicado
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {m.publicado ? "Publicado" : "Rascunho"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
              Nenhum módulo ainda. Crie o primeiro ao lado.
            </p>
          )}
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
