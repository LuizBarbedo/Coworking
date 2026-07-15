import styles from "./roda-animada.module.css";

/**
 * A Roda CSMG animada: os quatro arcos (as pessoas) se desenham em sequência,
 * as cabeças surgem e o conjunto ganha uma rotação lenta e contínua. SVG puro,
 * animado por CSS — leve, nítido em qualquer tamanho e sem vídeo. Respeita
 * prefers-reduced-motion (o CSS pausa a rotação e mostra a roda montada).
 */
export function RodaAnimada({
  className = "",
  decorativa = false,
}: {
  className?: string;
  decorativa?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      role={decorativa ? "presentation" : "img"}
      aria-hidden={decorativa || undefined}
      aria-label={decorativa ? undefined : "Coworking Social — pessoas de mãos dadas em círculo"}
      className={`${styles.roda} ${className}`}
    >
      <g className={styles.gira}>
        <path className={styles.arco} d="M 53.25 37.69 A 22 22 0 0 1 33.92 53.92" stroke="#D98E1B" strokeWidth="7" strokeLinecap="round" />
        <path className={styles.arco} d="M 26.31 53.25 A 22 22 0 0 1 10.08 33.92" stroke="#17605B" strokeWidth="7" strokeLinecap="round" />
        <path className={styles.arco} d="M 10.75 26.31 A 22 22 0 0 1 30.08 10.08" stroke="#C93A2E" strokeWidth="7" strokeLinecap="round" />
        <path className={styles.arco} d="M 37.69 10.75 A 22 22 0 0 1 53.92 30.08" stroke="#114B46" strokeWidth="7" strokeLinecap="round" />
        <circle className={styles.cabeca} cx="44.22" cy="36.45" r="3.6" fill="#D98E1B" />
        <circle className={styles.cabeca} cx="27.55" cy="44.22" r="3.6" fill="#17605B" />
        <circle className={styles.cabeca} cx="19.78" cy="27.55" r="3.6" fill="#C93A2E" />
        <circle className={styles.cabeca} cx="36.45" cy="19.78" r="3.6" fill="#114B46" />
      </g>
    </svg>
  );
}
