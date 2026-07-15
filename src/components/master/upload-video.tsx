"use client";

import { useRef, useState } from "react";
import {
  finalizarUploadVideo,
  iniciarUploadVideo,
} from "@/app/(plataforma)/master/actions";
import { BarraProgresso } from "@/components/ui/barra-progresso";

type Estado = "ocioso" | "enviando" | "processando" | "erro";

/**
 * Envia o vídeo original direto para o R2 (presigned PUT) e enfileira a
 * transcodificação. Aparece no editor de cada aula, ao lado da opção de colar
 * link do YouTube/URL.
 */
export function UploadVideo({
  aulaId,
  disciplinaId,
  status,
}: {
  aulaId: string;
  disciplinaId: string;
  status?: string | null;
}) {
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function enviar(arquivo: File) {
    setEstado("enviando");
    setPct(0);
    setMsg(null);

    const inicio = await iniciarUploadVideo(
      aulaId,
      arquivo.name,
      arquivo.type || "video/mp4",
    );
    if ("erro" in inicio) {
      setEstado("erro");
      setMsg(inicio.erro);
      return;
    }

    // PUT direto no R2 com progresso (XHR).
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", inicio.url);
      xhr.setRequestHeader("Content-Type", arquivo.type || "video/mp4");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`R2 respondeu ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Falha de rede no envio."));
      xhr.send(arquivo);
    }).catch((e) => {
      setEstado("erro");
      setMsg(e instanceof Error ? e.message : "Falha no envio.");
      throw e;
    });

    await finalizarUploadVideo(aulaId, inicio.chave, disciplinaId);
    setEstado("processando");
  }

  if (status === "processando" && estado === "ocioso") {
    return (
      <p className="text-xs text-ambar-600 dark:text-ambar-400">
        ⏳ Vídeo em processamento (transcodificando para 720p)…
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-3">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void enviar(f);
        }}
      />

      {estado === "ocioso" || estado === "erro" ? (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-300"
          >
            ⬆ Enviar arquivo de vídeo
          </button>
          <p className="mt-1 text-xs text-slate-400">
            MP4/MOV/WEBM/MKV. Convertido para 720p automaticamente; o original
            não é publicado.
          </p>
          {estado === "erro" && msg ? (
            <p className="mt-1 text-xs text-red-600">{msg}</p>
          ) : null}
        </>
      ) : null}

      {estado === "enviando" ? (
        <div>
          <BarraProgresso pct={pct} label="Enviando vídeo" />
        </div>
      ) : null}

      {estado === "processando" ? (
        <p className="text-xs text-ambar-600 dark:text-ambar-400">
          ✓ Enviado! Processando para 720p — aparece para os alunos assim que
          ficar pronto.
        </p>
      ) : null}
    </div>
  );
}
