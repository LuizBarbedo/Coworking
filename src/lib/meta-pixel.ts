// Disparo de eventos do Meta Pixel a partir do cliente. O pixel base (e o
// PageView) é carregado no layout do grupo (site) e só em produção — aqui a
// função é sempre segura de chamar: sem `fbq` no window (dev, teste, bloqueio
// por extensão), simplesmente não faz nada.

/** Eventos padrão da Meta que a landing usa. */
export type EventoMeta = "CompleteRegistration";

type ComFbq = typeof globalThis & {
  fbq?: (comando: "track", evento: EventoMeta) => void;
};

/** Registra uma conversão no Meta Pixel, se ele estiver carregado. */
export function dispararEventoMeta(evento: EventoMeta): void {
  const fbq = (globalThis as ComFbq).fbq;
  if (typeof fbq !== "function") return;
  try {
    fbq("track", evento);
  } catch {
    // pixel bloqueado ou quebrado — medição não pode derrubar a página
  }
}
