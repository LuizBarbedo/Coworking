"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { criarAulaComId } from "@/app/(plataforma)/master/actions";
import { enviarVideo } from "@/lib/video-upload";
import { BarraProgresso } from "@/components/ui/barra-progresso";
import { useToast } from "@/components/ui/toast";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

type Estado = "ocioso" | "salvando" | "enviando" | "erro";

/**
 * Adiciona uma aula: o master informa o título e escolhe UMA fonte de vídeo —
 * colar um link (YouTube/URL) OU enviar um arquivo (que vai pro R2 e é
 * transcodificado). Cria a aula e, se houver arquivo, faz o upload em seguida.
 */
export function AdicionarAula({ disciplinaId }: { disciplinaId: string }) {
  const router = useRouter();
  const { mostrar } = useToast();
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [pct, setPct] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const titulo = String(dados.get("titulo") ?? "");
    const link = String(dados.get("video_link") ?? "");
    const descricao = String(dados.get("descricao") ?? "");
    const arquivo = fileRef.current?.files?.[0] ?? null;

    setErro(null);
    setEstado("salvando");

    const criada = await criarAulaComId(disciplinaId, titulo, descricao, link);
    if ("erro" in criada) {
      setEstado("erro");
      setErro(criada.erro);
      return;
    }

    if (arquivo) {
      setEstado("enviando");
      setPct(0);
      const r = await enviarVideo(criada.id, disciplinaId, arquivo, setPct);
      if ("erro" in r) {
        setEstado("erro");
        setErro(`Aula criada, mas o vídeo falhou: ${r.erro}`);
        router.refresh();
        return;
      }
    }

    // Sucesso: limpa, confirma e atualiza a lista.
    formRef.current?.reset();
    setNomeArquivo(null);
    setEstado("ocioso");
    mostrar("Aula adicionada.");
    router.refresh();
  }

  const ocupado = estado === "salvando" || estado === "enviando";

  return (
    <form ref={formRef} onSubmit={submeter} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Título da aula
        </label>
        <input name="titulo" required className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Link do vídeo (YouTube ou URL)
        </label>
        <input
          name="video_link"
          placeholder="https://youtu.be/… (deixe em branco se for enviar arquivo)"
          className={inputClass}
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Descrição (opcional)
        </label>
        <input name="descricao" className={inputClass} />
      </div>

      {/* Alternativa ao link: enviar arquivo (vai pro R2 e é convertido p/ 720p). */}
      <div className="sm:col-span-2 rounded-lg border border-dashed border-slate-300 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          ou envie um arquivo de vídeo
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo"
          className="hidden"
          onChange={(e) => setNomeArquivo(e.currentTarget.files?.[0]?.name ?? null)}
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-slate-50 dark:text-brand-300"
          >
            ⬆ Escolher arquivo
          </button>
          <span className="truncate text-xs text-slate-500">
            {nomeArquivo ?? "MP4/MOV/WEBM/MKV — convertido para 720p automaticamente"}
          </span>
        </div>
      </div>

      {estado === "enviando" ? (
        <div className="sm:col-span-2">
          <BarraProgresso pct={pct} label="Enviando vídeo" />
        </div>
      ) : null}
      {erro ? (
        <p className="sm:col-span-2 text-sm text-red-600">{erro}</p>
      ) : null}

      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={ocupado}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
        >
          {estado === "salvando"
            ? "Criando…"
            : estado === "enviando"
              ? "Enviando vídeo…"
              : "Adicionar aula"}
        </button>
      </div>
    </form>
  );
}
