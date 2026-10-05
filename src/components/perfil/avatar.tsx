// Avatar do aluno: foto quando houver; sem foto, iniciais num círculo de
// cor determinística. Server-safe (sem estado).

import { corDoAvatar, iniciais } from "@/lib/perfil/avatar";
import { normalizarUrlStorage } from "@/lib/urls";

const TAMANHOS = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-10 w-10 text-sm",
  lg: "h-24 w-24 text-3xl",
} as const;

export function Avatar({
  id,
  nome,
  avatarUrl,
  tamanho = "md",
}: {
  id: string;
  nome: string;
  avatarUrl: string | null;
  tamanho?: keyof typeof TAMANHOS;
}) {
  const urlLimpa = normalizarUrlStorage(avatarUrl);
  if (urlLimpa) {
    return (
      /* URL externa do Storage; next/image exigiria liberar o domínio no
         next.config — avatar pequeno não justifica a otimização. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={urlLimpa}
        alt={`Foto de ${nome}`}
        className={`${TAMANHOS[tamanho]} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      title={nome}
      className={`${TAMANHOS[tamanho]} ${corDoAvatar(id)} inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white`}
    >
      {iniciais(nome)}
    </span>
  );
}
