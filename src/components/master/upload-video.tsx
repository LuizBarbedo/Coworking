"use client";

import { useRef, useState } from "react";
import { enviarVideo } from "@/lib/video-upload";
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
    const r = await enviarVideo(aulaId, disciplinaId, arquivo, setPct);
    if ("erro" in r) {
      setEstado("erro");
      setMsg(r.erro);
      return;
    }
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
          const input = e.currentTarget;
          const f = input.files?.[0];
          input.value = ""; // permite reenviar o mesmo arquivo após falha
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
