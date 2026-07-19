"use client";

import { useEffect, useRef, useState } from "react";
import { TextoComLinks } from "@/components/ava/texto-com-links";
import { useChatIA } from "./use-chat-ia";

/**
 * Chat com o assistente de IA da disciplina (aba "Tirar dúvidas"). A lógica de
 * streaming vive em useChatIA — compartilhada com o assistente flutuante.
 */
export function ChatIA({
  disciplinaId,
  disciplinaTitulo,
}: {
  disciplinaId: string;
  disciplinaTitulo: string;
}) {
  const [input, setInput] = useState("");
  const { mensagens, carregando, erro, enviar: enviarPergunta } = useChatIA({
    disciplinaId,
  });
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const texto = input;
    setInput("");
    void enviarPergunta(texto);
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-superficie shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
          Assistente da disciplina
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Tire dúvidas sobre <span className="font-medium">{disciplinaTitulo}</span>.
          O assistente responde apenas sobre o conteúdo desta disciplina.
        </p>
      </div>

      <div className="max-h-[28rem] min-h-[16rem] space-y-3 overflow-y-auto px-4 py-4">
        {mensagens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-sm text-slate-500">
              Faça uma pergunta sobre <strong>{disciplinaTitulo}</strong> para começar.
            </p>
            <p className="max-w-sm text-xs text-slate-400">
              Ex.: &ldquo;Pode me explicar o conceito principal desta disciplina?&rdquo;
            </p>
          </div>
        ) : (
          mensagens.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === "user" ? "flex justify-end" : "flex justify-start"
              }
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {msg.content ? (
                  msg.role === "assistant" ? (
                    <TextoComLinks texto={msg.content} />
                  ) : (
                    msg.content
                  )
                ) : (
                  <span className="inline-flex gap-1 text-slate-400">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse [animation-delay:150ms]">●</span>
                    <span className="animate-pulse [animation-delay:300ms]">●</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={fimRef} />
      </div>

      {erro ? (
        <p className="px-4 pb-1 text-xs text-red-600">{erro}</p>
      ) : null}

      <form
        onSubmit={enviar}
        className="flex items-end gap-2 border-t border-slate-100 p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(e);
            }
          }}
          rows={1}
          placeholder="Escreva sua dúvida…"
          disabled={carregando}
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={carregando || !input.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {carregando ? "…" : "Enviar"}
        </button>
      </form>

      <p className="px-4 pb-3 text-[11px] leading-snug text-slate-400">
        As respostas são geradas por IA a partir do material da disciplina e podem
        conter imprecisões. Confira sempre com o conteúdo e o instrutor.
      </p>
    </div>
  );
}
