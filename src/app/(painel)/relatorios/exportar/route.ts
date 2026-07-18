// Exportação CSV do painel: aceita a senha do /relatorios (cookie httpOnly)
// OU sessão de equipe com a permissão ver_relatorios (aba da administração).
// ?tipo=origens (padrão) ou ?tipo=serie; ?dias=7|30|90.

import { painelAutenticado } from "@/lib/painel-auth";
import { getSessaoEquipe } from "@/lib/auth";
import { temPermissao } from "@/lib/permissoes";
import { obterMetricas } from "@/lib/metricas";
import { gerarCsvOrigens, gerarCsvSerie } from "@/lib/csv-relatorio";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const autorizado =
    (await painelAutenticado()) ||
    temPermissao(await getSessaoEquipe(), "ver_relatorios");
  if (!autorizado) {
    return new Response("Não autorizado", { status: 401 });
  }

  const parametros = new URL(request.url).searchParams;
  const dias = [7, 30, 90].includes(Number(parametros.get("dias")))
    ? Number(parametros.get("dias"))
    : 30;
  const tipo = parametros.get("tipo") === "serie" ? "serie" : "origens";

  const metricas = await obterMetricas(dias);
  const csv =
    tipo === "serie"
      ? gerarCsvSerie(metricas.serie)
      : gerarCsvOrigens(metricas.origens ?? []);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="csmg-${tipo}-${dias}dias.csv"`,
    },
  });
}
