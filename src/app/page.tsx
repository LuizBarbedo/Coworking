import { RegistrationForm } from "@/components/registration-form";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col">
      <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8 text-white">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 backdrop-blur"
          >
            <span className="text-base font-bold tracking-tight">ED</span>
          </div>
          <div className="leading-tight">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100/80">
              Educação para todos
            </p>
            <p className="text-sm font-semibold">Plataforma de Educação</p>
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
            Uma iniciativa pública para ampliar o acesso ao conhecimento.
            Inscreva-se em poucos minutos e comece a estudar quando quiser, de
            onde estiver.
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

      <footer className="border-t border-brand-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-brand-900/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Plataforma de Educação</p>
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
