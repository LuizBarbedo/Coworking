// Resposta do assistente com links internos clicáveis: converte os links
// markdown "[texto](/caminho)" que o prompt manda a IA usar. Só caminho
// interno vira link (lib/ia/links-chat) — URL externa fica como texto.
import Link from "next/link";
import { segmentarLinks } from "@/lib/ia/links-chat";

export function TextoComLinks({ texto }: { texto: string }) {
  const segmentos = segmentarLinks(texto);
  return (
    <>
      {segmentos.map((s, i) =>
        s.tipo === "link" ? (
          <Link
            key={i}
            href={s.href}
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-100"
          >
            {s.texto}
          </Link>
        ) : (
          <span key={i}>{s.texto}</span>
        ),
      )}
    </>
  );
}
