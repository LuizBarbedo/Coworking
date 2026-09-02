import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LOCAL (não commitar): dev server acessado pelo IP do KVM.
  // A segunda entrada é a prévia da landing servida pelo nginx na 8080
  // (docs/ambiente-de-teste-landing.md) — sem ela o Next 16 barra as
  // requisições cross-origin do modo de desenvolvimento.
  allowedDevOrigins: ["147.79.107.52", "147.79.107.52:8080"],
  // Deploy atômico (scripts/deploy.sh): o build escreve num diretório novo e
  // a troca pro ".next" servido acontece com o serviço parado — sem janela
  // de assets quebrados pra quem está navegando durante o deploy.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Upload de PDF/DOCX/XLSX na base de conhecimento da IA (o padrão é 1 MB).
    serverActions: { bodySizeLimit: "20mb" },
  },
  // Libs de extração de texto: usadas só no servidor, não devem ser empacotadas.
  serverExternalPackages: ["unpdf", "mammoth", "exceljs"],
  // Não anunciar o framework pra quem varre a internet atrás de alvo.
  poweredByHeader: false,
  // Cabeçalhos de segurança em toda resposta servida pelo Next.
  // NÃO tem CSP de script aqui de propósito: a página usa scripts inline
  // (anti-flash do tema, gtag, pixel da Meta) e uma CSP séria exigiria nonce
  // em cada um — fica pra um passo próprio, não pra ser meia-boca agora.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Só HTTPS por 1 ano; protege quem digita o domínio sem https://.
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Impede embutir a plataforma logada em iframe de terceiro
          // (clickjacking). Os dois cabeçalhos: o antigo e o moderno.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Navegador não "adivinha" tipo de arquivo — barra upload que se
          // faz passar por outra coisa.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Não vaza a URL cheia (que pode ter id de aluno) pro Google/Meta.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
