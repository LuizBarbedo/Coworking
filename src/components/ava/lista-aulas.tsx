"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { VideoPlayer } from "@/components/ava/video-player";
import { MarcarAssistidaButton } from "@/components/ava/marcar-assistida-button";
import { aulaInicial } from "@/lib/aulas";

export type AulaItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  provider: string;
  videoUid: string | null;
  jaAssistida: boolean;
  srcR2?: string | null; // URL R2 assinada (só para provider "r2")
  poster?: string | null;
  videoStatus?: string | null;
};

export function ListaAulas({
  aulas,
  caminho,
}: {
  aulas: AulaItem[];
  caminho: string;
}) {
  const searchParams = useSearchParams();
  const [aberta, setAberta] = useState<string | null>(() =>
    aulaInicial(aulas, searchParams.get("aula")),
  );

  /**
   * Abre/fecha e deixa a aula na URL, para o link ser compartilhável e a
   * posição sobreviver ao refresh. `replaceState` conversa com o router do
   * Next (useSearchParams enxerga a mudança) sem refazer a navegação.
   */
  function alternar(id: string) {
    const proxima = aberta === id ? null : id;
    setAberta(proxima);

    const params = new URLSearchParams(searchParams.toString());
    if (proxima) params.set("aula", proxima);
    else params.delete("aula");
    const busca = params.toString();
    window.history.replaceState(
      null,
      "",
      busca ? `${window.location.pathname}?${busca}` : window.location.pathname,
    );
  }

  if (aulas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-superficie p-6 text-center text-sm text-slate-500">
        As videoaulas desta disciplina estão sendo preparadas.
      </p>
    );
  }

  return (
    <ul className="escalonado space-y-3" data-tour="aulas">
      {aulas.map((aula, i) => {
        const expandida = aberta === aula.id;
        return (
          <li
            key={aula.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-superficie shadow-sm"
          >
            <button
              type="button"
              onClick={() => alternar(aula.id)}
              aria-expanded={expandida}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
            >
              <span
                className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold ${
                  aula.jaAssistida
                    ? "bg-green-100 text-green-700"
                    : "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300"
                }`}
              >
                {aula.jaAssistida ? "✓" : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-brand-900 dark:text-brand-100">
                  {aula.titulo}
                </span>
                {/* Fechada, a descrição é só uma prévia de uma linha; aberta,
                    ela aparece inteira embaixo do player. */}
                {aula.descricao && !expandida ? (
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
                  srcR2={aula.srcR2}
                  poster={aula.poster}
                  videoStatus={aula.videoStatus}
                />
                {/* Justificado com hifenização (o root é lang="pt-BR"):
                    sem hífen, justificar abre buracos entre as palavras. */}
                {aula.descricao ? (
                  <p className="mt-4 hyphens-auto text-justify text-sm leading-relaxed text-slate-600">
                    {aula.descricao}
                  </p>
                ) : null}
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
