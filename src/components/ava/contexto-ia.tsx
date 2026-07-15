"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type DisciplinaAtual = { id: string; titulo: string } | null;

const ContextoIA = createContext<{
  disciplina: DisciplinaAtual;
  setDisciplina: (d: DisciplinaAtual) => void;
}>({ disciplina: null, setDisciplina: () => {} });

/** Provider montado no layout autenticado; alimenta o assistente flutuante. */
export function ContextoIAProvider({ children }: { children: React.ReactNode }) {
  const [disciplina, setDisciplina] = useState<DisciplinaAtual>(null);
  const valor = useMemo(() => ({ disciplina, setDisciplina }), [disciplina]);
  return <ContextoIA.Provider value={valor}>{children}</ContextoIA.Provider>;
}

export function useContextoIA() {
  return useContext(ContextoIA);
}

/**
 * Renderizado pela página da disciplina: registra a disciplina atual no
 * contexto enquanto a página estiver montada, para o assistente flutuante
 * responder com o material dela.
 */
export function RegistrarDisciplinaIA({
  id,
  titulo,
}: {
  id: string;
  titulo: string;
}) {
  const { setDisciplina } = useContextoIA();
  useEffect(() => {
    setDisciplina({ id, titulo });
    return () => setDisciplina(null);
  }, [id, titulo, setDisciplina]);
  return null;
}
