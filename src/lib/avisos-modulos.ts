/**
 * Detecção de módulos que abriram para cada turma e ainda não foram anunciados.
 *
 * A regra é "abriu e ninguém foi avisado", **sem janela de tempo**: se o cron
 * ficar parado dois dias, a rodada seguinte recupera sozinha. O preço disso é
 * precisar de um corte de ativação (`desde`), senão a primeira execução
 * anunciaria o catálogo inteiro que já está no ar.
 *
 * Duas formas de um módulo "abrir", conforme a turma (migrações 0019 e 0026):
 *   - turma com `conteudo_restrito`: quando `turma_modulos.liberacao_em` passa;
 *   - turma sem restrição: quando `modulos.publicar_em` passa.
 * Em ambos os casos `publicado` precisa ser true — o RLS exige publicado E
 * liberado, então avisar antes levaria o aluno a um módulo que não abre.
 *
 * Sem `server-only`: aqui é lógica pura, testada em avisos-modulos.test.ts.
 * Quem toca banco e SMTP é o script de disparo.
 */

export type TurmaParaAviso = {
  numero: number;
  conteudo_restrito: boolean;
};

export type ModuloParaAviso = {
  id: string;
  titulo: string;
  ordem: number;
  publicado: boolean;
  publicar_em: string | null;
};

export type PlanoTurmaModulo = {
  turma: number;
  modulo_id: string;
  liberacao_em: string | null;
};

export type ModuloLiberado = {
  turma: number;
  moduloId: string;
  titulo: string;
  /** Quando abriu para esta turma, como veio do banco. */
  abertoEm: string;
};

/** Prefixo reservado: `aviso_disciplina:` e afins entram sem refatorar nada. */
const PREFIXO = "aviso_modulo";

/** Chave de idempotência gravada em `envios_email.tipo`. */
export function chaveAviso(turma: number, moduloId: string): string {
  return `${PREFIXO}:${moduloId}:t${turma}`;
}

/** Já abriu? Data ausente conta como fechado (fail-closed no eixo do módulo). */
function jaAbriu(quando: string | null, agora: Date, desde: Date): boolean {
  if (!quando) return false;
  const data = new Date(quando);
  if (Number.isNaN(data.getTime())) return false;
  return data <= agora && data > desde;
}

export function detectarLiberacoes(dados: {
  turmas: TurmaParaAviso[];
  modulos: ModuloParaAviso[];
  turmaModulos: PlanoTurmaModulo[];
  jaAvisados: Set<string>;
  agora: Date;
  desde: Date;
}): ModuloLiberado[] {
  const { turmas, modulos, turmaModulos, jaAvisados, agora, desde } = dados;

  const publicados = modulos.filter((modulo) => modulo.publicado);
  const ordemDoModulo = new Map(modulos.map((modulo) => [modulo.id, modulo.ordem]));
  const liberacoes: ModuloLiberado[] = [];

  for (const turma of turmas) {
    for (const modulo of publicados) {
      // A data de abertura depende do regime da turma.
      const abertoEm = turma.conteudo_restrito
        ? (turmaModulos.find((p) => p.turma === turma.numero && p.modulo_id === modulo.id)
            ?.liberacao_em ?? null)
        : modulo.publicar_em;

      if (!jaAbriu(abertoEm, agora, desde)) continue;
      if (jaAvisados.has(chaveAviso(turma.numero, modulo.id))) continue;

      liberacoes.push({
        turma: turma.numero,
        moduloId: modulo.id,
        titulo: modulo.titulo,
        abertoEm: abertoEm as string,
      });
    }
  }

  return liberacoes.sort(
    (a, b) =>
      a.turma - b.turma ||
      (ordemDoModulo.get(a.moduloId) ?? 0) - (ordemDoModulo.get(b.moduloId) ?? 0),
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Resumo do módulo para o corpo do e-mail
//
// Tudo sai do banco: título, disciplinas e contagem de aulas. Nenhum nome de
// módulo ou de professor no código — foi isso que travou o aviso anterior, que
// exigia editar o HTML e fazer deploy a cada liberação.
// ───────────────────────────────────────────────────────────────────────────

export type DisciplinaParaResumo = {
  id: string;
  titulo: string;
  ordem: number;
  publicado: boolean;
};

export type ResumoModulo = {
  titulo: string;
  disciplinas: Array<{ titulo: string; aulas: number }>;
  totalAulas: number;
  /** "12 aulas", "1 aula" ou vazio quando ainda não há aula publicada. */
  resumoAulas: string;
};

/** Contagem em português, com vazio no zero pro e-mail poder omitir a frase. */
export function textoAulas(quantidade: number): string {
  if (quantidade <= 0) return "";
  return quantidade === 1 ? "1 aula" : `${quantidade} aulas`;
}

export function montarResumoModulo(dados: {
  modulo: { titulo: string };
  disciplinas: DisciplinaParaResumo[];
  aulasPorDisciplina: Record<string, number>;
}): ResumoModulo {
  const disciplinas = dados.disciplinas
    .filter((disciplina) => disciplina.publicado)
    .sort((a, b) => a.ordem - b.ordem)
    .map((disciplina) => ({
      titulo: disciplina.titulo,
      aulas: dados.aulasPorDisciplina[disciplina.id] ?? 0,
    }));

  const totalAulas = disciplinas.reduce((soma, disciplina) => soma + disciplina.aulas, 0);

  return {
    titulo: dados.modulo.titulo,
    disciplinas,
    totalAulas,
    resumoAulas: textoAulas(totalAulas),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Texto do aviso — puro, para o e-mail só montar o envelope
// ───────────────────────────────────────────────────────────────────────────

/** Título cadastrado pela equipe entra em HTML: escapa antes de interpolar. */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function assuntoAviso(modulos: ResumoModulo[]): string {
  if (modulos.length === 1) return `Novo módulo liberado: ${modulos[0].titulo}`;
  return `${modulos.length} módulos novos liberados no seu curso`;
}

/** Lista os módulos que abriram, com as aulas e as disciplinas quando há mais de uma. */
export function listaModulosHtml(modulos: ResumoModulo[]): string {
  const itens = modulos
    .map((modulo) => {
      const partes = [`<strong>${escaparHtml(modulo.titulo)}</strong>`];
      if (modulo.resumoAulas) partes.push(modulo.resumoAulas);
      // Só vale nomear as disciplinas quando o módulo tem mais de uma: com uma
      // só, o título costuma repetir o do módulo.
      if (modulo.disciplinas.length > 1) {
        partes.push(modulo.disciplinas.map((d) => escaparHtml(d.titulo)).join(", "));
      }
      return `<li>${partes.join(" — ")}</li>`;
    })
    .join("\n      ");

  return `<ul>\n      ${itens}\n    </ul>`;
}
