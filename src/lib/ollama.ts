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
export const OPENROUTER_MODELO =
  process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

export type MensagemChat = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** true se a chave de API da Ollama ou da OpenRouter estiver configurada. */
export function ollamaConfigurado(): boolean {
  return Boolean(process.env.OLLAMA_API_KEY || process.env.OPENROUTER_API_KEY);
}

/**
 * Fallback via OpenRouter. Converte o formato OpenAI do OpenRouter para o
 * formato esperado da Ollama:
 *  - non-stream: { message: { content: "..." } }
 *  - stream: NDJSON contendo { message: { content: "..." } } por linha.
 */
async function openRouterChat(
  messages: MensagemChat[],
  opts?: { stream?: boolean; temperature?: number; signal?: AbortSignal },
): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY não configurada.");
  }

  const modeloPrincipal = process.env.OPENROUTER_MODEL || OPENROUTER_MODELO;
  const models = [
    modeloPrincipal,
    "nvidia/nemotron-3.5-lightning:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
  ]
    .filter((m, i, arr) => arr.indexOf(m) === i)
    .slice(0, 3);

  const resposta = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: opts?.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://coworkingsocial.com.br",
      "X-Title": "CSMG Coworking Social",
    },
    body: JSON.stringify({
      models,
      messages,
      stream: opts?.stream ?? true,
      temperature: opts?.temperature ?? 0.2,
    }),
  });

  if (!resposta.ok) {
    return resposta;
  }

  // Chamada sem streaming (ex.: moderação prévia do fórum).
  if (!opts?.stream) {
    const data = (await resposta.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const content = data.choices?.[0]?.message?.content ?? "";
    return new Response(
      JSON.stringify({
        message: { role: "assistant", content },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Chamada com streaming (ex.: chat do aluno).
  // Converte SSE da OpenRouter para o NDJSON da Ollama que a rota consome.
  const reader = resposta.body?.getReader();
  if (!reader) {
    return resposta;
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const linhas = buffer.split("\n");
          buffer = linhas.pop() ?? "";
          for (const linha of linhas) {
            const trimmed = linha.trim();
            if (!trimmed || trimmed.startsWith(":") || trimmed === "data: [DONE]") {
              continue;
            }
            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const pedaco = parsed.choices?.[0]?.delta?.content ?? "";
                if (pedaco) {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({ message: { content: pedaco } }) + "\n",
                    ),
                  );
                }
              } catch {
                // Linha parcial ou ignorada
              }
            }
          }
        }
      } catch {
        // Conexão encerrada
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

/**
 * Chama POST /api/chat do Ollama. Se a Ollama falhar (erro 429 de cota, 410, ou
 * indisponibilidade), aciona o fallback via OpenRouter transparentemente.
 */
export async function ollamaChat(
  messages: MensagemChat[],
  opts?: { stream?: boolean; temperature?: number; signal?: AbortSignal },
): Promise<Response> {
  const apiKey = process.env.OLLAMA_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey && !openRouterKey) {
    throw new Error("Nem OLLAMA_API_KEY nem OPENROUTER_API_KEY configuradas.");
  }

  if (apiKey) {
    try {
      const res = await fetch(`${BASE_URL}/api/chat`, {
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
          think: process.env.OLLAMA_THINK === "true",
          options: { temperature: opts?.temperature ?? 0.2 },
        }),
      });

      if (res.ok) {
        return res;
      }

      console.warn(
        `[ia] Ollama Cloud retornou status ${res.status}. Tentando fallback OpenRouter...`,
      );
    } catch (err) {
      console.warn(
        `[ia] Falha ao conectar ao Ollama Cloud: ${err instanceof Error ? err.message : String(err)}. Tentando fallback OpenRouter...`,
      );
    }
  }

  if (openRouterKey) {
    return openRouterChat(messages, opts);
  }

  return new Response("Provedor de IA indisponível.", { status: 502 });
}
