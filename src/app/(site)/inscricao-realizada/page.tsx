import type { Metadata } from "next";
import { ConfirmacaoInscricao } from "@/components/site/confirmacao-inscricao";

export const metadata: Metadata = {
  title: "Inscrição realizada — CSMG",
  // Página de destino de conversão (Google Ads/Meta contam o carregamento):
  // não deve aparecer em busca nem ser navegável por fora.
  robots: { index: false, follow: false },
};

// O formulário navega pra cá com página cheia (window.location) de propósito:
// o carregamento real garante o page_view da tag de conversão. A matrícula
// viaja por sessionStorage — nunca pela URL (que vai pros logs das
// ferramentas de anúncio).
export default function InscricaoRealizadaPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-lg">
        <ConfirmacaoInscricao />
      </div>
    </main>
  );
}
