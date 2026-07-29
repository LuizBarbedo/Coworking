import Script from "next/script";

// Tags de medição de anúncios (pedido da equipe de redes sociais). Só a
// landing pública precisa delas — por isso vivem no layout do grupo (site),
// fora da plataforma logada. Os dois IDs são públicos e fixos (vão no HTML do
// cliente); não são segredo, então não viram env var.
const GOOGLE_ADS_ID = "AW-18309539438";
const META_PIXEL_ID = "1745087516515852";

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
          {/* Pixel da Meta: o snippet oficial, com o PageView da carga. A
              conversão da inscrição é o evento CompleteRegistration, disparado
              na página /inscricao-realizada (lib/meta-pixel.ts). */}
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}
      {children}
    </>
  );
}
