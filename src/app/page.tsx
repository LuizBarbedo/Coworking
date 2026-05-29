import Image from "next/image";
import { RegistrationForm } from "@/components/registration-form";

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
                Instituto Virtual Internacional de Mudanças Globais (IVIG)
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
              Educação online, gratuita e para toda a comunidade.
            </h1>
            <p className="mt-5 max-w-lg text-base text-brand-100/90 sm:text-lg">
              Uma iniciativa IVIG para ampliar o acesso ao conhecimento.
              Inscreva-se em poucos minutos e estude de onde estiver.
            </p>

            <ul className="mt-8 grid gap-3 text-sm text-brand-100/90 sm:grid-cols-2">
              <li className="flex items-start gap-2">
                <Dot /> Cursos 100% online
              </li>
              <li className="flex items-start gap-2">
                <Dot /> Certificado de participação
              </li>
              <li className="flex items-start gap-2">
                <Dot /> Conteúdo de qualidade
              </li>
              <li className="flex items-start gap-2">
                <Dot /> Sem custo para o aluno
              </li>
            </ul>
          </div>

          <div className="lg:pl-4">
            <RegistrationForm />
          </div>
        </section>
      </div>

      <footer className="border-t border-brand-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-brand-900/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Coworking Social de Mudanças Globais
            (CSMG) · Instituto Virtual Internacional de Mudanças Globais (IVIG)
          </p>
          <p>Dúvidas? Entre em contato pelos nossos canais oficiais.</p>
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
