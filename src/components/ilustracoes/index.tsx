// Ilustrações vetoriais originais da CSMG — estilo geométrico coeso com a
// Roda: arcos e círculos, paleta da marca (verde-mar, âmbar, vermelho, verde
// escuro). São componentes inline para herdarem o tema: partes neutras usam
// `currentColor` (adapta claro/escuro); os acentos usam as cores fixas da marca.
//
// Uso: <ModulosVazio className="h-40 w-auto text-slate-300" />

const TEAL = "#17605B";
const TEAL_ESCURO = "#114B46";
const AMBAR = "#D98E1B";
const VERMELHO = "#C93A2E";

type Props = { className?: string };

/** Estado vazio: conteúdo em preparação — livro aberto e ideias surgindo. */
export function ModulosVazio({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 220 170" fill="none" role="img" aria-label="Conteúdo em preparação" className={className}>
      {/* chão */}
      <ellipse cx="110" cy="146" rx="72" ry="8" fill="currentColor" opacity="0.12" />
      {/* ideias subindo, nas 4 cores, ao longo de um arco */}
      <path d="M70 70 Q110 24 150 70" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 6" opacity="0.35" />
      <circle cx="70" cy="70" r="5" fill={VERMELHO} />
      <circle cx="94" cy="46" r="4" fill={AMBAR} />
      <circle cx="126" cy="46" r="4" fill={TEAL} />
      <circle cx="150" cy="70" r="5" fill={TEAL_ESCURO} />
      <path d="M110 30 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2-5 -5-2.2 5-2.2z" fill={AMBAR} />
      {/* livro aberto */}
      <path d="M110 96 C92 84 74 84 58 90 L58 132 C74 126 92 126 110 138 Z" fill={TEAL} />
      <path d="M110 96 C128 84 146 84 162 90 L162 132 C146 126 128 126 110 138 Z" fill={TEAL_ESCURO} />
      <path d="M110 96 L110 138" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      {/* linhas das páginas */}
      <g stroke="#FAF7F2" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round">
        <path d="M70 100 h26" />
        <path d="M70 110 h26" />
        <path d="M124 100 h26" />
        <path d="M124 110 h26" />
      </g>
    </svg>
  );
}

/** Estado vazio: base de conhecimento da IA — documento com faísca. */
export function ConhecimentoVazio({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 220 170" fill="none" role="img" aria-label="Base de conhecimento vazia" className={className}>
      <ellipse cx="110" cy="148" rx="66" ry="8" fill="currentColor" opacity="0.12" />
      {/* documento */}
      <rect x="70" y="36" width="80" height="104" rx="10" fill="var(--superficie, #fff)" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M132 36 v14 a6 6 0 0 0 6 6 h12" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" fill="none" />
      <g stroke={TEAL} strokeWidth="3" strokeLinecap="round" opacity="0.85">
        <path d="M84 68 h52" />
        <path d="M84 82 h52" />
        <path d="M84 96 h34" />
      </g>
      {/* faísca de IA */}
      <path d="M150 92 l3.4 7.6 7.6 3.4 -7.6 3.4 -3.4 7.6 -3.4-7.6 -7.6-3.4 7.6-3.4z" fill={AMBAR} />
      <circle cx="132" cy="118" r="3" fill={VERMELHO} />
    </svg>
  );
}

/** Conquista: roseta feita dos arcos da Roda com fita — para conclusões. */
export function Conquista({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 220 170" fill="none" role="img" aria-label="Conquista" className={className}>
      <ellipse cx="110" cy="150" rx="58" ry="7" fill="currentColor" opacity="0.12" />
      {/* fitas */}
      <path d="M96 96 L88 140 L104 130 L110 146 L110 96 Z" fill={VERMELHO} />
      <path d="M124 96 L132 140 L116 130 L110 146 L110 96 Z" fill={TEAL_ESCURO} />
      {/* medalha: a Roda */}
      <circle cx="110" cy="80" r="40" fill="var(--superficie, #fff)" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
      <g strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M138 86 A28 28 0 0 1 113 106" stroke={AMBAR} />
        <path d="M104 106 A28 28 0 0 1 82 86" stroke={TEAL} />
        <path d="M82 74 A28 28 0 0 1 107 54" stroke={VERMELHO} />
        <path d="M116 54 A28 28 0 0 1 138 74" stroke={TEAL_ESCURO} />
      </g>
      <path d="M100 80 l7 7 14-15" stroke={TEAL} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Comunidade em rede: nós coloridos conectados por arcos finos. */
export function Comunidade({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 220 170" fill="none" role="img" aria-label="Comunidade em rede" className={className}>
      <g stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5">
        <path d="M60 60 Q110 40 160 60" fill="none" />
        <path d="M160 60 Q182 105 150 130" fill="none" />
        <path d="M150 130 Q110 150 70 130" fill="none" />
        <path d="M70 130 Q38 105 60 60" fill="none" />
        <path d="M60 60 L150 130" />
        <path d="M160 60 L70 130" />
      </g>
      <circle cx="110" cy="90" r="10" fill="var(--superficie, #fff)" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <circle cx="60" cy="60" r="9" fill={VERMELHO} />
      <circle cx="160" cy="60" r="9" fill={AMBAR} />
      <circle cx="150" cy="130" r="9" fill={TEAL} />
      <circle cx="70" cy="130" r="9" fill={TEAL_ESCURO} />
    </svg>
  );
}

/** Erro/404: a Roda "solta" um arco. */
export function RodaQuebrada({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 220 170" fill="none" role="img" aria-label="Página não encontrada" className={className}>
      <ellipse cx="110" cy="150" rx="56" ry="7" fill="currentColor" opacity="0.12" />
      <g strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M150 92 A44 44 0 0 1 110 132" stroke={AMBAR} />
        <path d="M96 130 A44 44 0 0 1 66 92" stroke={TEAL} />
        <path d="M70 72 A44 44 0 0 1 108 40" stroke={VERMELHO} />
      </g>
      {/* arco solto, caído */}
      <path d="M150 140 a20 20 0 0 1 26 6" stroke={TEAL_ESCURO} strokeWidth="9" strokeLinecap="round" fill="none" transform="rotate(20 160 143)" />
      <circle cx="119" cy="48" r="4.5" fill={VERMELHO} />
      <circle cx="74" cy="86" r="4.5" fill={TEAL} />
      <circle cx="115" cy="122" r="4.5" fill={AMBAR} />
    </svg>
  );
}
