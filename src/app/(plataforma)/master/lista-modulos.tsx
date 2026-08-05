"use client";

// Lista de módulos do curso, reordenável por arrastar-e-soltar. Amarra o
// módulo ao componente genérico ListaOrdenavel: define o card e liga a action
// reordenarModulos.

import Link from "next/link";
import { reordenarModulos } from "./actions";
import { ListaOrdenavel } from "@/components/master/lista-ordenavel";

type Modulo = {
  id: string;
  titulo: string;
  publicado: boolean;
  instrutor: string | null;
};

export function ListaModulos({ modulos }: { modulos: Modulo[] }) {
  return (
    <ListaOrdenavel
      itens={modulos}
      aoReordenar={reordenarModulos}
      rotulo={(m) => m.titulo}
      vazio={
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
          Nenhum módulo ainda. Crie o primeiro ao lado.
        </p>
      }
      renderItem={(m) => (
        <Link
          href={`/master/modulos/${m.id}`}
          className="flex w-full items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-brand-900 dark:text-brand-100">
              {m.titulo}
            </h3>
            {m.instrutor ? (
              <p className="truncate text-sm text-slate-500">{m.instrutor}</p>
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
      )}
    />
  );
}
