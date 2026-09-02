import Image from "next/image";

import { PALESTRANTES, TEXTOS } from "@/lib/site/conteudo-landing";
import { Paragrafo, Secao } from "./secao";

/**
 * Seção 6 do roteiro — os 11 especialistas, com foto, cargo e tema.
 *
 * Prova social identificável: nome e cargo ao lado do rosto valem mais que
 * rosto anônimo, e dar crédito é o mínimo devido a quem cedeu a imagem. As
 * fotos saem do PDF da marketing por scripts/preparar-midia-landing.mjs.
 *
 * **Por que não é carrossel.** Onze cards empilhados ocupam altura demais no
 * celular, e o reflexo é virar carrossel. Mas carrossel esconde: nos dados
 * públicos de clique em carrossel a taxa fica perto de 1%, com a grande maioria
 * no primeiro slide — o que transformaria "11 especialistas" em três visíveis e
 * oito invisíveis, matando justamente a prova social que a seção existe pra dar.
 *
 * A saída é faixa de rolagem horizontal com scroll-snap até `lg`, onde o card
 * cortado na borda é a própria afordância de que há mais, e grade no desktop,
 * onde cabe todo mundo. É CSS puro: nada de JavaScript, nenhum estado, e o
 * contêiner recebe `tabindex` para quem navega por teclado poder rolá-lo.
 *
 * Todas as fotos ficam abaixo da dobra, então o lazy padrão do next/image é o
 * que queremos — nenhuma recebe `priority`.
 */
export function Especialistas() {
  return (
    <Secao
      id="especialistas"
      sobretitulo="Especialistas"
      titulo={TEXTOS.especialistas.titulo}
    >
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {TEXTOS.especialistas.paragrafos.map((texto) => (
          <Paragrafo key={texto.slice(0, 24)}>{texto}</Paragrafo>
        ))}
      </div>

      <p className="mt-10 flex items-center gap-2 text-xs font-medium text-brand-600 dark:text-brand-300 lg:hidden">
        Role para o lado para ver os {PALESTRANTES.length} especialistas
        <span aria-hidden="true">→</span>
      </p>

      <ul
        // Faixa rolável até lg; grade a partir de lg. As margens negativas +
        // padding fazem o primeiro e o último card encostarem na margem da
        // página, em vez de flutuarem dentro dela.
        tabIndex={0}
        role="group"
        aria-label={`${PALESTRANTES.length} especialistas da formação`}
        className="escalonado -mx-6 mt-3 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 lg:mx-0 lg:mt-12 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {PALESTRANTES.map((pessoa) => (
          <li
            key={pessoa.slug}
            className="group w-[15.5rem] flex-none snap-start overflow-hidden rounded-2xl bg-superficie ring-1 ring-brand-100 transition hover:ring-brand-300 dark:ring-brand-800 dark:hover:ring-brand-600 sm:w-[17rem] lg:w-auto"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-brand-100 dark:bg-brand-900">
              <Image
                src={pessoa.foto}
                alt={`${pessoa.nome} — ${pessoa.cargo}`}
                fill
                sizes="(min-width: 1024px) 320px, 17rem"
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
              />
            </div>
            <div className="p-5">
              <h3 className="font-display text-lg font-bold leading-snug text-brand-900 dark:text-brand-50">
                {pessoa.nome}
              </h3>
              <p className="mt-1 text-sm font-medium text-brand-700 dark:text-brand-300">
                {pessoa.cargo}
              </p>
              {/* line-clamp na faixa deixa os cards com altura parecida; no
                  desktop o texto aparece inteiro. */}
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-brand-900/75 dark:text-brand-100/75 lg:line-clamp-none">
                {pessoa.resumo}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {pessoa.temas.map((tema) => (
                  <li
                    key={tema}
                    className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900 dark:text-brand-200 dark:ring-brand-700"
                  >
                    {tema}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </Secao>
  );
}
