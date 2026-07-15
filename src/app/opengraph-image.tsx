import { ImageResponse } from "next/og";

// OG image do site (1200×630), gerada em código: a Roda CSMG + lockup
// tipográfico sobre papel, com a régua quadricolor da marca no rodapé.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Plataforma de Capacitação — Coworking Social de Mudanças Globais";

/** Baixa o subconjunto da fonte no Google Fonts só com os glifos usados. */
async function carregarFonte(familia: string, texto: string, peso: number) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(familia)}:wght@${peso}&text=${encodeURIComponent(texto)}`;
  const css = await (await fetch(url)).text();
  const recurso = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!recurso) throw new Error(`fonte ${familia} indisponível para a OG image`);
  return (await fetch(recurso[1])).arrayBuffer();
}

const TITULO = "Coworking Social de Mudanças Globais";
const EYEBROW = "PLATAFORMA DE CAPACITAÇÃO · AVA";
const CHAMADA = "Formação gratuita em transformação social";

export default async function Image() {
  const [display, corpo] = await Promise.all([
    carregarFonte("Bricolage Grotesque", TITULO, 700),
    carregarFonte("Figtree", EYEBROW + CHAMADA, 500),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FAF7F2",
          padding: "72px 80px 0",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 48, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
            <div
              style={{
                fontFamily: "Figtree",
                fontSize: 26,
                letterSpacing: 6,
                color: "#17605B",
                marginBottom: 28,
              }}
            >
              {EYEBROW}
            </div>
            <div
              style={{
                fontFamily: "Bricolage",
                fontSize: 74,
                lineHeight: 1.08,
                color: "#14262B",
              }}
            >
              {TITULO}
            </div>
            <div
              style={{
                fontFamily: "Figtree",
                fontSize: 30,
                color: "#5B6B68",
                marginTop: 26,
              }}
            >
              {CHAMADA}
            </div>
          </div>
          {/* A Roda CSMG (mesma geometria do logo-roda.svg, ampliada) */}
          <svg width="340" height="340" viewBox="0 0 64 64" fill="none">
            <path d="M 53.25 37.69 A 22 22 0 0 1 33.92 53.92" stroke="#D98E1B" strokeWidth="7" strokeLinecap="round" />
            <path d="M 26.31 53.25 A 22 22 0 0 1 10.08 33.92" stroke="#17605B" strokeWidth="7" strokeLinecap="round" />
            <path d="M 10.75 26.31 A 22 22 0 0 1 30.08 10.08" stroke="#C93A2E" strokeWidth="7" strokeLinecap="round" />
            <path d="M 37.69 10.75 A 22 22 0 0 1 53.92 30.08" stroke="#114B46" strokeWidth="7" strokeLinecap="round" />
            <circle cx="44.22" cy="36.45" r="3.6" fill="#D98E1B" />
            <circle cx="27.55" cy="44.22" r="3.6" fill="#17605B" />
            <circle cx="19.78" cy="27.55" r="3.6" fill="#C93A2E" />
            <circle cx="36.45" cy="19.78" r="3.6" fill="#114B46" />
          </svg>
        </div>
        {/* Régua quadricolor: as quatro pessoas da roda, lado a lado */}
        <div style={{ display: "flex", height: 14 }}>
          <div style={{ flex: 1, background: "#17605B" }} />
          <div style={{ flex: 1, background: "#D98E1B" }} />
          <div style={{ flex: 1, background: "#C93A2E" }} />
          <div style={{ flex: 1, background: "#114B46" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: display, weight: 700 as const, style: "normal" as const },
        { name: "Figtree", data: corpo, weight: 500 as const, style: "normal" as const },
      ],
    },
  );
}
