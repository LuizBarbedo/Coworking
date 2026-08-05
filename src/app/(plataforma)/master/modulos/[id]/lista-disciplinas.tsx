"use client";

// Lista de disciplinas de um módulo, reordenável por arrastar-e-soltar. Só
// amarra a disciplina ao componente genérico ListaOrdenavel: define o card e
// liga a action reordenarDisciplinas ao módulo atual.

import Link from "next/link";
import { reordenarDisciplinas } from "../../actions";
import { ListaOrdenavel } from "@/components/master/lista-ordenavel";

type Disciplina = { id: string; titulo: string; publicado: boolean };

export function ListaDisciplinas({
  moduloId,
  disciplinas,
}: {
  moduloId: string;
  disciplinas: Disciplina[];
}) {
  return (
    <ListaOrdenavel
      itens={disciplinas}
      dataTour="master-disciplinas"
      aoReordenar={(ids) => reordenarDisciplinas(moduloId, ids)}
      rotulo={(d) => d.titulo}
      vazio={
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
          Nenhuma disciplina ainda.
        </p>
      }
      renderItem={(d) => (
        <Link
          href={`/master/disciplinas/${d.id}`}
          className="flex w-full items-center justify-between gap-4"
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
      )}
    />
  );
}
