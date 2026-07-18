// Exportação CSV do painel de relatórios. Ponto e vírgula como separador e
// BOM no início: é o formato que o Excel/LibreOffice pt-BR abre direto
// (vírgula decimal impede o separador padrão).

import { formatarTaxaConversao } from "@/lib/conversao";
import type { OrigemAgregada, PontoSerie } from "@/lib/metricas";
import { decodificarRotulo } from "@/lib/origem";

const BOM = "﻿";
const SEPARADOR = ";";

type Celula = string | number | null | undefined;

function campo(valor: Celula): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function montar(linhas: Celula[][]): string {
  return (
    BOM + linhas.map((l) => l.map(campo).join(SEPARADOR)).join("\r\n") + "\r\n"
  );
}

/** Tabela de origens sem agrupamento — cada linha crua da RPC vira uma linha. */
export function gerarCsvOrigens(origens: OrigemAgregada[]): string {
  return montar([
    ["Fonte", "Meio", "Campanha", "Visitas", "Inscrições", "Conversão"],
    ...origens.map((o) => [
      o.source ? decodificarRotulo(o.source) : "direto / orgânico",
      o.medium && decodificarRotulo(o.medium),
      o.campaign && decodificarRotulo(o.campaign),
      o.visitas,
      o.total,
      formatarTaxaConversao(o.visitas, o.total),
    ]),
  ]);
}

/** Série diária: visitas × inscrições × conversão por dia. */
export function gerarCsvSerie(serie: PontoSerie[]): string {
  return montar([
    ["Dia", "Visitas", "Inscrições", "Conversão"],
    ...serie.map((p) => [
      p.dia,
      p.visitas,
      p.total,
      formatarTaxaConversao(p.visitas, p.total),
    ]),
  ]);
}
