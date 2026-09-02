import type { IconeMotivo } from "@/lib/site/conteudo-landing";

/**
 * Ícones de linha das seções da landing. SVG inline, traço em `currentColor`
 * (herdam o tema como as ilustrações de components/ilustracoes/) e o mesmo
 * desenho de 24x24 com strokeWidth 2 já usado no resto do site — o roteiro da
 * marketing sugeria emoji, que renderiza diferente em cada sistema e escapa
 * da identidade visual.
 */

const TRACO = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconeDoMotivo({
  nome,
  className = "h-6 w-6",
}: {
  nome: IconeMotivo;
  className?: string;
}) {
  return (
    <svg aria-hidden="true" {...TRACO} className={className}>
      {DESENHOS[nome]}
    </svg>
  );
}

const DESENHOS: Record<IconeMotivo, React.ReactNode> = {
  // Livro aberto: conteúdos práticos.
  livro: (
    <>
      <path d="M12 6.5C10.5 5.2 8.6 4.5 6 4.5H4v13h2c2.6 0 4.5.7 6 2" />
      <path d="M12 6.5C13.5 5.2 15.4 4.5 18 4.5h2v13h-2c-2.6 0-4.5.7-6 2" />
      <path d="M12 6.5v13" />
    </>
  ),
  // Três pessoas: especialistas.
  pessoas: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5" />
      <path d="M17.5 14.2a5.5 5.5 0 0 1 3 5.3" />
    </>
  ),
  // Notebook: acesso online.
  tela: (
    <>
      <rect x="3" y="5" width="18" height="11" rx="2" />
      <path d="M2 19.5h20" />
    </>
  ),
  // Lâmpada: novos conhecimentos.
  ideia: (
    <>
      <path d="M9 17.5h6" />
      <path d="M10 20.5h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9V15h7v-1.1A6 6 0 0 0 12 3Z" />
    </>
  ),
  // Aperto de mãos: conexão e impacto.
  "aperto-de-mao": (
    <>
      <path d="M6 11.5 9.5 8l3 2.5 2-1.5" />
      <path d="M3 9.5 6 6.5l3 2" />
      <path d="M21 9.5 18 6.5l-3.5 2.5" />
      <path d="M9.5 14.5 12 17l2.5-2.5" />
      <path d="M12 17v2.5" />
    </>
  ),
};

/** Marcador de item de lista (o mesmo "Dot" do hero, reaproveitado). */
export function Marcador() {
  return (
    <span
      aria-hidden="true"
      className="mt-2 inline-block h-1.5 w-1.5 flex-none rounded-full bg-brand-500 dark:bg-brand-300"
    />
  );
}

/** Seta para baixo do convite a rolar a página. */
export function IconeSeta({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" {...TRACO} className={className}>
      <path d="M12 5v14m0 0 5-5m-5 5-5-5" />
    </svg>
  );
}

/** Triângulo de play, usado na fachada de vídeo. */
export function IconePlay({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

/** Seta de download (edital). */
export function IconeDownload({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" {...TRACO} strokeWidth={2} className={`${className} flex-none`}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}
