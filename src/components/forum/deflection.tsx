"use client";

// Deflection na criação de post: enquanto o aluno digita o título, busca
// posts parecidos já aprovados (RPC full-text) e oferece o assistente RAG —
// muita dúvida se resolve aqui, sem virar post.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useChatIA } from "@/components/ava/use-chat-ia";

type PostSimilar = { id: string; titulo: string; tipo: string };

export function Deflection({ titulo }: { titulo: string }) {
  const [similares, setSimilares] = useState<PostSimilar[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mensagens, carregando, erro, enviar } = useChatIA({});
  const [perguntou, setPerguntou] = useState(false);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const consulta = titulo.trim();
    timeoutRef.current = setTimeout(async () => {
      if (consulta.length < 8) {
        setSimilares([]);
        return;
      }
      const { data } = await createSupabaseBrowserClient().rpc(
        "buscar_posts_similares",
        { p_consulta: consulta, p_limite: 5 },
      );
      setSimilares((data as PostSimilar[] | null) ?? []);
    }, 400);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [titulo]);

  const resposta = mensagens.filter((m) => m.role === "assistant").at(-1);
  const podePerguntar = titulo.trim().length >= 8;

  if (!podePerguntar) return null;

  return (
    <div className="space-y-4">
      {similares.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Publicações parecidas
          </h3>
          <ul className="mt-2 space-y-1.5">
            {similares.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/forum/${p.id}`}
                  className="text-sm text-brand-900 underline-offset-2 hover:underline dark:text-brand-100"
                >
                  {p.titulo}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">
            Sua dúvida já pode ter resposta — vale espiar antes de publicar.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Resposta na hora
        </h3>
        {!perguntou ? (
          <button
            type="button"
            onClick={() => {
              setPerguntou(true);
              void enviar(titulo.trim());
            }}
            className="mt-2 rounded-lg border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-900 transition hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-brand-950/40"
          >
            Ver o que o assistente responde
          </button>
        ) : (
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            {erro ? (
              <p className="text-red-600">{erro}</p>
            ) : (
              <p className="whitespace-pre-wrap">
                {resposta?.content || (carregando ? "Consultando…" : "")}
              </p>
            )}
            {!carregando && resposta?.content ? (
              <p className="mt-2 text-xs text-slate-400">
                Resolveu? Ótimo. Se não, publique — a comunidade ajuda.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
