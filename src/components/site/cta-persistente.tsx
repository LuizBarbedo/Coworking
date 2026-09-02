"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  avisoVisto,
  EVENTO_AVISO,
} from "@/lib/aviso-privacidade";
import { deveMostrarCta, estaVisivel } from "@/lib/site/cta-rolagem";
import { BotaoCTA } from "./secao";

// O AvisoPrivacidade também é fixo no rodapé (e com z maior). Dois elementos
// disputando a mesma faixa se sobrepõem, então a barra espera a vez: enquanto o
// aviso estiver na tela, ela não aparece.
function assinarAviso(avisar: () => void) {
  window.addEventListener(EVENTO_AVISO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO_AVISO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

// No servidor assumimos "já visto" pra não reservar espaço que talvez não
// exista — o mesmo critério do próprio aviso, que não renderiza no servidor.
function avisoVistoNoServidor(): boolean {
  return true;
}

/**
 * Barra de CTA que acompanha a rolagem. A decisão de mostrar vive em
 * lib/site/cta-rolagem.ts (função pura, testada); aqui só medimos a janela.
 *
 * Leitura em rAF com listener passivo: `scroll` dispara muito, e ler
 * getBoundingClientRect no próprio evento causa layout thrashing.
 */
export function CtaPersistente({
  rotulo,
  idDoFormulario = "inscricao",
}: {
  rotulo: string;
  idDoFormulario?: string;
}) {
  const [passouDoHero, setPassouDoHero] = useState(false);
  const avisoDispensado = useSyncExternalStore(
    assinarAviso,
    avisoVisto,
    avisoVistoNoServidor,
  );

  useEffect(() => {
    let agendado = false;

    const medir = () => {
      agendado = false;
      const alturaJanela = window.innerHeight;
      const formulario = document.getElementById(idDoFormulario);
      const formularioVisivel = formulario
        ? estaVisivel(formulario.getBoundingClientRect(), alturaJanela)
        : false;
      setPassouDoHero(
        deveMostrarCta({
          rolagem: window.scrollY,
          alturaJanela,
          formularioVisivel,
        }),
      );
    };

    const aoRolar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar, { passive: true });
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
    };
  }, [idDoFormulario]);

  const visivel = passouDoHero && avisoDispensado;

  return (
    <div
      // aria-hidden quando escondida pra não deixar um link fantasma na
      // navegação por teclado/leitor de tela.
      aria-hidden={!visivel}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-superficie/95 backdrop-blur transition-transform duration-300 dark:border-brand-800 ${
        visivel ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <p className="hidden text-sm font-medium text-brand-900 dark:text-brand-100 sm:block">
          Capacitação gratuita e online.{" "}
          <span className="text-brand-700 dark:text-brand-300">
            Inscrições abertas.
          </span>
        </p>
        <BotaoCTA className="w-full sm:w-auto" tabIndex={visivel ? 0 : -1}>
          {rotulo}
        </BotaoCTA>
      </div>
    </div>
  );
}
