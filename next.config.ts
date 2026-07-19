import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
