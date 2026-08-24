// Cronograma de liberação de módulos por turma: "N módulos por semana".
//
// Monta as linhas de `turma_modulos` (migração 0026) que a tela
// /master/turmas gravaria à mão: os primeiros módulos já abertos ficam com a
// data de agora e o resto é agendado em lotes semanais, sempre no mesmo
// horário de Brasília. O aviso automático de módulo novo
// (`scripts/disparo-avisos-automatico.ts`) usa exatamente essas datas, então
// agendar aqui é o que faz o e-mail sair sozinho no dia certo.
//
// Sem `server-only`: lógica pura, testada em cronograma-turma.test.ts.

import { paraInputLocal, timestampDeSaoPaulo } from "@/lib/datas";

export type ModuloDoCronograma = { id: string; titulo: string; ordem: number };

export type LinhaCronograma = {
  modulo_id: string;
  /** ISO com fuso: já abertos = agora; agendados = 08:00 de Brasília. */
  liberacao_em: string;
};

/** 7 dias entre lotes — o curso é semanal e o aviso é horário. */
const UMA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

export function montarCronogramaSemanal(dados: {
  modulos: ModuloDoCronograma[];
  /** Quantos módulos (na ordem do curso) já estão liberados. */
  jaAbertos: number;
  porSemana: number;
  /** Primeiro lote agendado, hora de Brasília: "2026-08-31T08:00". */
  primeiraSemana: string;
  agora?: Date;
}): LinhaCronograma[] {
  if (!Number.isInteger(dados.porSemana) || dados.porSemana < 1) {
    throw new Error("Informe quantos módulos abrem por semana (mínimo 1).");
  }

  const inicio = timestampDeSaoPaulo(dados.primeiraSemana);
  if (!inicio) {
    throw new Error(
      `Data do primeiro lote inválida: "${dados.primeiraSemana}". Use AAAA-MM-DDTHH:MM (Brasília).`,
    );
  }
  const inicioMs = new Date(inicio).getTime();

  const agora = (dados.agora ?? new Date()).toISOString();
  const ordenados = [...dados.modulos].sort((a, b) => a.ordem - b.ordem);

  return ordenados.map((modulo, indice) => {
    if (indice < dados.jaAbertos) {
      return { modulo_id: modulo.id, liberacao_em: agora };
    }
    const semana = Math.floor((indice - dados.jaAbertos) / dados.porSemana);
    // Aritmética em ms sobre o instante do primeiro lote e volta pro literal
    // de Brasília — o plano fica legível ("...T08:00:00-03:00") e igual ao que
    // a tela /master/turmas gravaria.
    const quando = new Date(inicioMs + semana * UMA_SEMANA_MS);
    const local = timestampDeSaoPaulo(paraInputLocal(quando.toISOString()));
    if (!local) throw new Error("Falha ao montar a data do lote.");
    return { modulo_id: modulo.id, liberacao_em: local };
  });
}
