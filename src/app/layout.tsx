import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { ToasterProvider } from "@/components/ui/toast";
import "./globals.css";

// Tipografia da identidade: Figtree no corpo (humanista, cordial) e
// Bricolage Grotesque nos títulos (display com personalidade).
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  display: "swap",
});

// Aplica o tema salvo (ou o do sistema) antes da primeira pintura — evita
// flash de tema errado. Roda como primeiro script do body.
const scriptTema = `(function(){try{var t=localStorage.getItem("csmg-tema");var d=t?t==="escuro":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export const metadata: Metadata = {
  // Base das URLs absolutas de OG/Twitter; sem ela o Next assume localhost.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default:
      "CSMG — Plataforma de Capacitação · Coworking Social de Mudanças Globais",
    template: "%s · CSMG",
  },
  description:
    "Plataforma de capacitação online do Coworking Social de Mudanças Globais (CSMG), uma iniciativa da Prefeitura e SEIM/Integra Rio · Oroborus voltada a empreendedores, MEIs e autônomos da Região Metropolitana do Rio de Janeiro. Faça sua inscrição e tenha acesso gratuito aos cursos.",
  // favicon.ico, icon.svg, apple-icon.png e opengraph-image.tsx são detectados
  // por convenção de arquivo em src/app/ (Next 16) — sem `icons` manual.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${figtree.variable} ${bricolage.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}
