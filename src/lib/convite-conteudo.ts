/**
 * Conteúdo do convite de acesso que depende da TURMA do aluno.
 *
 * O convite anunciava "a 1ª turma começou" e listava, em HTML fixo, os
 * módulos de abertura da turma 1 — texto errado para quem entrou na turma 2
 * (que tem calendário próprio, `turmas.conteudo_restrito` + `turma_modulos`)
 * e para qualquer turma futura.
 *
 * Mesma decisão do aviso de módulo novo (`avisos-modulos.ts`): nome de módulo
 * nenhum vive no código — a lista sai do banco. Aqui fica só a regra pura de
 * "o que está aberto para esta turma" e a frase de abertura.
 *
 * Sem `server-only`: lógica pura, testada em convite-conteudo.test.ts.
 */

import { listaModulosHtml, type ResumoModulo } from "@/lib/avisos-modulos";
import { moduloLiberadoParaTurma } from "@/lib/liberacao-modulos";

/** Módulo como o convite precisa vê-lo: publicado é a verdade (migração 0019). */
export type ModuloParaConvite = {
  id: string;
  titulo: string;
  ordem: number;
  publicado: boolean;
};

/** "2ª" — vazio quando não há turma (migração pendente), pro texto omitir. */
export function ordinalTurma(numero: number | null | undefined): string {
  if (!numero || !Number.isFinite(numero) || numero < 1) return "";
  return `${Math.trunc(numero)}ª`;
}

/**
 * Módulos que o aluno desta turma já enxerga, na ordem do curso.
 * Turma sem restrição: tudo que está publicado. Turma restrita: só o que
 * `turma_modulos` já abriu (data ausente = fechado, igual ao RLS).
 */
export function modulosAbertosDaTurma(dados: {
  conteudoRestrito: boolean;
  modulos: ModuloParaConvite[];
  plano: Array<{ modulo_id: string; liberacao_em: string | null }>;
  agora?: Date;
}): ModuloParaConvite[] {
  const agora = dados.agora ?? new Date();
  const porModulo = new Map(dados.plano.map((l) => [l.modulo_id, l.liberacao_em]));

  return dados.modulos
    .filter((modulo) => modulo.publicado)
    .filter((modulo) =>
      moduloLiberadoParaTurma(dados.conteudoRestrito, porModulo.get(modulo.id), agora),
    )
    .sort((a, b) => a.ordem - b.ordem);
}

/** Conteúdo já aberto para a turma + tamanho do curso (pra frase final). */
export type ConteudoDoConvite = {
  modulos: ResumoModulo[];
  /** Total de módulos publicados no curso — diz se ainda falta abrir algo. */
  totalDoCurso: number;
};

/** Teto da lista no e-mail: 15 itens viram parede de texto e ninguém lê. */
const MAX_LISTA = 5;

/**
 * Parágrafo de abertura do convite: a turma certa e o conteúdo que já está no
 * ar para ela. Sem módulos (turma restrita cujo plano ainda não abriu, ou
 * leitura do banco que falhou), fala do acesso sem prometer aula nenhuma.
 */
export function aberturaConviteHtml(dados: {
  turma: number | null | undefined;
  conteudo?: ConteudoDoConvite;
}): string {
  const ordinal = ordinalTurma(dados.turma);
  const sujeito = ordinal
    ? `A <strong>${ordinal} turma</strong> do curso de mentoria do <strong>Coworking
      Social de Mudanças Globais</strong> começou`
    : `O curso de mentoria do <strong>Coworking Social de Mudanças Globais</strong>
      começou`;

  const abertura = `<p>${sujeito} — e o seu acesso está liberado.</p>`;

  const modulos = dados.conteudo?.modulos ?? [];
  if (!modulos.length) return abertura;

  const naLista = modulos.slice(0, MAX_LISTA);
  const restantes = modulos.length - naLista.length;
  const resto =
    restantes > 0
      ? `\n      <p>E ${
          restantes === 1 ? "outro 1 módulo" : `outros ${restantes} módulos`
        } já liberados esperando por você.</p>`
      : "";

  // Só promete o que existe: com o curso todo aberto, não há "demais módulos".
  const total = dados.conteudo?.totalDoCurso ?? modulos.length;
  const porVir =
    total > modulos.length
      ? "\n      <p>Os demais módulos serão liberados ao longo das próximas semanas.</p>"
      : "";

  return `${abertura}
      <p><strong>As primeiras aulas já estão disponíveis</strong> na
      plataforma:</p>
      ${listaModulosHtml(naLista)}${resto}${porVir}`;
}
