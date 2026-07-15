"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour.css";
import { passosDoTour, type PassoTour, type PerfilTour } from "@/lib/tour/passos";

const seletorDe = (dataTour: string) => `[data-tour="${dataTour}"]`;

/** Espera um elemento aparecer no DOM (após navegação), com timeout. */
function esperarElemento(seletor: string, timeout = 5000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existente = document.querySelector(seletor);
    if (existente) return resolve(existente);
    const inicio = performance.now();
    const t = setInterval(() => {
      const el = document.querySelector(seletor);
      if (el) {
        clearInterval(t);
        resolve(el);
      } else if (performance.now() - inicio > timeout) {
        clearInterval(t);
        reject(new Error(`elemento ${seletor} não apareceu`));
      }
    }, 120);
  });
}

/**
 * hrefs dos links dentro do contêiner, com os que TÊM conteúdo
 * (data-conteudo="1") primeiro — o tour prioriza módulos/disciplinas com aulas
 * e evita entrar nos vazios.
 */
function todosLinks(dataTour: string): string[] {
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(`${seletorDe(dataTour)} a[href]`),
  );
  const comConteudo = links.filter((a) => a.dataset.conteudo === "1");
  const resto = links.filter((a) => a.dataset.conteudo !== "1");
  return [...comConteudo, ...resto]
    .map((a) => a.getAttribute("href"))
    .filter((h): h is string => Boolean(h));
}

/** Tempo estimado de leitura (fallback quando o áudio está mudo/bloqueado). */
function tempoLeitura(texto: string): number {
  return Math.min(14000, Math.max(5000, texto.length * 55));
}

/**
 * Tour guiado que roda sozinho: um passeio que NAVEGA entre as páginas
 * (painel → módulo → disciplina), destaca cada recurso, narra em voz
 * (ElevenLabs) e avança automaticamente ao fim de cada narração. Abre sozinho
 * no primeiro acesso do perfil (novo navegador); o botão "?" reabre depois.
 */
export function BotaoTour({
  perfil,
  className = "",
}: {
  perfil: PerfilTour;
  className?: string;
}) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mudoRef = useRef(false);
  const rodandoRef = useRef(false);
  const chaveVisto = `csmg-tour-${perfil}-visto`;

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
      a.onended = null;
      a.pause();
    }
  }, []);

  const iniciar = useCallback(() => {
    if (rodandoRef.current) return;
    rodandoRef.current = true;
    mudoRef.current = false;

    const passos = passosDoTour(
      perfil,
      (t) => Boolean(document.querySelector(seletorDe(t))),
      (t) => todosLinks(t).length > 0,
    );
    if (passos.length === 0) {
      rodandoRef.current = false;
      return;
    }

    // URL onde cada passo foi mostrado — permite voltar de páginas profundas.
    const urlDoPasso: (string | null)[] = new Array(passos.length).fill(null);
    let timerAvanco: number | undefined;

    function limparAvanco() {
      if (timerAvanco) window.clearTimeout(timerAvanco);
      timerAvanco = undefined;
      if (audioRef.current) audioRef.current.onended = null;
    }

    // Narra o passo e agenda o auto-avanço: no fim do áudio, ou por tempo de
    // leitura quando o áudio está mudo ou é bloqueado pelo navegador.
    function narrar(idx: number) {
      limparAvanco();
      pararAudio();
      const passo = passos[idx];
      const porTempo = () => {
        timerAvanco = window.setTimeout(
          () => void transicao(true),
          tempoLeitura(passo.descricao),
        );
      };
      if (mudoRef.current) {
        porTempo();
        return;
      }
      const a = new Audio(passo.audio);
      audioRef.current = a;
      a.onended = () => void transicao(true);
      a.play()
        .then(() => {
          // Tocando: segurança caso "ended" não dispare.
          timerAvanco = window.setTimeout(() => void transicao(true), 30000);
        })
        .catch(() => {
          // Autoplay bloqueado (sem gesto): segue com legenda, avança por tempo.
          a.onended = null;
          porTempo();
        });
    }

    // Ativa a aba `data-aba` da disciplina, se o passo precisar de outra aba.
    async function garantirAba(passo: PassoTour) {
      if (!passo.aba || !passo.seletor) return;
      if (document.querySelector(seletorDe(passo.seletor))) return;
      const tab = document.querySelector<HTMLElement>(
        `${seletorDe("abas")} [data-aba="${passo.aba}"]`,
      );
      if (tab) {
        tab.click();
        await esperarElemento(seletorDe(passo.seletor), 2500);
      }
    }

    async function garantirPagina(passo: PassoTour, idx: number) {
      if (!passo.seletor) return;
      await garantirAba(passo);
      if (document.querySelector(seletorDe(passo.seletor))) return;
      if (urlDoPasso[idx]) {
        router.push(urlDoPasso[idx]!);
        await esperarElemento(seletorDe(passo.seletor));
        await garantirAba(passo);
        return;
      }
      if (passo.linkDe) {
        // Testa cada link candidato até achar um com o conteúdo do passo
        // (ex.: pula módulos/disciplinas vazios).
        const candidatos = todosLinks(passo.linkDe);
        if (candidatos.length === 0) throw new Error("sem link para navegar");
        for (const href of candidatos) {
          router.push(href);
          try {
            await esperarElemento(seletorDe(passo.seletor), 6000);
            await garantirAba(passo);
            return;
          } catch {
            /* candidato sem conteúdo: tenta o próximo */
          }
        }
        throw new Error("nenhum candidato com conteúdo");
      }
      await esperarElemento(seletorDe(passo.seletor));
    }

    function proximoAlcancavel(de: number): number {
      for (let j = de; j < passos.length; j++) {
        const s = passos[j];
        if (!s.seletor || document.querySelector(seletorDe(s.seletor))) return j;
      }
      return -1;
    }

    async function transicao(paraFrente: boolean) {
      limparAvanco();
      const alvo = drv.getActiveIndex()! + (paraFrente ? 1 : -1);
      if (alvo < 0) return;
      if (alvo >= passos.length) {
        drv.destroy();
        return;
      }
      try {
        await garantirPagina(passos[alvo], alvo);
        if (paraFrente) drv.moveNext();
        else drv.movePrevious();
      } catch {
        const j = paraFrente ? proximoAlcancavel(alvo + 1) : -1;
        if (j >= 0) drv.moveTo(j);
        else drv.destroy();
      }
    }

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
      onNextClick: () => void transicao(true),
      onPrevClick: () => void transicao(false),
      steps: passos.map((p, idx) => ({
        element: p.seletor ? seletorDe(p.seletor) : undefined,
        popover: {
          title: p.titulo,
          description: `${p.descricao}${botaoMudo()}`,
          onPopoverRender: (pop) => {
            const btn = pop.wrapper.querySelector<HTMLButtonElement>(".tour-mudo");
            btn?.addEventListener("click", () => {
              mudoRef.current = !mudoRef.current;
              btn.setAttribute("aria-pressed", String(mudoRef.current));
              btn.textContent = mudoRef.current ? "🔇 Áudio" : "🔊 Áudio";
              narrar(idx); // re-agenda conforme o novo estado do áudio
            });
          },
        },
        onHighlighted: () => {
          urlDoPasso[idx] = window.location.pathname;
          narrar(idx);
        },
      })),
      onDestroyed: () => {
        limparAvanco();
        pararAudio();
        rodandoRef.current = false;
        marcarVisto();
      },
    });

    drv.drive();
  }, [perfil, router, marcarVisto, pararAudio]);

  // Abre sozinho no primeiro acesso do perfil, na página inicial dele.
  useEffect(() => {
    try {
      if (localStorage.getItem(chaveVisto)) return;
    } catch {
      return;
    }
    const raiz = perfil === "aluno" ? "/painel" : "/master";
    if (window.location.pathname !== raiz) return;
    const id = window.setTimeout(() => iniciar(), 600);
    return () => window.clearTimeout(id);
  }, [chaveVisto, perfil, iniciar]);

  return (
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
  );
}
