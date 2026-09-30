import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RegistroVisita } from "@/components/metricas/registro-visita";
import { AvisoPrivacidade } from "@/components/privacidade/aviso-privacidade";
import { RegistrationForm } from "@/components/registration-form";
import { Patrocinadores } from "@/components/patrocinadores";
import { SocialLinks } from "@/components/social-links";
import { TemaToggle } from "@/components/ui/tema-toggle";
import { urlDaPlataforma } from "@/lib/urls";
import { RodaAnimada } from "@/components/marca/roda-animada";
import { buscarTurmas } from "@/lib/turmas-dados";
import {
  turmaAtualDeInscricao,
  turmaLiberada,
  dataLiberacaoFormatada,
} from "@/lib/turmas";
import { CORTES_YOUTUBE, TEXTOS } from "@/lib/site/conteudo-landing";
import { CtaPersistente } from "@/components/site/cta-persistente";
import { Especialistas } from "@/components/site/especialistas";
import { IconeSeta } from "@/components/site/icones-landing";
import { BotaoCTA } from "@/components/site/secao";
import { VideoFachada } from "@/components/site/video-fachada";
import {
  AprendaComEspecialistas,
  ComoFunciona,
  ParaQuemE,
  PerguntasFrequentes,
  PorQueParticipar,
  SecaoInscricao,
  SobreProjeto,
  TemasDaFormacao,
} from "@/components/site/secoes-landing";

// A landing diz pra qual turma a inscrição vale e quando o acesso abre.
// Revalida a cada 5 min: mudar a data na gestão de turmas não pede deploy.
export const revalidate = 300;

// O layout raiz acrescenta " · CSMG" (template de title). Mantido curto
// porque o Google corta em ~60 caracteres.
const TITULO = "Capacitação gratuita para empreendedores no Rio";
const DESCRICAO =
  "Formação online e gratuita com 11 temas e 11 especialistas, para empreendedores, MEIs e autônomos da Região Metropolitana do Rio de Janeiro. Iniciativa da Oroborus com IVIG/COPPE/UFRJ e Fundação I²G, patrocínio da Prefeitura do Rio (SEIM/Integra Rio).";

// Metadata da landing: canônica + Open Graph/Twitter completos — é a página
// que recebe o tráfego pago da Meta e os compartilhamentos no WhatsApp.
export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: "/",
    siteName: "CSMG — Coworking Social de Mudanças Globais",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRICAO,
  },
};

// Dados estruturados (JSON-LD): ajudam buscadores a entender quem oferece o
// quê. Conteúdo estático, sem nada dinâmico ou vindo do usuário.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Coworking Social de Mudanças Globais (CSMG)",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  description: DESCRICAO,
  areaServed: "Região Metropolitana do Rio de Janeiro",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
    description: "Cursos de capacitação online gratuitos",
  },
};

/** Corte em destaque no hero (marcado em conteudo-landing.ts). */
const CORTE_DO_HERO = CORTES_YOUTUBE.find((corte) => corte.destaque);

export default async function Home() {
  const turmaAtual = turmaAtualDeInscricao(await buscarTurmas());
  const avisoTurma = turmaAtual
    ? {
        nome: turmaAtual.nome ?? `Turma ${turmaAtual.numero}`,
        dataLiberacao: turmaLiberada(turmaAtual)
          ? undefined
          : dataLiberacaoFormatada(turmaAtual),
      }
    : null;

  return (
    <main className="relative flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Seção 1 do roteiro: resumo (hero) ───────────────────────────── */}
      <div
        id="inicio"
        className="relative flex flex-col overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700"
      >
        {/* Roda ambiente: gira devagar ao fundo do hero, sangrando pela borda. */}
        <RodaAnimada
          decorativa
          className="pointer-events-none absolute -right-20 -top-28 h-[34rem] w-[34rem] opacity-[0.12] sm:opacity-[0.16]"
        />
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 pt-8 text-white">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
              <Image
                src="/logo-roda.svg"
                alt="Coworking Social de Mudanças Globais"
                width={34}
                height={34}
                priority
                className="h-[34px] w-[34px] transition-transform duration-500 group-hover:rotate-90"
              />
            </span>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold tracking-tight">
                {/* No celular só a sigla: o nome inteiro quebrava em quatro
                    linhas e empurrava a headline abaixo da dobra. */}
                <span className="hidden sm:inline">
                  Coworking Social de Mudanças Globais{" "}
                </span>
                <span className="font-sans font-semibold text-brand-100/80">
                  CSMG
                </span>
              </p>
              <p className="hidden text-xs text-brand-100/80 sm:block">
                Oroborus · IVIG/COPPE/UFRJ · Fundação I²G
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs font-medium text-brand-100/90 lg:block">
              Formação 100% gratuita
            </span>
            {/* Aluno já cadastrado entra pela plataforma (subdomínio app —
                o domínio da landing tem o portão de lançamento). */}
            <a
              href={`${urlDaPlataforma()}/login`}
              className="whitespace-nowrap rounded-lg border border-white/25 px-3 py-1.5 text-sm font-medium text-white/90 transition hover:border-white/50 hover:bg-white/10 hover:text-white"
            >
              <span className="hidden sm:inline">Já tem conta? </span>
              <span className="font-semibold">Entrar</span>
            </a>
            <TemaToggle className="border-white/20 text-white/70 hover:border-white/40 hover:text-white" />
          </div>
        </header>

        {/* Colunas assimétricas: a segunda tem exatamente a largura do vídeo
            (22rem). Com `lg:grid-cols-2` a coluna direita ficava com ~576px
            para um vídeo de 304px, e sobravam ~270px de vazio entre o texto e
            o vídeo — o buraco no meio do hero. */}
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-14 pt-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center lg:gap-14 lg:pt-14">
          <div className="animate-surgir text-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {avisoTurma
                  ? `Inscrições abertas · ${avisoTurma.nome}`
                  : "Inscrições abertas"}
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/40">
                Curso 100% Gratuito
              </span>
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {TEXTOS.hero.titulo.includes("GRATUITAMENTE") ? (
                <>
                  Aprenda <span className="text-amber-300">GRATUITAMENTE</span>. Conecte-se. Transforme.
                </>
              ) : (
                TEXTOS.hero.titulo
              )}
            </h1>
            <p className="mt-5 max-w-lg text-base text-brand-100/90 sm:text-lg">
              {TEXTOS.hero.subtitulo}
            </p>
            <p className="mt-4 max-w-lg text-sm text-brand-100/80">
              {TEXTOS.hero.apoio}
            </p>

            <ul className="escalonado mt-8 flex flex-wrap gap-2 text-brand-100/90 sm:gap-2.5">
              {TEXTOS.hero.selos.map((selo) => (
                <li
                  key={selo}
                  // text-xs no celular pra caberem dois por linha: em text-sm
                  // cada selo ocupava uma linha inteira e comia três faixas da
                  // primeira tela.
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium ring-1 ring-white/15 sm:px-3.5 sm:text-sm"
                >
                  {selo}
                </li>
              ))}
            </ul>

            {/* O formulário é ÚNICO e vive no fim da página (#inscricao). Aqui
                vai só o botão, como o roteiro pede na seção 1. O download do
                edital saiu daqui para o FAQ: competia com o CTA principal e
                tirava a pessoa da página. */}
            <div className="mt-8">
              <BotaoCTA variante="clara">Quero me inscrever</BotaoCTA>
            </div>

            <a
              href="#aulas"
              // py-2 pra passar dos 24px de altura mínima de alvo de toque
              // (WCAG 2.5.8) — sem isso o link tem só a altura da linha.
              className="mt-5 inline-flex items-center gap-2 py-2 text-sm font-medium text-brand-100/80 underline-offset-4 transition hover:text-white hover:underline"
            >
              Ver trechos das aulas
              <IconeSeta className="h-4 w-4" />
            </a>
          </div>

          {/* Um corte do canal fecha o hero: dá rosto humano à primeira tela
              (a página vende especialistas) e é o vídeo que o roteiro pede na
              seção 1. Fachada e sem `priority`: não disputa o LCP, que é a
              headline, e nada do YouTube carrega antes do clique. */}
          {CORTE_DO_HERO && (
            <div className="animate-aparecer mx-auto w-full max-w-[19rem] lg:mx-0 lg:max-w-none">
              <VideoFachada
                id={CORTE_DO_HERO.id}
                titulo={CORTE_DO_HERO.titulo}
                capa={`/cortes/${CORTE_DO_HERO.id}.webp`}
                formato="vertical"
                className="ring-white/25"
              />
            </div>
          )}
        </section>
      </div>

      {/* Ordem pensada pela leitura de quem chega frio: primeiro "isso é pra
          mim?" (para-quem, com os critérios do edital), depois "como funciona",
          só então o conteúdo, as pessoas, os benefícios abstratos e as
          objeções. "Sobre o projeto" desce para junto do rodapé institucional:
          é credibilidade, não persuasão. */}
      <ParaQuemE />
      <ComoFunciona />
      <TemasDaFormacao />
      <AprendaComEspecialistas />
      <Especialistas />
      <PorQueParticipar />
      <PerguntasFrequentes />
      <SobreProjeto />

      {/* Logos institucionais ANTES do pedido de dados: sinal de confiança vale
          quando a pessoa está decidindo, não depois de ela já ter decidido. */}
      <Patrocinadores />

      <SecaoInscricao>
        <RegistrationForm
          avisoTurma={avisoTurma ?? undefined}
          mostrarTitulo={false}
        />
      </SecaoInscricao>

      {/* ── Seção 9 do roteiro: rodapé institucional ────────────────────── */}
      <footer className="border-t border-brand-100 bg-superficie dark:border-brand-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
          <div className="grid gap-3 text-sm leading-relaxed text-brand-900/70 dark:text-brand-100/70">
            <p>{TEXTOS.institucional.realizacao}</p>
            <p>{TEXTOS.institucional.patrocinio}</p>
          </div>
          <div className="flex flex-col items-center gap-4 border-t border-brand-100 pt-6 dark:border-brand-800 sm:flex-row sm:justify-between">
            <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">
              Siga o Coworking nas redes
            </p>
            <SocialLinks />
          </div>
          <div className="flex flex-col gap-2 border-t border-brand-100 pt-4 text-xs text-brand-900/60 dark:border-brand-800 dark:text-brand-100/60 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Coworking Social de Mudanças Globais
              (CSMG)
            </p>
            <Link
              href="/privacidade"
              // inline-block + py-1.5 garante os 24px de alvo de toque
              // (WCAG 2.5.8); como texto puro o link ficava com 16px de altura.
              className="inline-block py-1.5 underline-offset-4 transition hover:text-brand-900 hover:underline dark:hover:text-brand-100"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>

      <RegistroVisita />
      <AvisoPrivacidade />
      {/* Fica escondido no topo e enquanto o formulário está na tela. */}
      <CtaPersistente rotulo="Quero me inscrever" />
    </main>
  );
}
