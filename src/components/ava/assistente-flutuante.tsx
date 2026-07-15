"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useChatIA } from "./use-chat-ia";
import { useContextoIA } from "./contexto-ia";
import { RodaSpinner } from "@/components/marca/roda-spinner";

/**
 * Assistente de IA disponível em todas as telas autenticadas: botão flutuante
 * no canto inferior direito que abre um painel de chat. Na página de uma
 * disciplina ele assume o contexto dela (via ContextoIA); nas demais telas
 * atua em modo geral.
 */
export function AssistenteFlutuante() {
  const [aberto, setAberto] = useState(false);
  const [input, setInput] = useState("");
  const { disciplina } = useContextoIA();
  const { mensagens, carregando, erro, enviar } = useChatIA({
    disciplinaId: disciplina?.id,
  });
  const fimRef = useRef<HTMLDivElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // Esc fecha o painel.
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    const texto = input;
    setInput("");
    void enviar(texto);
  }

  return (
    <div
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-50 flex flex-col items-end gap-3"
      data-tour="assistente"
    >
      {aberto ? (
        <div
          ref={painelRef}
          role="dialog"
          aria-label="Assistente de IA"
          className="animate-escalar flex max-h-[min(34rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2.5rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-slate-200 bg-superficie shadow-xl ring-1 ring-black/5"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-brand-600 px-4 py-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-sm font-bold text-white">
                Assistente CSMG
                {carregando ? (
                  <RodaSpinner className="h-4 w-4 text-white/80" />
                ) : null}
              </h2>
              <p className="mt-0.5 text-xs text-white/75">
                {carregando
                  ? "Pensando…"
                  : disciplina
                    ? `Contexto: ${disciplina.titulo}`
                    : "Dúvidas do conteúdo e da plataforma"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar assistente"
              className="rounded-lg p-1.5 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-[12rem] flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {mensagens.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
                <Image
                  src="/logo-roda.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="opacity-70"
                />
                <p className="text-sm text-slate-500">
                  {disciplina
                    ? `Pergunte sobre ${disciplina.titulo}.`
                    : "Pergunte sobre o conteúdo das suas disciplinas ou sobre como usar a plataforma."}
                </p>
              </div>
            ) : (
              mensagens.map((msg, i) => (
                <div
                  key={i}
                  className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {msg.content || (
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

          {erro ? <p className="px-4 pb-1 text-xs text-red-600">{erro}</p> : null}

          <form
            onSubmit={submeter}
            className="flex items-end gap-2 border-t border-slate-100 p-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submeter(e);
                }
              }}
              rows={1}
              placeholder="Escreva sua dúvida…"
              disabled={carregando}
              aria-label="Sua pergunta ao assistente"
              className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-slate-300 bg-superficie px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={carregando || !input.trim()}
              className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando ? "…" : "Enviar"}
            </button>
          </form>

          <p className="px-4 pb-2.5 text-[11px] leading-snug text-slate-400">
            Respostas geradas por IA a partir do material do curso — podem conter
            imprecisões.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? "Fechar assistente de IA" : "Abrir assistente de IA"}
        aria-expanded={aberto}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-lg ring-1 ring-black/10 transition duration-300 hover:bg-brand-700 hover:shadow-xl active:scale-95"
      >
        <Image
          src="/logo-roda-mono.svg"
          alt=""
          width={28}
          height={28}
          className="text-white transition-transform duration-500 [filter:brightness(0)_invert(1)] group-hover:rotate-90"
        />
      </button>
    </div>
  );
}
