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
  srcR2,
  poster,
  videoStatus,
}: {
  provider: string;
  videoUid: string | null;
  titulo: string;
  srcR2?: string | null; // URL R2 já assinada (gerada no servidor)
  poster?: string | null;
  videoStatus?: string | null;
}) {
  // Vídeo hospedado por nós (Cloudflare R2), servido por URL assinada.
  if (provider === "r2") {
    if (srcR2) {
      return (
        <div
          data-tour="video"
          className="aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-black/5 dark:ring-white/10"
        >
          <video
            src={srcR2}
            poster={poster ?? undefined}
            controls
            controlsList="nodownload"
            preload="metadata"
            className="h-full w-full"
          >
            <track kind="captions" />
          </video>
        </div>
      );
    }
    // Ainda transcodificando (ou sem vídeo).
    return (
      <div
        data-tour="video"
        className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50"
      >
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            {videoStatus === "erro"
              ? "Não foi possível processar o vídeo"
              : "Vídeo em processamento"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {videoStatus === "erro"
              ? "Peça ao instrutor para reenviar."
              : "A videoaula ficará disponível em instantes."}
          </p>
        </div>
      </div>
    );
  }

  const src = videoUid ? montarSrc(provider, videoUid) : null;

  if (!src) {
    return (
      <div
        data-tour="video"
        className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50"
      >
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
    <div
      data-tour="video"
      className="aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-black/5 dark:ring-white/10"
    >
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
    // youtube-nocookie + rel=0/modestbranding: player embutido, com privacidade
    // e sem sugerir vídeos de outros canais ao final (mantém o aluno na aula).
    return id
      ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
      : null;
  }
  if (provider === "cloudflare") {
    return `https://iframe.videodelivery.net/${videoUid}`;
  }
  // Provedor genérico: assume que video_uid já é uma URL de embed.
  return videoUid;
}
