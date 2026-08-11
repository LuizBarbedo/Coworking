// Barra de filtros dos relatórios — um bloco só, sempre no mesmo lugar.
//
// Antes: as pílulas de visão ficavam acima do título, o período no canto
// direito do cabeçalho e a turma abaixo dele — e na visão Turma a turma
// pulava pro topo, porque quem desenhava era outro componente. Três estilos
// e uma posição que mudava conforme a aba.
//
// Agora as três escolhas moram no mesmo cartão, com rótulo visível, e a
// linha de resumo diz em uma frase qual recorte está no ar.

import Link from "next/link";
import {
  GrupoPilulas,
  type OpcaoPilula,
  type ValorDePilula,
} from "@/components/ui/pilulas";

export type LinhaDeFiltro = {
  rotulo: string;
  opcoes: OpcaoPilula[];
  ativo: ValorDePilula;
  hrefPara: (valor: ValorDePilula) => string;
  destaque?: boolean;
};

export function BarraFiltros({
  linhas,
  resumo,
  hrefLimpar,
}: {
  linhas: LinhaDeFiltro[];
  /** Frase curta do recorte ativo (ex.: "Turma 2 · últimos 30 dias"). */
  resumo?: string;
  /** Presente só quando há algo fora do padrão pra limpar. */
  hrefLimpar?: string;
}) {
  const visiveis = linhas.filter((l) => l.opcoes.length > 0);
  if (visiveis.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-superficie p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        {visiveis.map((linha) => (
          <div
            key={linha.rotulo}
            className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
          >
            <span
              aria-hidden="true"
              className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400"
            >
              {linha.rotulo}
            </span>
            <GrupoPilulas
              rotuloDoGrupo={linha.rotulo}
              opcoes={linha.opcoes}
              ativo={linha.ativo}
              hrefPara={linha.hrefPara}
              destaque={linha.destaque}
            />
          </div>
        ))}
      </div>

      {resumo || hrefLimpar ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
          {resumo ? (
            <p className="text-slate-500">
              Mostrando{" "}
              <span className="font-medium text-slate-700">
                {resumo}
              </span>
              .
            </p>
          ) : (
            <span />
          )}
          {hrefLimpar ? (
            <Link
              href={hrefLimpar}
              className="text-slate-500 underline underline-offset-2 transition hover:text-brand-700 dark:hover:text-brand-300"
            >
              Limpar filtros
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
