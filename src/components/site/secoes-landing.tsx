import Image from "next/image";

import {
  COMO_FUNCIONA,
  CORTES_YOUTUBE,
  MOTIVOS,
  PERGUNTAS_FREQUENTES,
  PUBLICO_ALVO,
  TEMAS,
  TEXTOS,
} from "@/lib/site/conteudo-landing";
import { IconeDoMotivo, IconeDownload, Marcador } from "./icones-landing";
import { BotaoCTA, Paragrafo, Secao } from "./secao";
import { VideoFachada } from "./video-fachada";

/**
 * Seções de conteúdo da landing de rolagem, na ordem do roteiro da marketing.
 * Todas são componentes de servidor sem estado: o texto é estático (vem de
 * lib/site/conteudo-landing.ts) e nada aqui precisa de JavaScript no cliente.
 */

/**
 * Seção 2 do roteiro — Sobre o projeto. Fica perto do fim, junto do rodapé
 * institucional: é texto de credibilidade, não de persuasão, e ocupava a segunda
 * tela (a mais valiosa depois do hero) falando do que a iniciativa é em vez do
 * que a pessoa ganha.
 *
 * Absorve também a seção "Uma formação gratuita" do roteiro: a gratuidade já
 * aparece na headline, num selo do hero e na chamada final — uma seção inteira
 * só para repeti-la era a quarta menção. O texto foi preservado aqui.
 */
export function SobreProjeto() {
  return (
    <Secao
      id="sobre"
      sobretitulo="Sobre o projeto"
      titulo={TEXTOS.sobre.titulo}
    >
      <div className="escalonado mt-8 grid gap-6 lg:grid-cols-3">
        {TEXTOS.sobre.paragrafos.map((texto) => (
          <p
            key={texto.slice(0, 24)}
            className="text-base leading-relaxed text-brand-900/80 dark:text-brand-100/80"
          >
            {texto}
          </p>
        ))}
      </div>

      <div className="mt-10 grid gap-6 border-t border-brand-100 pt-8 dark:border-brand-800 lg:grid-cols-2">
        {TEXTOS.gratuita.paragrafos.map((texto) => (
          <Paragrafo key={texto.slice(0, 24)}>{texto}</Paragrafo>
        ))}
      </div>
      <p className="mt-6 font-display text-lg font-bold text-brand-800 dark:text-brand-200">
        {TEXTOS.gratuita.fecho}
      </p>
    </Secao>
  );
}

/** Seção 3 do roteiro — Por que participar. */
export function PorQueParticipar() {
  return (
    <Secao id="por-que-participar" sobretitulo="Por que participar" titulo={TEXTOS.motivos.titulo}>
      <ul className="escalonado mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MOTIVOS.map((motivo) => (
          <li
            key={motivo.titulo}
            className="rounded-2xl bg-superficie p-6 ring-1 ring-brand-100 transition hover:ring-brand-300 dark:ring-brand-800 dark:hover:ring-brand-600"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900 dark:text-brand-200 dark:ring-brand-700">
              <IconeDoMotivo nome={motivo.icone} />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-brand-900 dark:text-brand-50">
              {motivo.titulo}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-brand-900/75 dark:text-brand-100/75">
              {motivo.texto}
            </p>
          </li>
        ))}
      </ul>
    </Secao>
  );
}

/** Seção 4 do roteiro — O que você vai aprender (11 temas). */
export function TemasDaFormacao() {
  return (
    <Secao
      id="temas"
      sobretitulo="O que você vai aprender"
      titulo={TEXTOS.temas.titulo}
      fundo="superficie"
    >
      <div className="mt-4 max-w-3xl">
        <Paragrafo>{TEXTOS.temas.intro}</Paragrafo>
      </div>

      <p className="mt-8 flex items-center gap-2 text-xs font-medium text-brand-600 dark:text-brand-300 lg:hidden">
        Role para o lado para ver os {TEMAS.length} temas
        <span aria-hidden="true">→</span>
      </p>

      <ul
        // Mesmo padrão da seção de especialistas: faixa rolável até lg (onze
        // cards com imagem empilhados eram o principal responsável pelas ~27
        // telas de rolagem no celular) e grade a partir de lg.
        tabIndex={0}
        role="group"
        aria-label={`${TEMAS.length} temas da formação`}
        className="escalonado -mx-6 mt-3 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 lg:mx-0 lg:mt-10 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {TEMAS.map((tema) => (
          <li
            key={tema.nome}
            className="group w-[15.5rem] flex-none snap-start overflow-hidden rounded-2xl bg-background ring-1 ring-brand-100 transition hover:ring-brand-300 dark:ring-brand-800 dark:hover:ring-brand-600 sm:w-[17rem] lg:w-auto"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-brand-100 dark:bg-brand-900">
              <Image
                src={tema.capa}
                alt={`Capa do tema ${tema.nome}`}
                fill
                sizes="(min-width: 1024px) 380px, 17rem"
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="p-5">
              <h3 className="font-display text-base font-bold leading-snug text-brand-900 dark:text-brand-50">
                {tema.nome}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-900/75 dark:text-brand-100/75">
                {tema.descricao}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <BotaoCTA>Participar da formação gratuita</BotaoCTA>
      </div>
    </Secao>
  );
}

/**
 * Seção 5 do roteiro — Aprenda com especialistas. É aqui que entram os cinco
 * cortes já publicados no canal: prova concreta do conteúdo, sob clique.
 *
 * O roteiro pedia o vídeo na seção 1 (hero). Ficou aqui porque os cortes são
 * verticais: no hero eles competiriam com a headline e com o formulário, que é
 * onde a conversão acontece — e o LCP da página é justamente o título.
 */
export function AprendaComEspecialistas() {
  // O corte em destaque já aparece no hero — mostrar o mesmo reel duas vezes
  // na mesma página é repetição sem ganho.
  const cortes = CORTES_YOUTUBE.filter((corte) => !corte.destaque);
  return (
    <Secao
      id="aulas"
      sobretitulo="Aprenda com especialistas"
      titulo={TEXTOS.aprendaCom.titulo}
    >
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {TEXTOS.aprendaCom.paragrafos.map((texto) => (
          <Paragrafo key={texto.slice(0, 24)}>{texto}</Paragrafo>
        ))}
      </div>

      <ul className="escalonado mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {cortes.map((corte) => (
          <li key={corte.id}>
            <VideoFachada
              id={corte.id}
              titulo={corte.titulo}
              capa={`/cortes/${corte.id}.webp`}
              formato="vertical"
            />
            {corte.tema && (
              <p className="mt-1.5 text-[0.7rem] font-semibold uppercase leading-tight tracking-[0.1em] text-brand-600 dark:text-brand-300">
                {corte.tema}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <BotaoCTA variante="secundaria" destino="#especialistas" comSeta>
          Conheça os especialistas
        </BotaoCTA>
      </div>
    </Secao>
  );
}

/** Seção 7 do roteiro — Para quem é o Coworking Social. */
export function ParaQuemE() {
  return (
    <Secao
      id="para-quem"
      sobretitulo="Para quem é"
      titulo={TEXTOS.paraQuem.titulo}
      fundo="superficie"
    >
      <div className="mt-6">
        <Paragrafo>{TEXTOS.paraQuem.intro}</Paragrafo>
      </div>

      <ul className="escalonado mt-8 grid gap-3 sm:grid-cols-2">
        {PUBLICO_ALVO.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 rounded-xl bg-background px-4 py-3 text-sm leading-relaxed text-brand-900/85 ring-1 ring-brand-100 dark:text-brand-100/85 dark:ring-brand-800"
          >
            <Marcador />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-3xl font-display text-lg font-semibold text-brand-800 dark:text-brand-200">
        {TEXTOS.paraQuem.fecho}
      </p>

      {/* Critérios do edital. Ficam em destaque porque decidem se a pessoa pode
          ou não se inscrever — deixar isso implícito atrai inscrição inelegível
          e gasta verba de anúncio. */}
      <p className="mt-6 max-w-3xl rounded-xl bg-ambar-100/70 px-5 py-4 text-sm leading-relaxed text-brand-900 ring-1 ring-ambar-400/40 dark:bg-brand-900 dark:text-brand-100 dark:ring-ambar-400/30">
        <span className="font-semibold">Quem pode participar: </span>
        {TEXTOS.paraQuem.elegibilidade}
      </p>
    </Secao>
  );
}

/**
 * Como funciona (nova, não estava no roteiro). Responde formato, ritmo e o que a
 * pessoa leva — a objeção mais comum de quem considera um curso.
 */
export function ComoFunciona() {
  return (
    <Secao
      id="como-funciona"
      sobretitulo="Como funciona"
      titulo={TEXTOS.comoFunciona.titulo}
    >
      <div className="mt-4">
        <Paragrafo>{TEXTOS.comoFunciona.intro}</Paragrafo>
      </div>

      <ul className="escalonado mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {COMO_FUNCIONA.map((item) => (
          <li
            key={item.titulo}
            className="rounded-2xl bg-superficie p-6 ring-1 ring-brand-100 dark:ring-brand-800"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900 dark:text-brand-200 dark:ring-brand-700">
              <IconeDoMotivo nome={item.icone} />
            </span>
            <h3 className="mt-4 font-display text-base font-bold text-brand-900 dark:text-brand-50">
              {item.titulo}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-brand-900/75 dark:text-brand-100/75">
              {item.texto}
            </p>
          </li>
        ))}
      </ul>
    </Secao>
  );
}

/**
 * Perguntas frequentes (nova). Usa <details> nativo: acessível por teclado e
 * funciona sem JavaScript, então não custa nada no cliente.
 *
 * O download do edital vive aqui, e não no hero: é ação de quem quer conferir
 * legitimidade, não de quem está pronto pra se inscrever — no hero ele
 * competia com o CTA principal e tirava a pessoa da página.
 */
export function PerguntasFrequentes() {
  return (
    <Secao
      id="perguntas"
      sobretitulo="Perguntas frequentes"
      titulo="Ainda com dúvida?"
      fundo="superficie"
    >
      <ul className="mt-8 grid max-w-3xl gap-3">
        {PERGUNTAS_FREQUENTES.map(({ pergunta, resposta }) => (
          <li key={pergunta}>
            <details className="group rounded-xl bg-background px-5 ring-1 ring-brand-100 transition hover:ring-brand-300 dark:ring-brand-800 dark:hover:ring-brand-600">
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-sm font-semibold text-brand-900 marker:content-none dark:text-brand-50">
                {pergunta}
                <span
                  aria-hidden="true"
                  className="flex-none text-brand-500 transition group-open:rotate-45"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="h-4 w-4"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-brand-900/80 dark:text-brand-100/80">
                {resposta}
              </p>
            </details>
          </li>
        ))}
      </ul>

      <a
        href="/edital-csmg-001-2026.pdf"
        target="_blank"
        rel="noopener noreferrer"
        download
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-superficie px-4 py-2.5 text-sm font-semibold text-brand-900 ring-1 ring-brand-200 transition hover:bg-brand-50 dark:text-brand-50 dark:ring-brand-700 dark:hover:bg-brand-800"
      >
        <IconeDownload />
        Baixar edital completo (PDF)
      </a>
    </Secao>
  );
}

/**
 * Seção 8 do roteiro (chamada final) FUNDIDA com a inscrição. Eram duas seções
 * empilhadas fazendo o mesmo trabalho: a faixa escura com um CTA que rolava
 * poucos pixels até o formulário logo abaixo. Agora a faixa contém o formulário
 * — quem chegou até aqui não precisa de mais um clique.
 *
 * Recebe o formulário por `children` para o componente não depender de Server
 * Action nem virar client component.
 */
export function SecaoInscricao({ children }: { children: React.ReactNode }) {
  return (
    <section
      id="inscricao"
      className="relative scroll-mt-24 overflow-hidden border-t border-brand-100 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 dark:border-brand-800"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 text-white sm:py-20 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">
            Inscrição
          </p>
          <h2 className="animate-surgir mt-3 max-w-xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {TEXTOS.chamadaFinal.titulo}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-100/90">
            {TEXTOS.chamadaFinal.texto}
          </p>
          <ul className="escalonado mt-8 grid gap-2.5">
            {TEXTOS.chamadaFinal.destaques.map((destaque) => (
              <li
                key={destaque}
                className="flex items-start gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium ring-1 ring-white/15"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 inline-block h-1.5 w-1.5 flex-none rounded-full bg-brand-200"
                />
                {destaque}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-xl text-sm text-brand-100/75">
            A inscrição leva poucos minutos e não tem custo. Você recebe o acesso
            por e-mail e estuda de onde estiver, no seu ritmo.
          </p>
        </div>

        <div className="animate-aparecer">{children}</div>
      </div>
    </section>
  );
}
