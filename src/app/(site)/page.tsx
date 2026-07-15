import Image from "next/image";
import { RegistrationForm } from "@/components/registration-form";
import { Patrocinadores } from "@/components/patrocinadores";
import { SocialLinks } from "@/components/social-links";
import { TemaToggle } from "@/components/ui/tema-toggle";
import { RodaAnimada } from "@/components/marca/roda-animada";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col">
      <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
        {/* Roda ambiente: gira devagar ao fundo do hero, sangrando pela borda. */}
        <RodaAnimada
          decorativa
          className="pointer-events-none absolute -right-20 -top-28 h-[34rem] w-[34rem] opacity-[0.12] sm:opacity-[0.16]"
        />
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 pt-8 text-white">
          <div className="group flex items-center gap-3">
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
                Coworking Social de Mudanças Globais{" "}
                <span className="font-sans font-semibold text-brand-100/80">
                  — CSMG
                </span>
              </p>
              <p className="text-xs text-brand-100/80">
                Prefeitura e SEIM/Integra Rio · Oroborus
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-brand-100/70 sm:block">
              Acesso gratuito à comunidade
            </span>
            <TemaToggle className="border-white/20 text-white/70 hover:border-white/40 hover:text-white" />
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 pb-20 pt-12 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-20">
          <div className="animate-surgir text-white">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              Inscrições abertas
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Capacitação online e gratuita para empreendedores.
            </h1>
            <p className="mt-5 max-w-lg text-base text-brand-100/90 sm:text-lg">
              Uma iniciativa da Prefeitura e SEIM/Integra Rio · Oroborus para
              ampliar o acesso ao empreendedorismo. Inscreva-se em poucos minutos
              e estude de onde estiver.
            </p>

            <ul className="escalonado mt-8 grid gap-3 text-sm text-brand-100/90 sm:grid-cols-2">
              <li className="flex items-start gap-2">
                <Dot /> Cursos 100% online
              </li>
              <li className="flex items-start gap-2">
                <Dot /> Declaração de participação
              </li>
              <li className="flex items-start gap-2">
                <Dot /> Conteúdo de qualidade
              </li>
              <li className="flex items-start gap-2">
                <Dot /> Sem custo para o aluno
              </li>
            </ul>

            <p className="mt-8 max-w-lg rounded-xl bg-white/10 p-4 text-sm text-brand-100/90 ring-1 ring-white/15">
              <span className="font-semibold text-white">Para quem é: </span>
              jovens e adultos empreendedores de 15 a 65 anos,
              microempreendedores individuais (MEIs) e autônomos moradores de
              municípios da Região Metropolitana do Rio de Janeiro.
            </p>

            <a
              href="/edital-csmg-001-2026.pdf"
              target="_blank"
              rel="noopener noreferrer"
              download
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              <DownloadIcon />
              Baixar edital completo (PDF)
            </a>
          </div>

          <div className="animate-aparecer lg:pl-4">
            <RegistrationForm />
          </div>
        </section>
      </div>

      <Patrocinadores />

      <footer className="border-t border-brand-100 bg-superficie dark:border-brand-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">
              Siga o Coworking nas redes
            </p>
            <SocialLinks />
          </div>
          <div className="flex flex-col gap-2 border-t border-brand-100 pt-4 text-xs text-brand-900/60 dark:border-brand-800 dark:text-brand-100/60">
            <p>
              © {new Date().getFullYear()} Coworking Social de Mudanças Globais
              (CSMG) · Prefeitura e Oroborus
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Dot() {
  return (
    <span
      aria-hidden="true"
      className="mt-1.5 inline-block h-1.5 w-1.5 flex-none rounded-full bg-brand-300"
    />
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 flex-none"
    >
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}
