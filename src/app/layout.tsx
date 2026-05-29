import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coworking Social de Mudanças Globais (CSMG) — IVIG",
  description:
    "Plataforma de educação online do Coworking Social de Mudanças Globais (CSMG), uma iniciativa do Instituto Virtual Internacional de Mudanças Globais (IVIG). Faça sua inscrição e tenha acesso gratuito aos cursos.",
  icons: {
    icon: "/logo-coworking.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
