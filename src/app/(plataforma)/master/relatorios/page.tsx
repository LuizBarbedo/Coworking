import type { Metadata } from "next";
import { exigirPermissao } from "@/lib/auth";
import { obterMetricas } from "@/lib/metricas";
import {
  PainelMetricas,
  resolverDias,
} from "@/components/painel/painel-metricas";

export const metadata: Metadata = { title: "Relatórios — CSMG" };

// Métricas ao vivo a cada visita (mesmo comportamento do /relatorios).
export const dynamic = "force-dynamic";

export default async function RelatoriosMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  await exigirPermissao("ver_relatorios");
  const parametros = await searchParams;
  const dias = resolverDias(parametros.dias);
  const metricas = await obterMetricas(dias);

  return (
    <div className="animate-aparecer">
      <PainelMetricas
        metricas={metricas}
        dias={dias}
        basePath="/master/relatorios"
      />
    </div>
  );
}
