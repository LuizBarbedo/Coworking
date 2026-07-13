import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload de PDF/DOCX/XLSX na base de conhecimento da IA (o padrão é 1 MB).
    serverActions: { bodySizeLimit: "20mb" },
  },
  // Libs de extração de texto: usadas só no servidor, não devem ser empacotadas.
  serverExternalPackages: ["unpdf", "mammoth", "exceljs"],
};

export default nextConfig;
