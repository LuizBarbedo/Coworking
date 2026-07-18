import "server-only";

/**
 * Cliente mínimo do Ollama Cloud (https://ollama.com). Usa a chave de API do
 * plano assinado. Só o modelo de CHAT é necessário — a recuperação de contexto
 * é feita por full-text no Postgres, não por embeddings.
 *
 * Vars de ambiente (só no servidor, NUNCA prefixe com NEXT_PUBLIC_):
 *   OLLAMA_API_KEY   — obrigatória. Chave em https://ollama.com/settings/keys
 *   OLLAMA_MODEL     — modelo de chat (padrão: gpt-oss:20b — barato e capaz)
 *   OLLAMA_BASE_URL  — base da API (padrão: https://ollama.com)
 */
const BASE_URL = process.env.OLLAMA_BASE_URL || "https://ollama.com";

export const OLLAMA_MODELO = process.env.OLLAMA_MODEL || "gpt-oss:20b";

export type MensagemChat = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** true se a chave de API estiver configurada. */
export function ollamaConfigurado(): boolean {
  return Boolean(process.env.OLLAMA_API_KEY);
}

/**
 * Chama POST /api/chat do Ollama. Por padrão em streaming: a resposta é NDJSON
 * (uma linha JSON por token, cada uma com `message.content`).
 */
export async function ollamaChat(
  messages: MensagemChat[],
  opts?: { stream?: boolean; temperature?: number; signal?: AbortSignal },
): Promise<Response> {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    throw new Error("OLLAMA_API_KEY não configurada.");
  }

  return fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    signal: opts?.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OLLAMA_MODELO,
      messages,
      stream: opts?.stream ?? true,
      // "Raciocínio" de modelos como o qwen3.5. Ligado só se OLLAMA_THINK=true.
      // Desligado, gera muito menos tokens (mais barato e rápido); ligado, pensa
      // antes de responder. Modelos sem "thinking" ignoram o parâmetro.
      think: process.env.OLLAMA_THINK === "true",
      options: { temperature: opts?.temperature ?? 0.2 },
    }),
  });
}
