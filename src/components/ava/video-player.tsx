/**
 * Player de vídeo agnóstico de provedor. Suporta:
 *   - youtube:    video_uid = link ou ID do YouTube
 *   - cloudflare: video_uid = UID do Cloudflare Stream
 *   - url:        video_uid = URL de um embed/iframe qualquer
 * Enquanto não houver vídeo (video_uid nulo), mostra um placeholder gracioso.
 * Para plugar um novo provedor, basta ajustar montarSrc().
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
  const src = videoUid ? montarSrc(provider, videoUid) : null;

  if (!src) {
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

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={src}
        title={titulo}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}

/** Extrai o ID de um vídeo do YouTube a partir de URL ou do próprio ID. */
function idYoutube(valor: string): string | null {
  const v = valor.trim();
  const padroes = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const p of padroes) {
    const m = v.match(p);
    if (m) return m[1];
  }
  return null;
}

function montarSrc(provider: string, videoUid: string): string | null {
  if (provider === "youtube") {
    const id = idYoutube(videoUid);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (provider === "cloudflare") {
    return `https://iframe.videodelivery.net/${videoUid}`;
  }
  // Provedor genérico: assume que video_uid já é uma URL de embed.
  return videoUid;
}
