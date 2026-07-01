import Image from "next/image";
import { RegistrationForm } from "@/components/registration-form";
import { Patrocinadores } from "@/components/patrocinadores";
import { SocialLinks } from "@/components/social-links";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col">
      <div className="relative flex flex-1 flex-col bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 pt-8 text-white">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-coworking.jpeg"
              alt="Coworking Social de Mudanças Globais"
              width={48}
              height={48}
              priority
              className="h-12 w-12 flex-none rounded-lg object-cover ring-1 ring-white/20"
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold">
                Coworking Social de Mudanças Globais{" "}
                <span className="text-brand-100/80">— CSMG</span>
              </p>
              <p className="text-xs text-brand-100/80">
                Prefeitura e SEIM/Integra Rio · Oroborus
              </p>
            </div>
          </div>
          <span className="hidden text-xs text-brand-100/70 sm:block">
            Acesso gratuito à comunidade
          </span>
        </header>

        <section className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 pb-20 pt-12 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-20">
          <div className="text-white">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              Inscrições abertas
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Capacitação online e gratuita para empreendedores.
            </h1>
            <p className="mt-5 max-w-lg text-base text-brand-100/90 sm:text-lg">
              Uma iniciativa da Prefeitura e SEIM/Integra Rio · Oroborus para
              ampliar o acesso ao empreendedorismo. Inscreva-se em poucos minutos
              e estude de onde estiver.
            </p>

            <ul className="mt-8 grid gap-3 text-sm text-brand-100/90 sm:grid-cols-2">
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
          </div>

          <div className="lg:pl-4">
            <RegistrationForm />
          </div>
        </section>
      </div>

      <Patrocinadores />

      <footer className="border-t border-brand-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-sm font-semibold text-brand-900">
              Siga o Coworking nas redes
            </p>
            <SocialLinks />
          </div>
          <div className="flex flex-col gap-2 border-t border-brand-100 pt-4 text-xs text-brand-900/60 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Coworking Social de Mudanças Globais
              (CSMG) · Prefeitura e Oroborus
            </p>
            <p>Dúvidas? Fale conosco pelo WhatsApp (21) 99090-2912.</p>
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
