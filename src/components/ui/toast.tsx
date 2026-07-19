"use client";

// Toast global: feedback transitório de sucesso/erro pra qualquer ação.
// Montado uma vez no root layout; use useToast().mostrar(mensagem, tipo).

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type TipoToast = "ok" | "erro";
type Toast = { id: number; mensagem: string; tipo: TipoToast };

const ToastContexto = createContext<{
  mostrar: (mensagem: string, tipo?: TipoToast) => void;
} | null>(null);

const DURACAO_MS = 4000;

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(1);

  const mostrar = useCallback((mensagem: string, tipo: TipoToast = "ok") => {
    const id = proximoId.current++;
    setToasts((atuais) => [...atuais, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts((atuais) => atuais.filter((t) => t.id !== id));
    }, DURACAO_MS);
  }, []);

  return (
    <ToastContexto.Provider value={{ mostrar }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-surgir rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
              t.tipo === "erro" ? "bg-red-600" : "bg-brand-900 dark:bg-brand-700"
            }`}
          >
            {t.tipo === "erro" ? null : <span aria-hidden>✓ </span>}
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastContexto.Provider>
  );
}

/** Fora do provider (não deve acontecer), vira no-op — nunca quebra a UI. */
export function useToast() {
  return useContext(ToastContexto) ?? { mostrar: () => {} };
}
