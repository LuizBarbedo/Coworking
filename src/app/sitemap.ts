import type { MetadataRoute } from "next";

// Só a landing e a política de privacidade são públicas e indexáveis.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return [
    {
      url: base,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/privacidade`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
