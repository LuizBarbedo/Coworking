// Converte os DOCX de quiz do lote de agosto (disciplinas 12–15) no JSON que
// scripts/carregar-lote-conteudo.ts consome.
//
//   node scripts/preparar-lote-12-15.mjs > conteudo/lote-12-15.json
//
// Os quatro arquivos vieram no mesmo formato (10 perguntas × 5 alternativas,
// numeradas, uma alternativa por linha):
//
//   Tema 01 · 🌱 Título do tema
//   1. Enunciado...
//   a) ...
//   ...
//   ✔ Resposta correta: b)          ← o ✔ aparece em alguns arquivos só
//   Explicação: ...                  ← fica de fora
//
// A explicação NÃO entra: não há coluna no schema e, se fosse parar na base da
// IA, o assistente entregaria o gabarito ao aluno.

import mammoth from "mammoth";
import { join } from "node:path";

const CONTEUDO = "conteudo";

async function texto(caminho) {
  const { value } = await mammoth.extractRawText({ path: caminho });
  return value;
}

/** Quebra uma alternativa por linha em {letra, texto}. */
function lerAlternativas(bruto) {
  const alternativas = [];
  const partes = bruto.split(/(?:^|\s)([a-e])\)\s+/gm);
  for (let i = 1; i < partes.length; i += 2) {
    const letra = partes[i];
    const texto = partes[i + 1].replace(/\s+/g, " ").trim();
    if (texto) alternativas.push({ letra, texto });
  }
  return alternativas;
}

/** 10 perguntas numeradas num arquivo só. */
function parsear(bruto) {
  const perguntas = [];
  const blocos = bruto.split(/\n(?=\d+\.\s)/).filter((b) => /^\d+\.\s/.test(b));
  for (const bloco of blocos) {
    const enunciado = bloco.match(/^\d+\.\s*([\s\S]*?)\n\s*a\)/);
    const alternativas = bloco.match(/\n(a\)[\s\S]*?)\n\s*✔?\s*Resposta correta:/);
    const correta = bloco.match(/Resposta correta:\s*([a-e])\)?/);
    if (!enunciado || !alternativas || !correta) {
      throw new Error(`bloco ilegível: ${bloco.slice(0, 120)}`);
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
    if (p.alternativas.length !== 5) {
      problemas.push(`pergunta ${i + 1}: ${p.alternativas.length} alternativa(s)`);
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

/** Ordem do módulo → arquivos da disciplina. */
const LOTE = [
  {
    modulo_ordem: 12,
    quiz: "Quiz Aspectos Juridicos e Formalizacao.docx",
    ebooks: [
      {
        arquivo: "conteudo/E-book Aspectos Juridicos e Formalizacao.pdf",
        titulo: "E-book — Aspectos Jurídicos e Formalização de Empresas",
      },
    ],
  },
  {
    modulo_ordem: 13,
    quiz: "Quiz Financiamento e Cooperativismo de Credito.docx",
    ebooks: [
      {
        arquivo: "conteudo/E-book Financiamento e Cooperativismo de Credito.pdf",
        titulo: "E-book — Financiamento e Cooperativismo de Crédito",
      },
    ],
  },
  {
    modulo_ordem: 14,
    quiz: "Quiz Empreendedorismo Social.docx",
    ebooks: [
      {
        arquivo: "conteudo/E-book Empreendedorismo Social.pdf",
        titulo: "E-book — Empreendedorismo Social (CAMPO Mangueira)",
      },
    ],
  },
  {
    modulo_ordem: 15,
    quiz: "Quiz Cooperativismo Principios e Aplicacoes.docx",
    ebooks: [
      {
        arquivo: "conteudo/E-book Cooperativismo Principios e Aplicacoes.pdf",
        titulo: "E-book — Cooperativismo: Princípios e Aplicações",
      },
    ],
  },
];

const saida = [];
for (const item of LOTE) {
  const perguntas = parsear(await texto(join(CONTEUDO, item.quiz)));
  conferir(item.quiz, perguntas, 10);
  saida.push({
    modulo_ordem: item.modulo_ordem,
    ebooks: item.ebooks,
    perguntas: perguntas.map((p, i) => ({ numero: i + 1, ...p })),
  });
}

console.log(JSON.stringify(saida, null, 2));
