import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useChatIA } from "./use-chat-ia";

/** Cria uma Response com corpo em streaming a partir de pedaços de texto. */
function respostaStream(pedacos: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const p of pedacos) controller.enqueue(encoder.encode(p));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useChatIA", () => {
  it("envia pergunta e acumula a resposta em streaming", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(respostaStream(["Olá", ", aluno!"]));

    const { result } = renderHook(() => useChatIA({ disciplinaId: "d1" }));

    await act(() => result.current.enviar("O que é RLS?"));

    await waitFor(() => {
      expect(result.current.mensagens).toHaveLength(2);
      expect(result.current.mensagens[1]).toEqual({
        role: "assistant",
        content: "Olá, aluno!",
      });
    });

    // corpo enviado inclui a disciplina e a pergunta
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.disciplinaId).toBe("d1");
    expect(body.pergunta).toBe("O que é RLS?");
  });

  it("modo geral: envia sem disciplinaId", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(respostaStream(["ok"]));

    const { result } = renderHook(() => useChatIA({}));
    await act(() => result.current.enviar("Como vejo meu progresso?"));

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.disciplinaId).toBeUndefined();
  });

  it("erro da API: remove a bolha vazia e expõe a mensagem", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Assistente indisponível.", { status: 502 }),
    );

    const { result } = renderHook(() => useChatIA({}));
    await act(() => result.current.enviar("oi"));

    await waitFor(() => {
      expect(result.current.erro).toBe("Assistente indisponível.");
      // só a mensagem do usuário permanece
      expect(result.current.mensagens).toHaveLength(1);
      expect(result.current.mensagens[0].role).toBe("user");
    });
  });

  it("ignora envio vazio ou durante carregamento", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useChatIA({}));
    await act(() => result.current.enviar("   "));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
