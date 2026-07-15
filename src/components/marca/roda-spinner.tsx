// Spinner de carregamento com a identidade: a Roda girando rápido. Herda a
// cor via currentColor. Use em botões (pending) e áreas que carregam dados.

export function RodaSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      role="status"
      aria-label="Carregando"
      className={`animate-girar-roda ${className}`}
    >
      <g stroke="currentColor" strokeWidth="8" strokeLinecap="round">
        <path d="M 53.25 37.69 A 22 22 0 0 1 33.92 53.92" opacity="0.9" />
        <path d="M 26.31 53.25 A 22 22 0 0 1 10.08 33.92" opacity="0.65" />
        <path d="M 10.75 26.31 A 22 22 0 0 1 30.08 10.08" opacity="0.4" />
        <path d="M 37.69 10.75 A 22 22 0 0 1 53.92 30.08" opacity="0.2" />
      </g>
    </svg>
  );
}
