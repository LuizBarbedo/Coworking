// Converte os DOCX de quiz da pasta conteudo/ no JSON que
// scripts/carregar-lote-conteudo.ts consome.
//
//   node scripts/preparar-lote-quizzes.mjs > conteudo/lote-10-11.json
//
// Dois formatos de origem, porque cada professor entregou de um jeito:
//
//   Aurélio (11 arquivos "quizzes_NN-*.docx", 3 perguntas cada)
//     Quiz 1 — Conceitual
//     Pergunta: ...
//     Alternativas:
//     a) ...  (às vezes as quatro na MESMA linha)
//     Resposta certa: c
//     Comentário pedagógico: ...      ← fica de fora (é gabarito comentado)
//
//   Jorge (1 arquivo, 10 perguntas)
//     Tema 01 · ...
//     1. ...
//     a) ... (uma por linha, até e)
//     ✔ Resposta correta: b)
//     Explicação: ...                 ← fica de fora
//
// A explicação/comentário NÃO entra: não há coluna no schema e, se fosse parar
// na base da IA, o assistente entregaria o gabarito ao aluno.

import mammoth from "mammoth";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const CONTEUDO = "conteudo";

async function texto(caminho) {
  const { value } = await mammoth.extractRawText({ path: caminho });
  return value;
}

/** Quebra "a) foo b) bar c) baz" ou uma alternativa por linha em {letra, texto}. */
function lerAlternativas(bruto) {
  const alternativas = [];
  // Divide antes de cada marcador "x)" que abre alternativa (início de linha ou
  // depois de espaço), preservando a letra.
  const partes = bruto.split(/(?:^|\s)([a-e])\)\s+/gm);
  for (let i = 1; i < partes.length; i += 2) {
    const letra = partes[i];
    const texto = partes[i + 1].replace(/\s+/g, " ").trim();
    if (texto) alternativas.push({ letra, texto });
  }
  return alternativas;
}

/** Formato do Aurélio: 3 perguntas por arquivo. */
function parsearAurelio(bruto) {
  const perguntas = [];
  const blocos = bruto.split(/\nQuiz \d+ — /).slice(1);
  for (const bloco of blocos) {
    const enunciado = bloco.match(/Pergunta:\s*([\s\S]*?)\n\s*Alternativas:/);
    const alternativas = bloco.match(/Alternativas:\s*([\s\S]*?)\n\s*Resposta certa:/);
    const correta = bloco.match(/Resposta certa:\s*([a-e])\b/);
    if (!enunciado || !alternativas || !correta) {
      throw new Error(`bloco do Aurélio ilegível: ${bloco.slice(0, 120)}`);
    }
    perguntas.push({
      enunciado: enunciado[1].replace(/\s+/g, " ").trim(),
      alternativas: lerAlternativas(alternativas[1]),
      correta: correta[1],
    });
  }
  return perguntas;
}

/** Formato do Jorge: 10 perguntas numeradas num arquivo só. */
function parsearJorge(bruto) {
  const perguntas = [];
  // Cada pergunta começa em "N. " no início de uma linha e termina na resposta.
  const blocos = bruto.split(/\n(?=\d+\.\s)/).filter((b) => /^\d+\.\s/.test(b));
  for (const bloco of blocos) {
    const enunciado = bloco.match(/^\d+\.\s*([\s\S]*?)\n\s*a\)/);
    const alternativas = bloco.match(/\n(a\)[\s\S]*?)\n\s*✔?\s*Resposta correta:/);
    const correta = bloco.match(/Resposta correta:\s*([a-e])\)?/);
    if (!enunciado || !alternativas || !correta) {
      throw new Error(`bloco do Jorge ilegível: ${bloco.slice(0, 120)}`);
    }
    perguntas.push({
      enunciado: enunciado[1].replace(/\s+/g, " ").trim(),
      alternativas: lerAlternativas("\n" + alternativas[1]),
      correta: correta[1],
    });
  }
  return perguntas;
}

function conferir(rotulo, perguntas, esperadas) {
  const problemas = [];
  if (perguntas.length !== esperadas) {
    problemas.push(`${perguntas.length} perguntas (esperava ${esperadas})`);
  }
  perguntas.forEach((p, i) => {
    if (p.alternativas.length < 4) {
      problemas.push(`pergunta ${i + 1}: só ${p.alternativas.length} alternativa(s)`);
    }
    if (!p.alternativas.some((a) => a.letra === p.correta)) {
      problemas.push(`pergunta ${i + 1}: gabarito "${p.correta}" sem alternativa`);
    }
    if (p.enunciado.length < 20) {
      problemas.push(`pergunta ${i + 1}: enunciado curto demais`);
    }
  });
  if (problemas.length) {
    throw new Error(`${rotulo}:\n  - ${problemas.join("\n  - ")}`);
  }
  console.error(`✓ ${rotulo}: ${perguntas.length} pergunta(s)`);
}

const arquivosAurelio = (await readdir(CONTEUDO))
  .filter((f) => /^quizzes_\d+-.*\.docx$/.test(f))
  .sort();

const perguntasAurelio = [];
for (const arquivo of arquivosAurelio) {
  const bruto = await texto(join(CONTEUDO, arquivo));
  const aula = bruto.match(/Aula (\d+):\s*(.+)/);
  const doArquivo = parsearAurelio(bruto);
  conferir(`${arquivo} (${aula?.[2]?.trim() ?? "?"})`, doArquivo, 3);
  perguntasAurelio.push(...doArquivo);
}

const perguntasJorge = parsearJorge(
  await texto(join(CONTEUDO, "Quiz Gestão e Planejamento Financeiro.docx")),
);
conferir("Quiz Gestão e Planejamento Financeiro.docx", perguntasJorge, 10);

const numerar = (ps) => ps.map((p, i) => ({ numero: i + 1, ...p }));

console.log(
  JSON.stringify(
    [
      {
        modulo_ordem: 10,
        ebooks: [
          {
            arquivo: "conteudo/ebook_00-introducao.docx",
            titulo: "E-book — Abertura: o que é IA e o método PEDRA",
          },
          {
            arquivo: "conteudo/ebook_01-pipoca.docx",
            titulo: "E-book — Receita 1: Pipoca",
          },
        ],
        perguntas: numerar(perguntasAurelio),
      },
      {
        modulo_ordem: 11,
        ebooks: [
          {
            arquivo: "conteudo/E-book Gestão e Planejamento Financeiro.docx",
            titulo: "E-book — Gestão e Planejamento Financeiro",
          },
          // Cobre os temas da avaliação que as videoaulas e o e-book não
          // alcançam (agentes financeiros, CMN/BACEN/CVM, composição do juro).
          {
            arquivo: "conteudo/material-complementar-financeiro.md",
            titulo: "Material complementar — Sistema Financeiro, agentes e juros",
          },
        ],
        perguntas: numerar(perguntasJorge),
      },
    ],
    null,
    2,
  ),
);
