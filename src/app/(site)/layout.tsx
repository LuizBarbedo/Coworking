import Script from "next/script";

// Tag de conversão do Google Ads (pedido da equipe de redes sociais). Só a
// landing pública precisa dela — por isso vive no layout do grupo (site), fora
// da plataforma logada. AW-18309539438 é um ID público e fixo (vai no HTML do
// cliente); não é segredo, então não vira env var.
const GOOGLE_ADS_ID = "AW-18309539438";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Evita disparar conversões em dev/preview; só produção.
  const emProducao = process.env.NODE_ENV === "production";
  return (
    <>
      {emProducao && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-ads-gtag" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
          </Script>
        </>
      )}
      {children}
    </>
  );
}
