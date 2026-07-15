import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o Coworking Social de Mudanças Globais (CSMG) coleta e usa os dados da sua inscrição e navegação.",
  alternates: { canonical: "/privacidade" },
};

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
        {titulo}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadePage() {
  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="animate-aparecer mx-auto w-full max-w-2xl flex-1 space-y-8 px-6 py-12">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Plataforma de capacitação do Coworking Social de Mudanças Globais
            (CSMG), em conformidade com a Lei Geral de Proteção de Dados
            (LGPD, Lei nº 13.709/2018).
          </p>
        </div>

        <Secao titulo="Dados que coletamos">
          <p>
            <strong>Na inscrição:</strong> nome completo, CPF, e-mail e
            telefone — usados para criar sua conta, gerar sua matrícula e
            enviar as comunicações do curso.
          </p>
          <p>
            <strong>Origem da visita:</strong> quando você chega por um link de
            divulgação (ex.: anúncio no Instagram), registramos os parâmetros
            da campanha junto com a inscrição. Esses dados são usados apenas de
            forma agregada, para medir quais divulgações funcionam.
          </p>
          <p>
            <strong>No uso da plataforma:</strong> cookies essenciais de sessão
            (login) e preferências guardadas no seu navegador (tema claro ou
            escuro, som). Seu progresso nas aulas fica vinculado à sua conta.
          </p>
        </Secao>

        <Secao titulo="Cookies de parceiros">
          <p>
            Com o seu aceite no aviso de privacidade, poderemos usar cookies de
            medição de parceiros (como o pixel da Meta) para avaliar as
            campanhas de divulgação. Se você escolher &ldquo;Só o
            essencial&rdquo;, nenhum cookie de terceiros é carregado. Você pode
            mudar de ideia limpando os dados do site no navegador — o aviso
            aparecerá de novo.
          </p>
        </Secao>

        <Secao titulo="Com quem compartilhamos">
          <p>
            Não vendemos nem cedemos seus dados. Eles ficam armazenados em
            provedores de infraestrutura contratados pelo projeto (banco de
            dados e hospedagem) e são acessados somente pela equipe do CSMG
            para operar a plataforma. Os painéis internos de acompanhamento
            mostram apenas números agregados, sem dados pessoais.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            Nos termos da LGPD, você pode solicitar acesso, correção ou
            exclusão dos seus dados, bem como informações sobre o tratamento.
            Fale com a equipe pelos canais oficiais do CSMG indicados na página
            inicial (Instagram ou WhatsApp) que atenderemos o seu pedido.
          </p>
        </Secao>

        <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
          <Link
            href="/"
            className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
          >
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </main>
  );
}
