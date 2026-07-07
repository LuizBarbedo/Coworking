/**
 * Player de vídeo agnóstico de provedor. Hoje só Cloudflare Stream; para trocar
 * de provedor no futuro, basta mudar a montagem da URL aqui — nenhuma página
 * precisa ser tocada. Enquanto não houver vídeo (video_uid nulo), mostra um
 * placeholder gracioso.
 */
export function VideoPlayer({
  provider,
  videoUid,
  titulo,
}: {
  provider: string;
  videoUid: string | null;
  titulo: string;
}) {
  if (!videoUid) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            Vídeo em preparação
          </p>
          <p className="mt-1 text-xs text-slate-500">
            A videoaula será disponibilizada em breve.
          </p>
        </div>
      </div>
    );
  }

  // Embed genérico do Cloudflare Stream (funciona com o UID do vídeo).
  const src =
    provider === "cloudflare"
      ? `https://iframe.videodelivery.net/${videoUid}`
      : videoUid;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={src}
        title={titulo}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}
