import type { MetadataRoute } from "next";

// Indexa só a landing pública; área logada, painel e APIs ficam fora dos
// buscadores. O sitemap aponta a URL canônica.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/login",
          "/primeiro-acesso",
          "/painel",
          "/modulos",
          "/master",
          "/relatorios",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
