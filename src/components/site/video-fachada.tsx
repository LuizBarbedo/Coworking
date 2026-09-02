"use client";

import Image from "next/image";
import { useState } from "react";

import { IconePlay } from "./icones-landing";

/**
 * Fachada de vídeo do YouTube: mostra capa + play e só cria o iframe depois do
 * clique. Duas razões, nesta ordem:
 *
 *  1. Privacidade — o embed do YouTube dispara cookie e rastreio do Google no
 *     carregamento. Com fachada, nada do Google sobe até a pessoa pedir, o que
 *     é coerente com o AvisoPrivacidade que a landing já mostra. A capa também
 *     é local (public/cortes/), justamente pra não vazar IP pro ytimg antes do
 *     consentimento.
 *  2. Peso — um embed custa centenas de KB e vários pedidos; a fachada custa
 *     uma imagem.
 *
 * Usa youtube-nocookie.com no lugar de youtube.com: mesmo player, sem cookie
 * de publicidade.
 *
 * Dois formatos: `horizontal` (16:9) para aula gravada e `vertical` (9:16) para
 * os cortes do canal, que são reels. No vertical o card é estreito, então o
 * título vai embaixo da imagem em vez de sobreposto — sobreposto ele briga com
 * o botão de play.
 */
export function VideoFachada({
  id,
  titulo,
  capa,
  className = "",
  prioridade = false,
  formato = "horizontal",
}: {
  id: string;
  titulo: string;
  /** Capa local; sem ela sobra o fundo da marca. */
  capa?: string;
  className?: string;
  prioridade?: boolean;
  formato?: "horizontal" | "vertical";
}) {
  const [tocando, setTocando] = useState(false);
  const vertical = formato === "vertical";

  return (
    <figure className="flex flex-col">
      <div
        className={`relative ${vertical ? "aspect-[9/16]" : "aspect-video"} w-full overflow-hidden rounded-2xl bg-brand-900 ring-1 ring-brand-200 dark:ring-brand-700 ${className}`}
      >
        {tocando ? (
          <iframe
            // autoplay só depois do clique — é resposta a gesto do usuário, não
            // reprodução automática ao carregar a página.
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
            title={titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setTocando(true)}
            aria-label={`Assistir: ${titulo}`}
            className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {capa && (
              <Image
                src={capa}
                alt=""
                fill
                sizes={
                  vertical
                    ? "(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
                    : "(min-width: 1024px) 640px, 100vw"
                }
                priority={prioridade}
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            )}
            <span
              className={`absolute inset-0 ${
                vertical
                  ? "bg-brand-950/25 group-hover:bg-brand-950/10"
                  : "bg-gradient-to-t from-brand-950/85 via-brand-950/15 to-transparent"
              } transition`}
            />
            {vertical ? (
              // Play no centro: o card é estreito e o título vive embaixo.
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-brand-800 shadow-lg transition group-hover:scale-110">
                  <IconePlay className="h-5 w-5 translate-x-[1px]" />
                </span>
              </span>
            ) : (
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4 text-left sm:p-5">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white/95 text-brand-800 shadow-lg transition group-hover:scale-105">
                  <IconePlay className="h-5 w-5 translate-x-[1px]" />
                </span>
                <span className="font-display text-sm font-semibold leading-snug text-white sm:text-base">
                  {titulo}
                </span>
              </span>
            )}
          </button>
        )}
      </div>

      {vertical && (
        <figcaption className="mt-3 font-display text-sm font-semibold leading-snug text-brand-900 dark:text-brand-50">
          {titulo}
        </figcaption>
      )}
    </figure>
  );
}
