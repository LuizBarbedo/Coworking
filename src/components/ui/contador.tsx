"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anima um número de 0 até `valor` quando entra na tela (uma vez). Respeita
 * prefers-reduced-motion mostrando o valor final direto. `sufixo` ex.: "%".
 */
export function Contador({
  valor,
  sufixo = "",
  duracao = 900,
  className = "",
}: {
  valor: number;
  sufixo?: string;
  duracao?: number;
  className?: string;
}) {
  const [atual, setAtual] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let inicio: number | null = null;
    let raf = 0;
    let observando = true;

    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz || valor === 0) {
      // Sem animação: mostra o valor final (deferido para não fazer
      // setState síncrono dentro do efeito).
      raf = requestAnimationFrame(() => setAtual(valor));
      return () => cancelAnimationFrame(raf);
    }

    function passo(t: number) {
      if (inicio === null) inicio = t;
      const p = Math.min(1, (t - inicio) / duracao);
      // easing suave (easeOutCubic)
      const eased = 1 - Math.pow(1 - p, 3);
      setAtual(Math.round(valor * eased));
      if (p < 1) raf = requestAnimationFrame(passo);
    }

    // Só anima quando o elemento aparece na viewport.
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting && observando) {
          observando = false;
          raf = requestAnimationFrame(passo);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [valor, duracao]);

  return (
    <span ref={ref} className={className}>
      {atual.toLocaleString("pt-BR")}
      {sufixo}
    </span>
  );
}
