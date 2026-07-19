"use client";

// Form com feedback embutido: pending desabilita os controles, sucesso vira
// toast e erro vira toast + fica registrado pro leitor de tela. Aceita
// qualquer server action no formato (prev, formData) => AcaoState.

import { useActionState, useEffect, useRef } from "react";
import type { AcaoState } from "@/lib/acao";
import { useToast } from "@/components/ui/toast";

/**
 * Converte o estado de uma action ({ok}/{error}) em toast — uma vez por
 * submissão. Devolve true no frame do sucesso (pra fechar forms etc.).
 */
export function useFeedbackDeAcao(
  state: AcaoState,
  opts?: { toastErro?: boolean; aoSucesso?: () => void },
): void {
  const { mostrar } = useToast();
  const toastErro = opts?.toastErro ?? true;
  const aoSucesso = opts?.aoSucesso;
  const ultimo = useRef<AcaoState>(undefined);

  useEffect(() => {
    if (!state || state === ultimo.current) return;
    ultimo.current = state;
    if ("ok" in state) {
      mostrar(state.ok, "ok");
      // Adiado: setState dentro de effect precisa sair do frame (regra
      // react-hooks do projeto).
      if (aoSucesso) setTimeout(aoSucesso, 0);
    } else if (toastErro) {
      // Erro longo (ex.: motivo da moderação) fica melhor inline no form —
      // o chamador decide se o toast de erro entra.
      mostrar(state.error, "erro");
    }
  }, [state, mostrar, toastErro, aoSucesso]);
}

export function FormAcao({
  action,
  className,
  children,
}: {
  action: (prev: AcaoState, formData: FormData) => Promise<AcaoState>;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<AcaoState, FormData>(
    action,
    undefined,
  );
  useFeedbackDeAcao(state);

  return (
    <form action={formAction} className={className}>
      {/* display: contents preserva o layout; disabled dá o pending a todos
          os controles de uma vez. */}
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
