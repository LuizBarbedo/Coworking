"use client";

import { useState } from "react";
import { VideoPlayer } from "@/components/ava/video-player";
import { MarcarAssistidaButton } from "@/components/ava/marcar-assistida-button";

export type AulaItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  provider: string;
  videoUid: string | null;
  jaAssistida: boolean;
};

export function ListaAulas({
  aulas,
  caminho,
}: {
  aulas: AulaItem[];
  caminho: string;
}) {
  const [aberta, setAberta] = useState<string | null>(null);

  if (aulas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        As videoaulas desta disciplina estão sendo preparadas.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {aulas.map((aula, i) => {
        const expandida = aberta === aula.id;
        return (
          <li
            key={aula.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => setAberta(expandida ? null : aula.id)}
              aria-expanded={expandida}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
            >
              <span
                className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold ${
                  aula.jaAssistida
                    ? "bg-green-100 text-green-700"
                    : "bg-brand-50 text-brand-600"
                }`}
              >
                {aula.jaAssistida ? "✓" : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-brand-900">
                  {aula.titulo}
                </span>
                {aula.descricao ? (
                  <span className="mt-0.5 block truncate text-sm text-slate-500">
                    {aula.descricao}
                  </span>
                ) : null}
              </span>
              <span className="flex-none rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                {expandida ? "× Fechar" : "▷ Assistir"}
              </span>
            </button>

            {expandida ? (
              <div className="border-t border-slate-100 p-5">
                <VideoPlayer
                  provider={aula.provider}
                  videoUid={aula.videoUid}
                  titulo={aula.titulo}
                />
                <div className="mt-4 flex justify-end">
                  <MarcarAssistidaButton
                    aulaId={aula.id}
                    caminho={caminho}
                    jaAssistida={aula.jaAssistida}
                  />
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
