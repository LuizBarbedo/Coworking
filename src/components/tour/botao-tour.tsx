"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour.css";
import { passosVisiveis, type PerfilTour } from "@/lib/tour/passos";

/**
 * Botão de ajuda que inicia o tour guiado (driver.js) com narração em voz
 * (Kokoro pt-BR). Na primeira visita do perfil, oferece o tour automaticamente.
 * O áudio só toca após um gesto do usuário (clique em iniciar), respeitando a
 * política de autoplay dos navegadores.
 */
export function BotaoTour({
  perfil,
  className = "",
}: {
  perfil: PerfilTour;
  className?: string;
}) {
  const [oferecer, setOferecer] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mudoRef = useRef(false);
  const jaIniciouRef = useRef(false);
  const chaveVisto = `csmg-tour-${perfil}-visto`;

  // Oferece o tour na primeira visita deste perfil (após um instante, para
  // não competir com o carregamento da página e evitar setState síncrono).
  useEffect(() => {
    let id: number | undefined;
    try {
      if (!localStorage.getItem(chaveVisto)) {
        id = window.setTimeout(() => {
          if (!jaIniciouRef.current) setOferecer(true);
        }, 700);
      }
    } catch {
      /* sem storage: não oferece automaticamente */
    }
    return () => window.clearTimeout(id);
  }, [chaveVisto]);

  const marcarVisto = useCallback(() => {
    try {
      localStorage.setItem(chaveVisto, "1");
    } catch {
      /* ignora */
    }
  }, [chaveVisto]);

  const pararAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  }, []);

  const tocar = useCallback((src: string) => {
    if (mudoRef.current) return;
    pararAudio();
    const a = new Audio(src);
    audioRef.current = a;
    void a.play().catch(() => {
      /* autoplay bloqueado ou arquivo ausente: segue sem áudio */
    });
  }, [pararAudio]);

  const iniciar = useCallback(() => {
    jaIniciouRef.current = true;
    setOferecer(false);
    mudoRef.current = false;

    const passos = passosVisiveis(perfil, (s) =>
      Boolean(document.querySelector(`[data-tour="${s}"]`)),
    );
    if (passos.length === 0) return;

    const botaoMudo = () =>
      `<button type="button" class="tour-mudo" aria-pressed="${mudoRef.current}">${
        mudoRef.current ? "🔇 Áudio" : "🔊 Áudio"
      }</button>`;

    const drv: Driver = driver({
      showProgress: true,
      popoverClass: "driverjs-theme",
      overlayColor: "rgba(12, 48, 45, 0.72)",
      nextBtnText: "Próximo",
      prevBtnText: "Voltar",
      doneBtnText: "Concluir",
      progressText: "{{current}} de {{total}}",
      steps: passos.map((p) => ({
        element: p.seletor ? `[data-tour="${p.seletor}"]` : undefined,
        popover: {
          title: p.titulo,
          description: `${p.descricao}${botaoMudo()}`,
          onPopoverRender: (pop) => {
            const btn = pop.wrapper.querySelector<HTMLButtonElement>(".tour-mudo");
            btn?.addEventListener("click", () => {
              mudoRef.current = !mudoRef.current;
              if (mudoRef.current) pararAudio();
              btn.setAttribute("aria-pressed", String(mudoRef.current));
              btn.textContent = mudoRef.current ? "🔇 Áudio" : "🔊 Áudio";
              if (!mudoRef.current) {
                const idx = drv.getActiveIndex();
                if (idx != null) tocar(passos[idx].audio);
              }
            });
          },
        },
        onHighlighted: () => tocar(p.audio),
      })),
      onDestroyed: () => {
        pararAudio();
        marcarVisto();
      },
    });

    drv.drive();
  }, [perfil, marcarVisto, pararAudio, tocar]);

  const recusar = useCallback(() => {
    setOferecer(false);
    marcarVisto();
  }, [marcarVisto]);

  return (
    <>
      <button
        type="button"
        onClick={iniciar}
        aria-label="Fazer o tour guiado da plataforma"
        title="Tour guiado"
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-brand-300 hover:text-brand-600 ${className}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </button>

      {oferecer ? (
        <div
          role="dialog"
          aria-label="Oferta de tour guiado"
          className="animate-surgir fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-superficie p-4 shadow-xl ring-1 ring-black/5"
        >
          <p className="font-display text-sm font-bold text-brand-900 dark:text-brand-100">
            Quer um tour rápido?
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Em menos de um minuto, com narração, mostramos o essencial da
            plataforma.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={iniciar}
              className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
            >
              Iniciar tour
            </button>
            <button
              type="button"
              onClick={recusar}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Agora não
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
