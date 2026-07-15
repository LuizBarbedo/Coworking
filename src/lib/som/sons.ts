"use client";

// Feedback sonoro de conquista — sintetizado no navegador (Web Audio API),
// sem arquivos de áudio. Só toca em marcos reais (aula concluída, avaliação
// aprovada) e apenas se o aluno tiver ativado o som. Nunca em navegação/erro.

const CHAVE_SOM = "csmg-som";

/** O aluno ativou os sons de conquista? (desligado por padrão). */
export function somAtivo(): boolean {
  try {
    return localStorage.getItem(CHAVE_SOM) === "1";
  } catch {
    return false;
  }
}

export function definirSom(ativo: boolean) {
  try {
    localStorage.setItem(CHAVE_SOM, ativo ? "1" : "0");
  } catch {
    /* sem storage: só não persiste */
  }
}

let ctx: AudioContext | null = null;
function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** Toca uma sequência de notas (Hz) com timbre suave e decaimento curto. */
function tocarNotas(notas: number[], intervalo = 0.12) {
  const ac = contexto();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const inicio = ac.currentTime;
  notas.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const ganho = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = inicio + i * intervalo;
    // envelope: ataque rápido, decaimento suave (nada estridente)
    ganho.gain.setValueAtTime(0, t);
    ganho.gain.linearRampToValueAtTime(0.12, t + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(ganho).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.34);
  });
}

// Notas (aproximadas) de um acorde maior — sensação positiva e sóbria.
const DO5 = 523.25;
const MI5 = 659.25;
const SOL5 = 783.99;
const DO6 = 1046.5;

/** Aula concluída: um toque curto e discreto. */
export function tocarConclusao() {
  if (!somAtivo()) return;
  tocarNotas([SOL5, DO6], 0.1);
}

/** Avaliação aprovada / módulo completo: arpejo ascendente de celebração. */
export function tocarConquista() {
  if (!somAtivo()) return;
  tocarNotas([DO5, MI5, SOL5, DO6], 0.11);
}
