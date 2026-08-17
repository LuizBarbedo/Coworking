// Plano de liberação de conteúdo de uma turma (migração 0026): por módulo,
// "Liberado", "Abre em <data>" ou "Fechado". Quem esconde o conteúdo é o RLS
// do banco — esta tela só escreve o plano.
//
// Sem JavaScript próprio: o campo de data fica sempre visível e só conta
// quando o estado é "Abre em". Um submit salva a turma inteira.

import { FormAcao } from "@/components/ui/form-acao";
import { paraInputLocal } from "@/lib/datas";
import { estadoDoModulo, planoPorModulo } from "@/lib/liberacao-modulos";
import type { LinhaPlano } from "@/lib/liberacao-modulos";

export type ModuloDoPlano = {
  id: string;
  titulo: string;
  publicado: boolean;
};

const selectClass =
  "rounded-lg border border-slate-300 bg-superficie px-2 py-1.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function LiberacaoConteudo({
  numero,
  restrito,
  modulos,
  plano,
  action,
}: {
  numero: number;
  restrito: boolean;
  modulos: ModuloDoPlano[];
  plano: LinhaPlano[];
  action: Parameters<typeof FormAcao>[0]["action"];
}) {
  const porModulo = planoPorModulo(plano);
  const abertos = modulos.filter(
    (m) => estadoDoModulo(porModulo.get(m.id)) === "liberado",
  ).length;

  return (
    <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:bg-slate-900/40">
      <summary className="cursor-pointer text-sm font-medium text-brand-800 dark:text-brand-200">
        Conteúdo liberado ·{" "}
        {restrito
          ? `${abertos} de ${modulos.length} módulo(s)`
          : "todos os módulos"}
      </summary>

      <FormAcao action={action} className="mt-3">
        <input type="hidden" name="numero" value={numero} />

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="restrito"
            defaultChecked={restrito}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-200"
          />
          <span>
            Liberar o conteúdo aos poucos para esta turma.
            <span className="block text-xs text-slate-500">
              Desmarcado, a turma enxerga todo o módulo publicado — é como a
              Turma 1 funciona.
            </span>
          </span>
        </label>

        <ul className="mt-3 divide-y divide-slate-200">
          {modulos.map((m) => {
            const liberacao = porModulo.get(m.id);
            const estado = estadoDoModulo(liberacao);
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-2 py-2 text-sm"
              >
                <span className="min-w-48 flex-1 text-slate-700">
                  {m.titulo}
                  {!m.publicado && (
                    <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      não publicado
                    </span>
                  )}
                </span>
                <select
                  name={`estado-${m.id}`}
                  defaultValue={estado}
                  aria-label={`Liberação de ${m.titulo}`}
                  className={selectClass}
                >
                  <option value="liberado">Liberado</option>
                  <option value="agendado">Abre em…</option>
                  <option value="bloqueado">Fechado</option>
                </select>
                <input
                  type="datetime-local"
                  name={`data-${m.id}`}
                  defaultValue={
                    estado === "agendado" ? paraInputLocal(liberacao) : ""
                  }
                  aria-label={`Data de abertura de ${m.titulo} (Brasília)`}
                  className={`${selectClass} w-52`}
                />
              </li>
            );
          })}
        </ul>

        <button
          type="submit"
          className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
        >
          Salvar liberação
        </button>
      </FormAcao>
    </details>
  );
}
