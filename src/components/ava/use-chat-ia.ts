"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MensagemChatIA = { role: "user" | "assistant"; content: string };

const LIMITE_HISTORICO = 6;

/**
 * Estado e envio do chat com o assistente de IA (/api/ia/chat, streaming de
 * texto puro). Com `disciplinaId`, as respostas se restringem à disciplina;
 * sem ele, o assistente atua em modo geral (toda a plataforma).
 */
export function useChatIA({ disciplinaId }: { disciplinaId?: string }) {
  const [mensagens, setMensagens] = useState<MensagemChatIA[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const carregandoRef = useRef(false);
  // Espelha as mensagens atuais para ler o histórico sem depender do timing
  // do updater de setState nem de closure desatualizada.
  const mensagensRef = useRef<MensagemChatIA[]>([]);
  useEffect(() => {
    mensagensRef.current = mensagens;
  }, [mensagens]);

  const enviar = useCallback(
    async (texto: string) => {
      const pergunta = texto.trim();
      if (!pergunta || carregandoRef.current) return;

      carregandoRef.current = true;
      setErro(null);
      setCarregando(true);

      const historico = mensagensRef.current.slice(-LIMITE_HISTORICO);
      setMensagens((m) => [
        ...m,
        { role: "user", content: pergunta },
        { role: "assistant", content: "" },
      ]);

      try {
        const resp = await fetch("/api/ia/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            disciplinaId
              ? { disciplinaId, pergunta, historico }
              : { pergunta, historico },
          ),
        });

        if (!resp.ok || !resp.body) {
          const detalhe = await resp.text().catch(() => "");
          throw new Error(detalhe || "Não foi possível obter a resposta.");
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let acumulado = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acumulado += decoder.decode(value, { stream: true });
          const atual = acumulado;
          setMensagens((m) => {
            const copia = m.slice();
            copia[copia.length - 1] = { role: "assistant", content: atual };
            return copia;
          });
        }

        if (!acumulado.trim()) {
          setMensagens((m) => {
            const copia = m.slice();
            copia[copia.length - 1] = {
              role: "assistant",
              content: "Não recebi uma resposta. Tente novamente.",
            };
            return copia;
          });
        }
      } catch (err) {
        setErro(
          err instanceof Error && err.message
            ? err.message
            : "Ocorreu um erro ao falar com o assistente.",
        );
        // Remove a bolha vazia do assistente.
        setMensagens((m) => m.slice(0, -1));
      } finally {
        carregandoRef.current = false;
        setCarregando(false);
      }
    },
    [disciplinaId],
  );

  return { mensagens, carregando, erro, enviar };
}
