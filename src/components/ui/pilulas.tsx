// Grupo de pílulas de filtro — o mesmo controle em toda a administração.
// Antes cada tela repetia as classes na mão (visões e turma nos relatórios,
// turma na visão Turma, tipos nos eventos), e as quatro cópias já tinham
// divergido em tamanho e cor.

import Link from "next/link";

export type ValorDePilula = string | number | null;

export type OpcaoPilula = {
  valor: ValorDePilula;
  rotulo: string;
  /** Número ao lado do rótulo (ex.: quantos itens naquele recorte). */
  contagem?: number;
};

export function GrupoPilulas({
  rotuloDoGrupo,
  opcoes,
  ativo,
  hrefPara,
  destaque = false,
}: {
  /** Vira o aria-label do grupo; o rótulo visível fica na barra de filtros. */
  rotuloDoGrupo: string;
  opcoes: OpcaoPilula[];
  ativo: ValorDePilula;
  hrefPara: (valor: ValorDePilula) => string;
  /** Pílula maior, pra escolha principal da tela (ex.: a visão). */
  destaque?: boolean;
}) {
  if (opcoes.length === 0) return null;

  return (
    <nav aria-label={rotuloDoGrupo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const selecionada = ativo === o.valor;
        return (
          <Link
            key={String(o.valor)}
            href={hrefPara(o.valor)}
            aria-current={selecionada ? "page" : undefined}
            className={`rounded-full border transition ${
              destaque ? "px-4 py-1.5 text-sm" : "px-3.5 py-1 text-xs"
            } ${
              selecionada
                ? // brand não é revestido no escuro: brand-950 sobre a
                  // superfície escura some, então a ativa usa brand-800.
                  "border-brand-600 bg-brand-50 font-medium text-brand-900 dark:bg-brand-800/50 dark:text-brand-100"
                : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-300"
            }`}
          >
            {o.rotulo}
            {o.contagem !== undefined ? (
              <span
                className={`ml-1.5 tabular-nums ${
                  selecionada ? "text-brand-600 dark:text-brand-300" : "text-slate-400"
                }`}
              >
                {o.contagem}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
