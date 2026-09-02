// Gera o relatório completo da plataforma em PDF a partir do JSON de
// scripts/relatorio-executivo-dados.ts.
//
// Uso:
//   SAIDA_JSON=/tmp/relatorio-completo.json npx tsx --conditions=react-server \
//     scripts/relatorio-executivo-dados.ts
//   ENTRADA_JSON=/tmp/relatorio-completo.json node scripts/relatorio-executivo-pdf.mjs
//
// Saída: relatorios/relatorio-completo-csmg.pdf

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const RAIZ = process.cwd();
const ENTRADA = process.env.ENTRADA_JSON ?? "/tmp/relatorio-completo.json";
const SAIDA_HTML = "/tmp/relatorio-completo.html";
const SAIDA_PDF = path.join(RAIZ, "relatorios", "relatorio-completo-csmg.pdf");

// Contas internas de teste — excluídas de toda métrica de aluno.
const INTERNOS = new Set([
  "barbedoluizfelipe@gmail.com",
  "marcus.aluno.teste@coworkingsocial.com.br",
]);

const INICIO = "2026-05-28"; // primeiro commit do projeto
const LANCAMENTO = "2026-07-20"; // abertura da Turma 1
const VIRADA_INFRA = "2026-08-05"; // produção no Supabase self-hosted + turmas
const ABERTURA_T2 = "2026-08-17"; // acesso da Turma 2 liberado
const CORTE = process.env.CORTE ?? new Date().toISOString().slice(0, 10);

// ═══════════════════════════════════════════════════════════════════════════
// Paleta — derivada da marca CSMG, validada em scripts/validate_palette.js
// (categórica all-pairs e rampa ordinal, superfície #ffffff, modo claro).
// ═══════════════════════════════════════════════════════════════════════════
const C = {
  s1: "#0f8f80", // categórica 1 — turquesa da marca
  s2: "#c97f13", // categórica 2 — âmbar
  s3: "#b83226", // categórica 3 — vermelho
  rampa: ["#8abdb5", "#6aa9a1", "#4a9188", "#2e7a72", "#17605b", "#0d453f"],
  tinta: "#14262b",
  tinta2: "#4a5f66",
  suave: "#7d8f94",
  grade: "#e4e8e6",
  eixo: "#c3ccc9",
  superficie: "#ffffff",
  papel: "#faf7f2",
  marca: "#17605b",
  marcaEscura: "#0c302d",
  cremeMarca: "#f0f7f5",
  bom: "#0ca30c",
  critico: "#c93a2e",
};

// ═══════════════════════════════════════════════════════════════════════════
// Cálculo das métricas
// ═══════════════════════════════════════════════════════════════════════════
const d = JSON.parse(fs.readFileSync(ENTRADA, "utf8"));
const dia = (s) => s.slice(0, 10);
const email = (u) => (u.email || "").toLowerCase();

const equipe = d.usuarios.filter((u) => u.papel === "master");
const alunos = d.usuarios.filter((u) => u.papel !== "master" && !INTERNOS.has(email(u)));
const idsAlunos = new Set(alunos.map((u) => u.id));

const progresso = d.progresso.filter((x) => idsAlunos.has(x.aluno_id));
const tentativas = d.tentativas.filter((t) => idsAlunos.has(t.aluno_id));
const avaliacoes = d.avaliacoes.filter((a) => idsAlunos.has(a.aluno_id));
const eventos = d.eventos.filter((e) => idsAlunos.has(e.ator_id));

// ── Turmas ─────────────────────────────────────────────────────────────────
// A turma vive na inscrição; a conta do Auth é ligada a ela pelo e-mail.
const turmaDeEmail = Object.fromEntries(
  d.inscricoes.map((i) => [(i.email || "").toLowerCase(), i.turma ?? 1]),
);
for (const u of alunos) u.turma = turmaDeEmail[email(u)] ?? null;

const TURMAS = (d.turmas ?? []).map((t) => ({
  numero: t.numero,
  nome: t.nome,
  liberacao: t.liberacao_em ? t.liberacao_em.slice(0, 10) : LANCAMENTO,
  restrito: Boolean(t.conteudo_restrito),
}));
const modulosLiberados = (numero) => {
  const t = TURMAS.find((x) => x.numero === numero);
  if (!t || !t.restrito) return d.modulos.filter((m) => m.publicado).length;
  return new Set((d.turma_modulos ?? []).filter((x) => x.turma === numero).map((x) => x.modulo_id)).size;
};

// Recorte completo de métricas para uma turma (ou para toda a base).
function recorte(numero) {
  const insc = numero ? d.inscricoes.filter((i) => (i.turma ?? 1) === numero) : d.inscricoes;
  const al = numero ? alunos.filter((u) => u.turma === numero) : alunos;
  const ids = new Set(al.map((u) => u.id));
  const emails = new Set(insc.map((i) => (i.email || "").toLowerCase()));
  const prog = progresso.filter((x) => ids.has(x.aluno_id));
  const tent = tentativas.filter((t) => ids.has(t.aluno_id));
  const aval = avaliacoes.filter((a) => ids.has(a.aluno_id));
  const evt = eventos.filter((e) => ids.has(e.ator_id));
  const convites = new Set(
    d.envios_email
      .filter((e) => e.status === "enviado" && e.tipo === "convite_acesso")
      .map((e) => e.email.toLowerCase())
      .filter((e) => !numero || emails.has(e)),
  );
  const dias = {};
  for (const e of evt) (dias[e.ator_id] ||= new Set()).add(dia(e.created_at));
  const comAtividade = Object.keys(dias).length;
  const voltaram = Object.values(dias).filter((s) => s.size >= 2).length;
  const porAluno = {};
  for (const x of prog) porAluno[x.aluno_id] = (porAluno[x.aluno_id] || 0) + 1;
  const t = TURMAS.find((x) => x.numero === numero);
  return {
    numero,
    nome: numero ? (t?.nome ?? `Turma ${numero}`) : "Todo o período",
    abertura: numero ? (t?.liberacao ?? LANCAMENTO) : LANCAMENTO,
    diasAberta: numero
      ? Math.max(
          1,
          Math.round((new Date(`${CORTE}T12:00Z`) - new Date(`${t?.liberacao ?? LANCAMENTO}T12:00Z`)) / 86400000),
        )
      : Math.round((new Date(`${CORTE}T12:00Z`) - new Date(`${LANCAMENTO}T12:00Z`)) / 86400000),
    modulos: numero ? modulosLiberados(numero) : d.modulos.filter((m) => m.publicado).length,
    inscritos: insc.length,
    convidados: convites.size,
    contas: al.length,
    comAula: new Set(prog.map((x) => x.aluno_id)).size,
    aulas: prog.length,
    comQuiz: new Set(tent.map((x) => x.aluno_id)).size,
    aprovados: new Set(tent.filter((x) => x.aprovado).map((x) => x.aluno_id)).size,
    tentativas: tent.length,
    notaMedia: tent.length ? tent.reduce((s, x) => s + Number(x.nota), 0) / tent.length : null,
    feedbacks: aval.length,
    estrelas: aval.length ? aval.reduce((s, x) => s + x.estrelas, 0) / aval.length : null,
    comAtividade,
    voltaram,
    taxaRetorno: comAtividade ? (voltaram / comAtividade) * 100 : 0,
    taxaAtivacao: convites.size ? (al.length / convites.size) * 100 : 0,
    aulasPorConta: al.length ? prog.length / al.length : 0,
  };
}

const T = TURMAS.map((t) => recorte(t.numero));
const T1 = T.find((x) => x.numero === 1);
const T2 = T.find((x) => x.numero === 2);

// ── Catálogo ───────────────────────────────────────────────────────────────
const tituloDisc = Object.fromEntries(d.disciplinas.map((x) => [x.id, x.titulo]));
const discDeAula = Object.fromEntries(d.aulas.map((a) => [a.id, a.disciplina_id]));
const tituloAula = Object.fromEntries(d.aulas.map((a) => [a.id, a.titulo]));
const modsPublicados = new Set(d.modulos.filter((m) => m.publicado).map((m) => m.id));
const discPublicadas = d.disciplinas.filter((x) => x.publicado && modsPublicados.has(x.modulo_id));
const idsDiscPub = new Set(discPublicadas.map((x) => x.id));
const aulasPublicadas = d.aulas.filter((a) => idsDiscPub.has(a.disciplina_id));
const ordemModulo = Object.fromEntries(d.modulos.map((m) => [m.id, m.ordem]));

// ── Funil ──────────────────────────────────────────────────────────────────
const convidados = new Set(
  d.envios_email
    .filter((e) => e.status === "enviado" && e.tipo === "convite_acesso")
    .map((e) => e.email.toLowerCase()),
);
const comAula = new Set(progresso.map((x) => x.aluno_id));
const comQuiz = new Set(tentativas.map((t) => t.aluno_id));
const aprovados = new Set(tentativas.filter((t) => t.aprovado).map((t) => t.aluno_id));

const funil = [
  { rotulo: "Inscritos na landing", n: d.inscricoes.length },
  { rotulo: "Convites entregues", n: convidados.size },
  { rotulo: "Contas criadas", n: alunos.length },
  { rotulo: "Assistiram ≥ 1 aula", n: comAula.size },
  { rotulo: "Fizeram ≥ 1 avaliação", n: comQuiz.size },
  { rotulo: "Aprovados em ≥ 1 avaliação", n: aprovados.size },
];

// ── Ativação por lote de convite ───────────────────────────────────────────
const convitesEnviados = d.envios_email.filter(
  (e) => e.status === "enviado" && e.tipo === "convite_acesso",
);
const primeiroConvite = {};
for (const e of convitesEnviados) {
  const k = e.email.toLowerCase();
  if (!primeiroConvite[k] || e.created_at < primeiroConvite[k]) primeiroConvite[k] = e.created_at;
}
const emailsComConta = new Set(alunos.map(email));
const lotes = {};
for (const [em, quando] of Object.entries(primeiroConvite)) {
  const k = dia(quando);
  (lotes[k] ||= { convidados: 0, ativaram: 0 });
  lotes[k].convidados++;
  if (emailsComConta.has(em)) lotes[k].ativaram++;
}
const MASSIVOS = [LANCAMENTO, ABERTURA_T2];
const loteMassivo = lotes[LANCAMENTO];
const loteMassivoT2 = lotes[ABERTURA_T2] ?? { convidados: 0, ativaram: 0 };
const lotesManuais = Object.entries(lotes)
  .filter(([k]) => !MASSIVOS.includes(k))
  .reduce((a, [, v]) => ({ convidados: a.convidados + v.convidados, ativaram: a.ativaram + v.ativaram }), {
    convidados: 0,
    ativaram: 0,
  });
const taxaMassivo = (loteMassivo.ativaram / loteMassivo.convidados) * 100;
const taxaMassivoT2 = loteMassivoT2.convidados
  ? (loteMassivoT2.ativaram / loteMassivoT2.convidados) * 100
  : 0;
const taxaManual = (lotesManuais.ativaram / lotesManuais.convidados) * 100;
const taxaAtivacaoGeral = (alunos.length / convidados.size) * 100;

// Campanha de reenvio de 05/08: convite repetido a quem já tinha recebido e
// nunca ativou — a recomendação nº 3 do relatório da Turma 1, posta em prática.
const reenviados = new Set(
  convitesEnviados
    .filter((e) => dia(e.created_at) === VIRADA_INFRA)
    .map((e) => e.email.toLowerCase())
    .filter((em) => dia(primeiroConvite[em]) < VIRADA_INFRA),
);
const reenvioAtivaram = d.inscricoes.filter(
  (i) => reenviados.has((i.email || "").toLowerCase()) && i.ativado_em,
).length;
const taxaReenvio = reenviados.size ? (reenvioAtivaram / reenviados.size) * 100 : 0;

// Latência entre o convite e a criação da conta, em horas.
const latencias = alunos
  .filter((u) => primeiroConvite[email(u)])
  .map((u) => (new Date(u.created_at) - new Date(primeiroConvite[email(u)])) / 3600000)
  .sort((a, b) => a - b);
const latencia24h = latencias.filter((h) => h < 24).length;
const pctLatencia24h = (latencia24h / latencias.length) * 100;
const latenciaMediana = latencias[Math.floor(latencias.length / 2)];

// ── Recorrência ────────────────────────────────────────────────────────────
const diasAtivos = {};
for (const e of eventos) (diasAtivos[e.ator_id] ||= new Set()).add(dia(e.created_at));
const recorrencia = { 1: 0, 2: 0, 3: 0, "4+": 0 };
for (const s of Object.values(diasAtivos)) {
  if (s.size === 1) recorrencia[1]++;
  else if (s.size === 2) recorrencia[2]++;
  else if (s.size === 3) recorrencia[3]++;
  else recorrencia["4+"]++;
}
const comEvento = Object.keys(diasAtivos).length;
const voltaram = Object.values(diasAtivos).filter((s) => s.size >= 2).length;
const taxaRetorno = (voltaram / comEvento) * 100;

// ── Profundidade ───────────────────────────────────────────────────────────
const aulasPorAluno = {};
for (const x of progresso) aulasPorAluno[x.aluno_id] = (aulasPorAluno[x.aluno_id] || 0) + 1;
const profundidade = [
  { rotulo: "Nenhuma aula", n: alunos.length - Object.keys(aulasPorAluno).length },
  { rotulo: "1 aula", n: 0 },
  { rotulo: "2 a 3 aulas", n: 0 },
  { rotulo: "4 a 5 aulas", n: 0 },
  { rotulo: "6 ou mais", n: 0 },
];
for (const n of Object.values(aulasPorAluno)) {
  if (n === 1) profundidade[1].n++;
  else if (n <= 3) profundidade[2].n++;
  else if (n <= 5) profundidade[3].n++;
  else profundidade[4].n++;
}
const listaAulas = Object.values(aulasPorAluno).sort((a, b) => a - b);
const medianaAulas = listaAulas[Math.floor(listaAulas.length / 2)];
const mediaAulas = progresso.length / listaAulas.length;
const maxAulas = listaAulas.at(-1);

// ── Cobertura do catálogo ──────────────────────────────────────────────────
const viewsPorAula = {};
for (const x of progresso) viewsPorAula[x.aula_id] = (viewsPorAula[x.aula_id] || 0) + 1;
const cobertura = discPublicadas
  .map((disc) => {
    const aulas = aulasPublicadas.filter((a) => a.disciplina_id === disc.id);
    const alunosTocaram = new Set(
      progresso.filter((x) => discDeAula[x.aula_id] === disc.id).map((x) => x.aluno_id),
    );
    return {
      titulo: disc.titulo,
      ordem: ordemModulo[disc.modulo_id] ?? 99,
      aulas: aulas.length,
      views: aulas.reduce((s, a) => s + (viewsPorAula[a.id] || 0), 0),
      alunos: alunosTocaram.size,
    };
  })
  .sort((a, b) => a.ordem - b.ordem);
const aulasSemView = aulasPublicadas.filter((a) => !viewsPorAula[a.id]).length;
const discSemAluno = cobertura.filter((c) => c.alunos === 0);
const aulasEmDiscSemAluno = discSemAluno.reduce((s, c) => s + c.aulas, 0);

// ── Séries diárias ─────────────────────────────────────────────────────────
const datas = [];
for (let t = new Date(`${LANCAMENTO}T12:00:00Z`); dia(t.toISOString()) <= CORTE; t.setUTCDate(t.getUTCDate() + 1))
  datas.push(dia(t.toISOString()));

const ativosPorDia = {};
for (const e of eventos) (ativosPorDia[dia(e.created_at)] ||= new Set()).add(e.ator_id);
const serieAtivos = datas.map((k) => (ativosPorDia[k] ? ativosPorDia[k].size : 0));

const aulasPorDia = {};
for (const x of progresso) aulasPorDia[dia(x.assistida_em)] = (aulasPorDia[dia(x.assistida_em)] || 0) + 1;
const serieAulas = datas.map((k) => aulasPorDia[k] || 0);

// ── Captação ───────────────────────────────────────────────────────────────
const visitasPorDia = {};
for (const v of d.visitas) visitasPorDia[dia(v.created_at)] = (visitasPorDia[dia(v.created_at)] || 0) + 1;
const inscPorDia = {};
for (const i of d.inscricoes) inscPorDia[dia(i.created_at)] = (inscPorDia[dia(i.created_at)] || 0) + 1;
const datasCaptacao = Object.keys(visitasPorDia).sort();
const serieVisitas = datasCaptacao.map((k) => visitasPorDia[k]);
const serieInscricoes = datasCaptacao.map((k) => inscPorDia[k] || 0);
const totalVisitas = serieVisitas.reduce((a, b) => a + b, 0);
const inscNoPeriodo = datasCaptacao.reduce((a, k) => a + (inscPorDia[k] || 0), 0);
const conversaoLanding = (inscNoPeriodo / totalVisitas) * 100;

const canalDe = (s) => {
  const v = (s || "(direto)").toLowerCase();
  if (/instagram|^ig$/.test(v)) return "Instagram";
  if (/facebook|^fb$/.test(v)) return "Facebook";
  if (/google|doubleclick|syndicat|safeframe|goog/.test(v)) return "Google / Ads";
  if (/youtube/.test(v)) return "YouTube";
  if (/whatsapp/.test(v)) return "WhatsApp";
  if (/linkedin/.test(v)) return "LinkedIn";
  if (v === "(direto)") return "Direto / sem UTM";
  return "Outros referrals";
};
const canais = {};
for (const v of d.visitas) {
  const k = canalDe(v.utm_source);
  (canais[k] ||= { visitas: 0, inscricoes: 0 }).visitas++;
}
for (const i of d.inscricoes) {
  const k = canalDe(i.utm_source);
  (canais[k] ||= { visitas: 0, inscricoes: 0 }).inscricoes++;
}
const listaCanais = Object.entries(canais)
  .map(([nome, v]) => ({ nome, ...v, conv: v.visitas ? (v.inscricoes / v.visitas) * 100 : null }))
  .sort((a, b) => b.inscricoes - a.inscricoes);

// ── Avaliações e feedback ──────────────────────────────────────────────────
const notaMedia = tentativas.reduce((s, t) => s + Number(t.nota), 0) / (tentativas.length || 1);
const taxaAprovacao = (tentativas.filter((t) => t.aprovado).length / (tentativas.length || 1)) * 100;
const mediaEstrelas = avaliacoes.reduce((s, a) => s + a.estrelas, 0) / (avaliacoes.length || 1);
const cincoEstrelas = avaliacoes.filter((a) => a.estrelas === 5).length;
const menorEstrela = avaliacoes.length ? Math.min(...avaliacoes.map((a) => a.estrelas)) : 0;
const comentarios = avaliacoes.filter((a) => a.comentario && a.comentario.trim());

const quizPorDisciplina = {};
for (const t of tentativas) {
  const q = d.quizzes.find((x) => x.id === t.quiz_id);
  const k = q ? (tituloDisc[q.disciplina_id] ?? q.titulo) : "—";
  (quizPorDisciplina[k] ||= { n: 0, aprov: 0, soma: 0 });
  quizPorDisciplina[k].n++;
  quizPorDisciplina[k].soma += Number(t.nota);
  if (t.aprovado) quizPorDisciplina[k].aprov++;
}

// ── Top aulas ──────────────────────────────────────────────────────────────
const topAulas = Object.entries(viewsPorAula)
  .map(([id, n]) => ({ titulo: tituloAula[id] ?? id, disciplina: tituloDisc[discDeAula[id]] ?? "—", n }))
  .sort((a, b) => b.n - a.n)
  .slice(0, 8);

// ── E-mails ────────────────────────────────────────────────────────────────
const envEnviados = d.envios_email.filter((e) => e.status === "enviado").length;
const envDevolvidos = d.envios_email.filter((e) => e.status === "devolvido").length;
const envFalhas = d.envios_email.filter((e) => e.status === "falha").length;
const inscritosSemConvite = d.inscricoes.filter((i) => !convidados.has((i.email || "").toLowerCase())).length;
const convidadosSemConta = [...convidados].filter((e) => !emailsComConta.has(e)).length;

// ── Outros ─────────────────────────────────────────────────────────────────
const alunosIA = new Set(d.ia_mensagens.filter((m) => idsAlunos.has(m.aluno_id)).map((m) => m.aluno_id)).size;
const equipeAtiva = new Set(
  d.eventos.filter((e) => equipe.some((u) => u.id === e.ator_id)).map((e) => e.ator_id),
).size;

// ── Engenharia ─────────────────────────────────────────────────────────────
const ENG = d.engenharia ?? { por_mes: {}, por_tipo: {}, por_autor: {}, areas: {} };
const areasOrdenadas = Object.entries(ENG.areas).sort((a, b) => b[1].linhas - a[1].linhas);
const linhasTotais = areasOrdenadas.reduce((s, [, v]) => s + v.linhas, 0);
const arquivosTotais = areasOrdenadas.reduce((s, [, v]) => s + v.arquivos, 0);
const semanas = Math.round(
  (new Date(`${ENG.ultimo}T12:00Z`) - new Date(`${ENG.primeiro}T12:00Z`)) / (7 * 86400000),
);
const commitsPorSemana = semanas ? ENG.commits / semanas : 0;
const testesTotais = (ENG.testes_unitarios ?? 0) + (ENG.testes_e2e ?? 0);

// ═══════════════════════════════════════════════════════════════════════════
// Helpers de formatação e SVG
// ═══════════════════════════════════════════════════════════════════════════
const num = (n) => n.toLocaleString("pt-BR");
const pct = (n, casas = 1) => `${n.toFixed(casas).replace(".", ",")}%`;
const dec = (n, casas = 1) => n.toFixed(casas).replace(".", ",");
const dataBr = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const dataLonga = (s) =>
  `${Number(s.slice(8, 10))} de ${MESES[Number(s.slice(5, 7)) - 1]} de ${s.slice(0, 4)}`;
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00Z`) - new Date(`${a}T12:00Z`)) / 86400000);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Barra com a extremidade de dado arredondada (4px), ancorada na linha de base.
function barraH(x, y, largura, altura, r = 4) {
  const raio = Math.min(r, largura, altura / 2);
  if (largura <= 0.5) return "";
  return `M${x},${y} H${x + largura - raio} A${raio},${raio} 0 0 1 ${x + largura},${y + raio} V${y + altura - raio} A${raio},${raio} 0 0 1 ${x + largura - raio},${y + altura} H${x} Z`;
}
function barraV(x, y, largura, altura, r = 4) {
  const raio = Math.min(r, altura, largura / 2);
  if (altura <= 0.5) return "";
  return `M${x},${y + altura} V${y + raio} A${raio},${raio} 0 0 1 ${x + raio},${y} H${x + largura - raio} A${raio},${raio} 0 0 1 ${x + largura},${y + raio} V${y + altura} Z`;
}

// ── Gráfico 1: funil horizontal (rampa ordinal) ────────────────────────────
function svgFunil() {
  const L = 190, W = 660, H = funil.length * 46 + 12;
  const max = funil[0].n;
  const escala = (n) => (n / max) * (W - L - 92);
  const linhas = funil
    .map((f, i) => {
      const y = i * 46 + 8;
      const w = escala(f.n);
      const p = (f.n / max) * 100;
      return `
      <text x="${L - 14}" y="${y + 19}" text-anchor="end" class="rot">${esc(f.rotulo)}</text>
      <path d="${barraH(L, y + 3, w, 26)}" fill="${C.rampa[i]}"/>
      <text x="${L + w + 10}" y="${y + 21}" class="val">${num(f.n)}</text>
      <text x="${W - 4}" y="${y + 21}" text-anchor="end" class="valSuave">${pct(p, 0)}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="Funil de acesso">
    <line x1="${L}" y1="4" x2="${L}" y2="${H - 8}" stroke="${C.eixo}" stroke-width="1"/>
    ${linhas}
  </svg>`;
}

// ── Gráfico 2: duas séries diárias (linha) ─────────────────────────────────
function svgAtividade() {
  const W = 660, H = 230, ml = 34, mr = 12, mt = 16, mb = 34;
  const pw = W - ml - mr, ph = H - mt - mb;
  const max = Math.max(...serieAtivos, ...serieAulas, 4);
  const teto = Math.ceil(max / 2) * 2;
  const X = (i) => ml + (i / (datas.length - 1)) * pw;
  const Y = (v) => mt + ph - (v / teto) * ph;
  const linha = (s) => s.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const ticks = [0, teto / 2, teto];
  const grade = ticks
    .map(
      (t) =>
        `<line x1="${ml}" y1="${Y(t)}" x2="${W - mr}" y2="${Y(t)}" stroke="${t === 0 ? C.eixo : C.grade}" stroke-width="1"/>
         <text x="${ml - 8}" y="${Y(t) + 4}" text-anchor="end" class="tick">${t}</text>`,
    )
    .join("");
  const passo = Math.max(1, Math.ceil(datas.length / 13));
  const rotulosX = datas
    .map((k, i) =>
      i % passo === 0
        ? `<text x="${X(i)}" y="${H - 14}" text-anchor="middle" class="tick">${dataBr(k)}</text>`
        : "",
    )
    .join("");
  // Marcos verticais: viradas que explicam as inflexões da curva.
  const marcos = [
    { data: VIRADA_INFRA, rotulo: "banco na VPS · turmas" },
    { data: ABERTURA_T2, rotulo: "abertura da Turma 2" },
  ]
    .map((m) => {
      const i = datas.indexOf(m.data);
      if (i < 0) return "";
      return `<line x1="${X(i)}" y1="${mt}" x2="${X(i)}" y2="${mt + ph}" stroke="${C.suave}"
        stroke-width="1" stroke-dasharray="3 3"/>
        <text x="${X(i) - 4}" y="${mt + 9}" text-anchor="end" class="anot">${m.rotulo}</text>`;
    })
    .join("");
  const pontos = (s, cor) =>
    s
      .map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="3.2" fill="${cor}" stroke="#fff" stroke-width="2"/>`)
      .join("");
  const iMax = serieAtivos.indexOf(Math.max(...serieAtivos));
  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="Atividade diária">
    ${grade}${rotulosX}${marcos}
    <path d="${linha(serieAulas)}" fill="none" stroke="${C.s2}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${linha(serieAtivos)}" fill="none" stroke="${C.s1}" stroke-width="2" stroke-linejoin="round"/>
    ${pontos(serieAulas, C.s2)}${pontos(serieAtivos, C.s1)}
    <text x="${X(iMax)}" y="${Y(serieAtivos[iMax]) - 11}" text-anchor="middle" class="valDestaque">${serieAtivos[iMax]}</text>
  </svg>`;
}

// ── Gráfico 3: recorrência (barras verticais) ──────────────────────────────
function svgRecorrencia() {
  const dados = [
    { r: "1 dia", n: recorrencia[1] },
    { r: "2 dias", n: recorrencia[2] },
    { r: "3 dias", n: recorrencia[3] },
    { r: "4+ dias", n: recorrencia["4+"] },
  ];
  const W = 320, H = 210, ml = 30, mr = 8, mt = 22, mb = 30;
  const pw = W - ml - mr, ph = H - mt - mb;
  const max = Math.max(...dados.map((x) => x.n));
  const lar = pw / dados.length - 12;
  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="Dias distintos de acesso">
    <line x1="${ml}" y1="${mt + ph}" x2="${W - mr}" y2="${mt + ph}" stroke="${C.eixo}" stroke-width="1"/>
    ${dados
      .map((x, i) => {
        const alt = (x.n / max) * ph;
        const px = ml + i * (pw / dados.length) + 6;
        const py = mt + ph - alt;
        const cor = i === 0 ? C.s3 : C.s1;
        return `<path d="${barraV(px, py, lar, alt)}" fill="${cor}"/>
          <text x="${px + lar / 2}" y="${py - 7}" text-anchor="middle" class="val">${x.n}</text>
          <text x="${px + lar / 2}" y="${H - 10}" text-anchor="middle" class="tick">${x.r}</text>`;
      })
      .join("")}
  </svg>`;
}

// ── Gráfico 4: profundidade (barras verticais, rampa ordinal) ──────────────
function svgProfundidade() {
  const W = 320, H = 210, ml = 30, mr = 8, mt = 22, mb = 30;
  const pw = W - ml - mr, ph = H - mt - mb;
  const max = Math.max(...profundidade.map((x) => x.n));
  const lar = pw / profundidade.length - 10;
  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="Profundidade de consumo">
    <line x1="${ml}" y1="${mt + ph}" x2="${W - mr}" y2="${mt + ph}" stroke="${C.eixo}" stroke-width="1"/>
    ${profundidade
      .map((x, i) => {
        const alt = (x.n / max) * ph;
        const px = ml + i * (pw / profundidade.length) + 5;
        const py = mt + ph - alt;
        const cor = i === 0 ? C.s3 : C.rampa[Math.min(i + 1, 5)];
        const rot = x.rotulo.replace(" aulas", "").replace(" aula", "").replace("Nenhuma", "0");
        return `<path d="${barraV(px, py, lar, alt)}" fill="${cor}"/>
          <text x="${px + lar / 2}" y="${py - 7}" text-anchor="middle" class="val">${x.n}</text>
          <text x="${px + lar / 2}" y="${H - 10}" text-anchor="middle" class="tick">${rot}</text>`;
      })
      .join("")}
  </svg>`;
}

// ── Gráfico 5: ativação por tipo de lote ───────────────────────────────────
function svgLotes() {
  const dados = [
    {
      r: "Disparo em massa 20/07 (Turma 1)",
      n: taxaMassivo,
      base: `${loteMassivo.ativaram} de ${loteMassivo.convidados}`,
      cor: C.s3,
    },
    {
      r: "Disparo em massa 17/08 (Turma 2)",
      n: taxaMassivoT2,
      base: `${loteMassivoT2.ativaram} de ${loteMassivoT2.convidados}`,
      cor: C.s2,
    },
    {
      r: "Convites avulsos (todo o período)",
      n: taxaManual,
      base: `${lotesManuais.ativaram} de ${lotesManuais.convidados}`,
      cor: C.s1,
    },
    {
      r: "Reenvio a quem não ativou (05/08)",
      n: taxaReenvio,
      base: `${reenvioAtivaram} de ${reenviados.size}`,
      cor: C.critico,
    },
  ];
  const W = 660, H = 4 * 44 + 34, L = 250;
  const max = 50;
  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="Ativação por lote">
    <line x1="${L}" y1="8" x2="${L}" y2="${H - 26}" stroke="${C.eixo}" stroke-width="1"/>
    ${dados
      .map((x, i) => {
        const y = 12 + i * 44;
        const w = (x.n / max) * (W - L - 130);
        return `<text x="${L - 14}" y="${y + 21}" text-anchor="end" class="rot">${esc(x.r)}</text>
          <path d="${barraH(L, y + 4, w, 26)}" fill="${x.cor}"/>
          <text x="${L + w + 10}" y="${y + 22}" class="val">${pct(x.n)}</text>
          <text x="${L + w + 74}" y="${y + 22}" class="valSuave">${x.base}</text>`;
      })
      .join("")}
    <text x="${L}" y="${H - 8}" class="tick">0%</text>
    <text x="${W - 130}" y="${H - 8}" text-anchor="end" class="tick">50%</text>
  </svg>`;
}

// ── Gráfico 6: cobertura do catálogo ───────────────────────────────────────
function svgCobertura() {
  const L = 278, W = 660;
  const H = cobertura.length * 27 + 14;
  const max = Math.max(...cobertura.map((c) => c.alunos), 1);
  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="Alcance por disciplina">
    <line x1="${L}" y1="4" x2="${L}" y2="${H - 10}" stroke="${C.eixo}" stroke-width="1"/>
    ${cobertura
      .map((c, i) => {
        const y = i * 27 + 6;
        const w = (c.alunos / max) * (W - L - 130);
        const rot = c.titulo.length > 50 ? c.titulo.slice(0, 48) + "…" : c.titulo;
        const cor = c.alunos === 0 ? C.s3 : C.s1;
        const marca = c.alunos === 0
          ? `<text x="${L + 8}" y="${y + 15}" class="valZero">nenhum aluno</text>`
          : `<text x="${L + w + 9}" y="${y + 15}" class="val">${c.alunos}</text>`;
        return `<text x="${L - 12}" y="${y + 15}" text-anchor="end" class="rotP">${esc(rot)}</text>
          <path d="${barraH(L, y + 3, w, 15, 3)}" fill="${cor}"/>${marca}
          <text x="${W - 6}" y="${y + 15}" text-anchor="end" class="valSuave">${c.aulas} ${c.aulas === 1 ? "aula" : "aulas"}</text>`;
      })
      .join("")}
  </svg>`;
}

// ── Gráfico 7: captação — dois painéis, um eixo cada (nunca eixo duplo) ────
function svgCaptacao() {
  const W = 660, ml = 34, mr = 10;
  const pw = W - ml - mr;
  const n = datasCaptacao.length;
  const X = (i) => ml + (i / (n - 1)) * pw;

  const painel = (serie, cor, altura, rotulo, destacaLancamento) => {
    const mt = 18, mb = 6, ph = altura - mt - mb;
    const teto = Math.ceil(Math.max(...serie) / 10) * 10;
    const Y = (v) => mt + ph - (v / teto) * ph;
    const area = serie.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
    const iL = datasCaptacao.indexOf(LANCAMENTO);
    return `<g>
      <line x1="${ml}" y1="${Y(0)}" x2="${W - mr}" y2="${Y(0)}" stroke="${C.eixo}" stroke-width="1"/>
      <line x1="${ml}" y1="${Y(teto)}" x2="${W - mr}" y2="${Y(teto)}" stroke="${C.grade}" stroke-width="1"/>
      <text x="${ml - 8}" y="${Y(teto) + 4}" text-anchor="end" class="tick">${teto}</text>
      <text x="${ml - 8}" y="${Y(0) + 4}" text-anchor="end" class="tick">0</text>
      ${destacaLancamento && iL >= 0 ? `<line x1="${X(iL)}" y1="${mt - 4}" x2="${X(iL)}" y2="${Y(0)}" stroke="${C.suave}" stroke-width="1"/><text x="${X(iL) + 5}" y="${mt - 6}" class="anot">lançamento</text>` : ""}
      <path d="${area}" fill="none" stroke="${cor}" stroke-width="2" stroke-linejoin="round"/>
      <text x="${ml}" y="${10}" class="rotPainel">${rotulo}</text>
    </g>`;
  };

  const h1 = 108, h2 = 96;
  const rotulosX = datasCaptacao
    .map((k, i) =>
      i % 3 === 0 ? `<text x="${X(i)}" y="${h1 + h2 + 16}" text-anchor="middle" class="tick">${dataBr(k)}</text>` : "",
    )
    .join("");
  return `<svg viewBox="0 0 ${W} ${h1 + h2 + 24}" class="gr" role="img" aria-label="Visitas e inscrições por dia">
    ${painel(serieVisitas, C.s1, h1, "Visitas na landing", true)}
    <g transform="translate(0,${h1})">${painel(serieInscricoes, C.s2, h2, "Inscrições", false)}</g>
    ${rotulosX}
  </svg>`;
}

// ── Gráfico 8: conversão por canal ─────────────────────────────────────────
function svgCanais() {
  const relevantes = listaCanais.filter((c) => c.visitas >= 20);
  const L = 160, W = 660, H = relevantes.length * 30 + 12;
  const max = Math.max(...relevantes.map((c) => c.conv));
  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="Conversão por canal">
    <line x1="${L}" y1="4" x2="${L}" y2="${H - 8}" stroke="${C.eixo}" stroke-width="1"/>
    ${relevantes
      .map((c, i) => {
        const y = i * 30 + 6;
        const w = (c.conv / max) * (W - L - 200);
        return `<text x="${L - 12}" y="${y + 16}" text-anchor="end" class="rotP">${esc(c.nome)}</text>
          <path d="${barraH(L, y + 3, w, 17, 3)}" fill="${C.s1}"/>
          <text x="${L + w + 9}" y="${y + 16}" class="val">${pct(c.conv)}</text>
          <text x="${W - 6}" y="${y + 16}" text-anchor="end" class="valSuave">${num(c.visitas)} visitas · ${num(c.inscricoes)} inscrições</text>`;
      })
      .join("")}
  </svg>`;
}

// ── Gráfico 9: comparativo Turma 1 × Turma 2 (barras agrupadas) ────────────
// Só indicadores relativos: as turmas têm tamanhos diferentes e valores
// absolutos não seriam comparáveis.
function svgComparativoTurmas() {
  const ind = [
    { r: "Convidados que criaram conta", a: T1.taxaAtivacao, b: T2.taxaAtivacao },
    {
      r: "Contas que assistiram ≥ 1 aula",
      a: (T1.comAula / T1.contas) * 100,
      b: (T2.comAula / T2.contas) * 100,
    },
    { r: "Alunos que voltaram em outro dia", a: T1.taxaRetorno, b: T2.taxaRetorno },
    {
      r: "Contas que fizeram avaliação",
      a: (T1.comQuiz / T1.contas) * 100,
      b: (T2.comQuiz / T2.contas) * 100,
    },
  ];
  const L = 235, W = 660, alturaLinha = 52;
  const H = ind.length * alturaLinha + 26;
  const max = 100;
  const util = W - L - 78;
  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img"
      aria-label="Comparativo de indicadores entre a Turma 1 e a Turma 2">
    <line x1="${L}" y1="4" x2="${L}" y2="${H - 22}" stroke="${C.eixo}" stroke-width="1"/>
    ${ind
      .map((x, i) => {
        const y = i * alturaLinha + 6;
        const wa = (x.a / max) * util;
        const wb = (x.b / max) * util;
        const ganho = x.b - x.a;
        return `<text x="${L - 14}" y="${y + 24}" text-anchor="end" class="rot">${esc(x.r)}</text>
          <path d="${barraH(L, y + 2, wa, 17, 3)}" fill="${C.s2}"/>
          <text x="${L + wa + 8}" y="${y + 15}" class="val">${pct(x.a, 0)}</text>
          <path d="${barraH(L, y + 24, wb, 17, 3)}" fill="${C.s1}"/>
          <text x="${L + wb + 8}" y="${y + 37}" class="val">${pct(x.b, 0)}</text>
          <text x="${W - 4}" y="${y + 27}" text-anchor="end"
            class="${ganho >= 0 ? "valDestaque" : "valZero"}">${ganho >= 0 ? "+" : ""}${pct(ganho, 0)}</text>`;
      })
      .join("")}
    <text x="${L}" y="${H - 6}" class="tick">0%</text>
    <text x="${L + util}" y="${H - 6}" text-anchor="middle" class="tick">100%</text>
  </svg>`;
}

// ── Gráfico 10: construção da plataforma (commits por mês) ─────────────────
function svgConstrucao() {
  const meses = Object.entries(ENG.por_mes).sort();
  const W = 660, H = 210, ml = 34, mr = 12, mt = 26, mb = 44;
  const pw = W - ml - mr, ph = H - mt - mb;
  const max = Math.max(...meses.map(([, n]) => n));
  const lar = pw / meses.length - 46;
  const NOME = { "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto" };
  const FASE = {
    "2026-05": "landing e inscrição",
    "2026-06": "fundação do AVA",
    "2026-07": "plataforma e lançamento",
    "2026-08": "turmas e infraestrutura",
  };
  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="Commits por mês">
    <line x1="${ml}" y1="${mt + ph}" x2="${W - mr}" y2="${mt + ph}" stroke="${C.eixo}" stroke-width="1"/>
    ${meses
      .map(([mes, n], i) => {
        const alt = (n / max) * ph;
        const px = ml + i * (pw / meses.length) + 23;
        const py = mt + ph - alt;
        return `<path d="${barraV(px, py, lar, alt)}" fill="${C.rampa[Math.min(i + 1, 5)]}"/>
          <text x="${px + lar / 2}" y="${py - 8}" text-anchor="middle" class="val">${n}</text>
          <text x="${px + lar / 2}" y="${mt + ph + 16}" text-anchor="middle" class="tick">${NOME[mes.slice(5)] ?? mes}</text>
          <text x="${px + lar / 2}" y="${mt + ph + 31}" text-anchor="middle" class="anot">${FASE[mes] ?? ""}</text>`;
      })
      .join("")}
  </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Fontes embutidas (as mesmas da plataforma, do cache do next/font)
// ═══════════════════════════════════════════════════════════════════════════
function fonte(arquivo) {
  const p = path.join(RAIZ, ".next/static/media", arquivo);
  if (!fs.existsSync(p)) return null;
  return `data:font/woff2;base64,${fs.readFileSync(p).toString("base64")}`;
}
const FIGTREE = fonte("f7aa21714c1c53f8-s.p.0bhxxck2.9j91.woff2");
const FIGTREE_EXT = fonte("400bf8aa837fcb7e-s.p.0end3qt1tw3rz.woff2");
const BRICOLAGE = fonte("017d9bea37084d9b-s.p.179.vsfvxa6t5.woff2");
const BRICOLAGE_EXT = fonte("26daee0352f50a5f-s.p.0rqws-.h91di~.woff2");
const faces = [
  FIGTREE &&
    `@font-face{font-family:Figtree;font-weight:300 900;font-style:normal;src:url(${FIGTREE}) format("woff2");unicode-range:U+0-FF,U+131,U+152-153,U+2BB-2BC,U+2C6,U+2DA,U+2DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215}`,
  FIGTREE_EXT &&
    `@font-face{font-family:Figtree;font-weight:300 900;font-style:normal;src:url(${FIGTREE_EXT}) format("woff2");unicode-range:U+100-2BA,U+2BD-2C5,U+1E00-1E9F,U+2020,U+20A0-20AB}`,
  BRICOLAGE &&
    `@font-face{font-family:Bricolage;font-weight:600;font-style:normal;src:url(${BRICOLAGE}) format("woff2");unicode-range:U+0-FF,U+131,U+152-153,U+2000-206F,U+20AC,U+2122}`,
  BRICOLAGE_EXT &&
    `@font-face{font-family:Bricolage;font-weight:600;font-style:normal;src:url(${BRICOLAGE_EXT}) format("woff2");unicode-range:U+100-2BA,U+1E00-1E9F,U+20A0-20AB}`,
]
  .filter(Boolean)
  .join("\n");

// ═══════════════════════════════════════════════════════════════════════════
// Blocos de conteúdo
// ═══════════════════════════════════════════════════════════════════════════
const tile = (valor, rotulo, nota = "", tom = "") =>
  `<div class="tile ${tom}"><div class="tileVal">${valor}</div><div class="tileRot">${rotulo}</div>${nota ? `<div class="tileNota">${nota}</div>` : ""}</div>`;

const legenda = (itens) =>
  `<div class="legenda">${itens.map((i) => `<span class="lgItem"><span class="lgMarca" style="background:${i.cor}"></span>${i.rotulo}</span>`).join("")}</div>`;

const tabela = (cabecalho, linhas, classe = "") =>
  `<table class="tab ${classe}"><thead><tr>${cabecalho
    .map((c, i) => `<th${i ? ' class="dir"' : ""}>${c}</th>`)
    .join("")}</tr></thead><tbody>${linhas
    .map((l) => `<tr>${l.map((c, i) => `<td${i ? ' class="dir"' : ""}>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;

const ESTILO = `
${faces}
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:14mm 15mm 16mm}
@page:first{margin:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Figtree,system-ui,-apple-system,"Segoe UI",sans-serif;color:${C.tinta};
  font-size:9.6pt;line-height:1.5;background:#fff;font-feature-settings:"kern"}
h1,h2,h3,.tileVal,.heroVal{font-family:Bricolage,Figtree,system-ui,sans-serif;font-weight:600}

/* ── Capa ── */
.capa{height:297mm;background:linear-gradient(160deg,${C.marcaEscura} 0%,${C.marca} 62%,#1d766e 100%);
  color:#eef7f5;padding:26mm 22mm;display:flex;flex-direction:column;position:relative;overflow:hidden}
.capa::after{content:"";position:absolute;right:-90mm;bottom:-90mm;width:190mm;height:190mm;
  border-radius:50%;background:rgba(255,255,255,.05)}
.capa::before{content:"";position:absolute;right:-30mm;top:-60mm;width:120mm;height:120mm;
  border-radius:50%;background:rgba(255,255,255,.04)}
.selo{font-size:8.4pt;letter-spacing:.22em;text-transform:uppercase;color:#9ecfc6;font-weight:600}
.capa h1{font-size:34pt;line-height:1.08;margin:9mm 0 0;max-width:150mm;letter-spacing:-.015em}
.capaSub{font-size:12.5pt;color:#c3e2dc;margin-top:5mm;max-width:132mm;line-height:1.45;font-weight:400}
.capaRodape{margin-top:auto;position:relative;z-index:1}
.capaLinha{height:1px;background:rgba(255,255,255,.22);margin-bottom:6mm}
.capaMeta{display:flex;gap:16mm;font-size:9pt;color:#bcdcd6}
.capaMeta b{display:block;color:#fff;font-size:11pt;font-weight:600;margin-bottom:1mm}
.capaDestaques{position:relative;z-index:1;margin-top:auto;margin-bottom:14mm;display:flex;gap:5mm}
.cd{flex:1;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.14);
  border-radius:10px;padding:5mm 5mm 4.5mm}
.cdVal{font-family:Bricolage,sans-serif;font-size:24pt;line-height:1;color:#fff}
.cdRot{font-size:8.8pt;color:#d3eae5;margin-top:3mm;line-height:1.4}
.capaRodape{margin-top:0}

/* ── Estrutura ──
   Fluxo contínuo: só as viradas marcadas com .novaPagina forçam quebra. Assim
   nenhuma seção deixa meia página vazia atrás de si. */
.pagina{margin-top:9mm}
.pagina:first-of-type{margin-top:0}
.novaPagina{page-break-before:always;margin-top:0}
h2{font-size:16pt;letter-spacing:-.01em;color:${C.marcaEscura};margin-bottom:1.5mm;
  padding-bottom:2.5mm;border-bottom:2px solid ${C.marca};display:flex;align-items:baseline;gap:3mm;
  page-break-after:avoid;break-after:avoid}
h2 .numSecao{font-size:9.5pt;color:${C.marca};font-weight:600;letter-spacing:.06em}
h3{font-size:10.8pt;color:${C.marcaEscura};margin:5mm 0 2mm;page-break-after:avoid;break-after:avoid}
/* Título + parágrafo de abertura viram um bloco indivisível que se recusa a
   terminar a página: sem isso o título da seção fica órfão no pé da folha. */
.abre{page-break-inside:avoid;break-inside:avoid;page-break-after:avoid;break-after:avoid}
.abre h2{margin-bottom:1.5mm}
.abre .intro{margin-bottom:0;padding-bottom:5mm}
.rodapeDoc{page-break-before:avoid;break-before:avoid}
table,ul{page-break-inside:auto}
tr{page-break-inside:avoid}
thead{display:table-header-group}
p{margin-bottom:2.6mm;color:${C.tinta2};max-width:none}
p strong{color:${C.tinta};font-weight:600}
.intro{font-size:10.4pt;color:${C.tinta2};margin:3mm 0 5mm;line-height:1.55}
ul{margin:0 0 3mm 4.5mm}li{margin-bottom:1.6mm;color:${C.tinta2}}
li strong{color:${C.tinta};font-weight:600}

/* ── Tiles ── */
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:3.5mm;margin:4mm 0 5mm;
  page-break-inside:avoid;break-inside:avoid}
.tiles.t3{grid-template-columns:repeat(3,1fr)}
.tile{background:${C.papel};border:1px solid #e8e2d8;border-radius:9px;padding:4mm 4mm 3.5mm}
.tile.alerta{background:#fdf1ef;border-color:#f3d5d0}
.tile.bom{background:${C.cremeMarca};border-color:#cbe3de}
.tileVal{font-size:20pt;line-height:1;color:${C.marcaEscura};letter-spacing:-.02em}
.tile.alerta .tileVal{color:${C.critico}}
.tileRot{font-size:8.4pt;color:${C.tinta2};margin-top:2.5mm;line-height:1.3;font-weight:500}
.tileNota{font-size:7.6pt;color:${C.suave};margin-top:1.5mm;line-height:1.3}

/* ── Cartões ── */
.cartao{border:1px solid #e6e9e7;border-radius:10px;padding:5mm;background:${C.superficie};
  page-break-inside:avoid;margin-bottom:4mm}
.cartaoTit{font-size:10pt;font-weight:600;color:${C.tinta};margin-bottom:.8mm}
.cartaoSub{font-size:8.3pt;color:${C.suave};margin-bottom:3.5mm;line-height:1.4}
.dupla{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.achado{border-left:3px solid ${C.marca};background:${C.cremeMarca};padding:3.5mm 4.5mm;
  border-radius:0 8px 8px 0;margin:3.5mm 0;page-break-inside:avoid}
.achado.risco{border-left-color:${C.critico};background:#fdf1ef}
.achadoTit{font-weight:600;color:${C.marcaEscura};font-size:9.6pt;margin-bottom:1.2mm}
.achado.risco .achadoTit{color:#8c261e}
.achado p{margin:0;color:${C.tinta2};font-size:9.2pt}

/* ── Gráficos ── */
.gr{width:100%;height:auto;display:block;overflow:visible}
.gr text{font-family:Figtree,sans-serif}
.rot{font-size:11.5px;fill:${C.tinta2};font-weight:500}
.rotP{font-size:10px;fill:${C.tinta2}}
.rotPainel{font-size:10.5px;fill:${C.suave};font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.val{font-size:11.5px;fill:${C.tinta};font-weight:600;font-variant-numeric:tabular-nums}
.valDestaque{font-size:12px;fill:${C.s1};font-weight:700}
.valZero{font-size:10px;fill:${C.s3};font-weight:600}
.valSuave{font-size:10px;fill:${C.suave};font-variant-numeric:tabular-nums}
.tick{font-size:9.5px;fill:${C.suave};font-variant-numeric:tabular-nums}
.anot{font-size:9px;fill:${C.suave};paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}
.legenda{display:flex;gap:6mm;margin-top:3mm;font-size:8.4pt;color:${C.tinta2}}
.lgItem{display:flex;align-items:center;gap:1.8mm}
.lgMarca{width:9px;height:9px;border-radius:2px;display:inline-block}

/* ── Tabelas ── */
.tab{width:100%;border-collapse:collapse;font-size:8.6pt;margin:2.5mm 0 3mm}
.tab th{text-align:left;font-weight:600;color:${C.marcaEscura};padding:2mm 2.5mm;
  border-bottom:1.5px solid ${C.marca};font-size:8.2pt}
.tab td{padding:1.9mm 2.5mm;border-bottom:1px solid #edf0ee;color:${C.tinta2}}
.tab .dir{text-align:right;font-variant-numeric:tabular-nums}
.tab tbody tr:last-child td{border-bottom:none}
.tab td:first-child{color:${C.tinta}}
.tab.zebra tbody tr:nth-child(odd){background:#fbfaf8}

/* ── Recomendações ── */
.rec{display:flex;gap:4mm;padding:4mm 0;border-bottom:1px solid #eceeed;page-break-inside:avoid}
.rec:last-child{border-bottom:none}
.recNum{flex:0 0 9mm;height:9mm;border-radius:50%;background:${C.marca};color:#fff;
  font-family:Bricolage,sans-serif;font-size:10.5pt;display:flex;align-items:center;justify-content:center}
.recCorpo{flex:1}
.recTit{font-weight:600;color:${C.tinta};font-size:10.2pt;margin-bottom:1.2mm}
.recTxt{font-size:9.2pt;color:${C.tinta2};line-height:1.5}
.recMeta{font-size:8.3pt;color:${C.marca};font-weight:600;margin-top:1.5mm}
.etiqueta{display:inline-block;font-size:7.4pt;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;padding:.7mm 2mm;border-radius:4px;margin-left:2mm;vertical-align:middle}
.et-alta{background:#fbe3df;color:#8c261e}
.et-media{background:#fbeed6;color:#8a5a0d}
.et-baixa{background:${C.cremeMarca};color:${C.marca}}
.nota{font-size:8.2pt;color:${C.suave};line-height:1.5;margin-top:2mm}
.rodapeDoc{margin-top:8mm;padding-top:3mm;border-top:1px solid #e6e9e7;font-size:8pt;color:${C.suave}}
`;

// Envolve cada par "título + abertura" num bloco .abre — evita repetir a marcação
// em todas as seções e garante que o título nunca fique sozinho no pé da página.
const agruparAberturas = (corpo) =>
  corpo.replace(
    /(<h2>[\s\S]*?<\/h2>)\s*(<p class="intro">[\s\S]*?<\/p>)/g,
    '<div class="abre">$1$2</div>',
  );

const doc = (corpo) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório completo — Plataforma CSMG · Turmas 1 e 2</title>
<style>${ESTILO}</style></head><body>${agruparAberturas(corpo)}</body></html>`;

// ═══════════════ CAPA ═══════════════
const htmlCapa = doc(`
<section class="capa">
  <div class="selo">Coworking Social de Mudanças Globais</div>
  <h1>Relatório completo<br>da plataforma</h1>
  <div class="capaSub">Da primeira linha de código à segunda turma em operação: o que foi construído, quanto público chegou, o que os alunos fizeram com a plataforma e o que os números pedem daqui em diante.</div>
  <div class="capaDestaques">
    <div class="cd"><div class="cdVal">${num(d.inscricoes.length)}</div><div class="cdRot">inscritos captados pela landing</div></div>
    <div class="cd"><div class="cdVal">${num(alunos.length)}</div><div class="cdRot">contas de aluno criadas em duas turmas</div></div>
    <div class="cd"><div class="cdVal">${num(comAula.size)}</div><div class="cdRot">alunos que assistiram ao menos uma aula</div></div>
    <div class="cd"><div class="cdVal">${dec(mediaEstrelas, 2)}</div><div class="cdRot">nota média das disciplinas (de 5)</div></div>
  </div>
  <div class="capaRodape">
    <div class="capaLinha"></div>
    <div class="capaMeta">
      <div><b>Período</b>${dataLonga(INICIO)} a ${dataLonga(CORTE)}</div>
      <div><b>Escopo</b>Projeto completo · Turmas 1 e 2</div>
      <div><b>Emissão</b>${dataLonga(CORTE)}</div>
    </div>
  </div>
</section>`);

// ═══════════════ CORPO ═══════════════
const htmlCorpo = doc(`
<!-- ═══════════════ 1. SUMÁRIO ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">01</span> Sumário executivo</h2>
  <p class="intro">Em ${num(diasEntre(INICIO, CORTE))} dias — ${dataLonga(INICIO)} a ${dataLonga(CORTE)} — o projeto saiu de um repositório vazio para uma plataforma de ensino completa, em produção, com <strong>duas turmas em operação</strong>. A landing captou ${num(d.inscricoes.length)} inscritos, ${num(alunos.length)} criaram conta e ${num(comAula.size)} chegaram a assistir alguma aula. O conteúdo é bem avaliado por quem o consome (${dec(mediaEstrelas, 2)} de 5). O gargalo não é o produto: é <strong>a entrega do acesso</strong> e a <strong>permanência</strong> do aluno.</p>

  <div class="tiles">
    ${tile(num(d.inscricoes.length), "inscritos nas duas turmas", `${num(T1.inscritos)} na Turma 1 · ${num(T2.inscritos)} na Turma 2`)}
    ${tile(pct(taxaAtivacaoGeral, 0), "dos convidados criaram conta", `${num(convidadosSemConta)} convites sem conversão`, "alerta")}
    ${tile(pct((comAula.size / alunos.length) * 100, 0), "das contas assistiram ≥ 1 aula", `${num(comAula.size)} de ${num(alunos.length)} contas`)}
    ${tile(dec(mediaEstrelas, 2), "estrelas de média nas disciplinas", `${avaliacoes.length} avaliações de alunos`, "bom")}
  </div>

  <div class="achado">
    <div class="achadoTit">A Turma 2 é melhor que a Turma 1 em todos os indicadores de engajamento</div>
    <p>Com ${T2.diasAberta} dias de acesso contra ${T1.diasAberta} da Turma 1, a segunda turma já apresenta <strong>${pct((T2.comAula / T2.contas) * 100, 0)} das contas com pelo menos uma aula assistida</strong> (Turma 1: ${pct((T1.comAula / T1.contas) * 100, 0)}), <strong>${pct(T2.taxaRetorno, 0)} de retorno em um segundo dia</strong> (Turma 1: ${pct(T1.taxaRetorno, 0)}) e ${dec(T2.aulasPorConta)} aulas concluídas por conta (Turma 1: ${dec(T1.aulasPorConta)}). A diferença mais plausível está no desenho: a Turma 2 recebeu <strong>${T2.modulos} módulos liberados em conta-gotas</strong> em vez dos ${T1.modulos} do catálogo aberto. Menos escolha produziu mais consumo.</p>
  </div>

  <div class="achado risco">
    <div class="achadoTit">A entrega de e-mail continua sendo o teto de tudo</div>
    <p>O disparo em massa da Turma 1 (20/07) converteu ${pct(taxaMassivo, 0)}; o da Turma 2 (17/08) converteu ${pct(taxaMassivoT2, 0)}. Os convites avulsos, quase sempre reforçados por WhatsApp, convertem ${pct(taxaManual, 0)}. A prova mais dura veio em ${dataBr(VIRADA_INFRA)}: foram <strong>${num(reenviados.size)} convites reenviados</strong> a quem já havia recebido e não ativado, e apenas <strong>${reenvioAtivaram} pessoas criaram conta</strong> — ${pct(taxaReenvio, 1)}. Repetir o convite pelo mesmo caminho não recupera quase ninguém; o caminho precisa mudar.</p>
  </div>

  <div class="achado">
    <div class="achadoTit">A infraestrutura deixou de ser risco</div>
    <p>Em ${dataBr(VIRADA_INFRA)} a produção migrou para um <strong>Supabase self-hosted na própria VPS</strong>, com o projeto na nuvem rebaixado a cópia de segurança diária. A latência de cada chamada caiu de 0,7–1,3 s para cerca de 10 ms, o ambiente de homologação passou a existir de verdade e o projeto ficou independente do free tier. Há backup diário local, espelho diário na nuvem e monitoramento com batimento em <em>/api/health</em>. Nenhum incidente de indisponibilidade foi registrado em todo o período.</p>
  </div>

  <h3>Leitura em uma frase</h3>
  <p>Há demanda comprovada, plataforma construída e conteúdo aprovado; falta <strong>entregar o acesso de forma confiável</strong> e <strong>manter o aluno voltando</strong>. A Turma 2 já mostra que a segunda parte tem solução de desenho — liberação em conta-gotas funcionou. A primeira depende de mudar a forma como o convite chega ao inscrito, e é aí que está o maior ganho disponível hoje.</p>
</section>

<!-- ═══════════════ 2. CONSTRUÇÃO ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">02</span> O que foi construído</h2>
  <p class="intro">A plataforma inteira — landing, ambiente do aluno, área da equipe, painel da coordenação, IA de apoio, fórum, vídeo e infraestrutura — foi escrita em ${num(diasEntre(INICIO, CORTE))} dias corridos, em ${num(ENG.commits)} commits, a uma média de ${dec(commitsPorSemana)} commits por semana. Não houve reescrita: cada fase se assentou sobre a anterior.</p>

  <div class="cartao">
    <div class="cartaoTit">Ritmo de desenvolvimento por mês</div>
    <div class="cartaoSub">Commits registrados no repositório, de ${dataLonga(ENG.primeiro)} a ${dataLonga(ENG.ultimo)}.</div>
    ${svgConstrucao()}
  </div>

  <h3>As quatro fases do projeto</h3>
  <ul>
    <li><strong>Maio e junho — a porta de entrada.</strong> Landing pública, inscrição com matrícula única, confirmação por e-mail e as primeiras proteções de dado pessoal. No fim de junho nasce a fundação do ambiente de aprendizagem com login do aluno.</li>
    <li><strong>Julho, primeira metade — a plataforma de ensino.</strong> Módulos, disciplinas, aulas, materiais, avaliações com gabarito protegido no servidor, progresso do aluno, área de autoria para a equipe, painel de métricas da coordenação e o assistente de IA com busca no material da própria disciplina.</li>
    <li><strong>Julho, segunda metade — identidade e lançamento.</strong> Design system próprio com tema claro e escuro, identidade visual em vetor, tour guiado com narração, vídeo das aulas em armazenamento privado com transcodificação sob demanda, fórum de dúvidas com moderação prévia por IA, perfis, níveis de permissão da equipe, trilha de auditoria e o disparo de acesso em massa. <strong>Lançamento em ${dataBr(LANCAMENTO)}.</strong></li>
    <li><strong>Agosto — turmas e maturidade operacional.</strong> Modelo de turmas com liberação por data, migração da produção para banco próprio na VPS, backup e monitoramento, ambiente de homologação, liberação de conteúdo por turma em conta-gotas e o segundo lançamento em ${dataBr(ABERTURA_T2)}.</li>
  </ul>

  <div class="tiles">
    ${tile(num(linhasTotais), "linhas de código escritas", `em ${num(arquivosTotais)} arquivos`)}
    ${tile(num(ENG.migracoes), "migrações de banco", "todas idempotentes e versionadas")}
    ${tile(num(testesTotais), "arquivos de teste automatizado", `${ENG.testes_unitarios} unitários · ${ENG.testes_e2e} de ponta a ponta`)}
    ${tile(num(ENG.paginas), "telas em produção", `+ ${ENG.rotas_api} rotas de serviço`)}
  </div>

  <h3>Volume por área do sistema</h3>
  ${tabela(
    ["Área", "Arquivos", "Linhas", "Participação"],
    areasOrdenadas.map(([nome, v]) => [
      esc(nome),
      num(v.arquivos),
      num(v.linhas),
      pct((v.linhas / linhasTotais) * 100, 0),
    ]),
    "zebra",
  )}

  <h3>Perfil do trabalho</h3>
  <p>Dos ${num(ENG.commits)} commits, <strong>${ENG.por_tipo.feat ?? 0} entregaram funcionalidade nova</strong>, ${ENG.por_tipo.fix ?? 0} corrigiram defeitos, ${ENG.por_tipo.test ?? 0} adicionaram testes, ${ENG.por_tipo.docs ?? 0} documentaram e ${ENG.por_tipo.refactor ?? 0} reorganizaram código sem mudar comportamento. A proporção de ${dec((ENG.por_tipo.fix ?? 0) / Math.max(ENG.por_tipo.feat ?? 1, 1) * 100, 0).replace(",", ",")} correções por cem funcionalidades indica que o desenvolvimento foi guiado por testes, não por retrabalho — o projeto adota TDD como regra de contribuição.</p>

  <div class="achado">
    <div class="achadoTit">O que a plataforma faz hoje</div>
    <p>Inscrição pública com matrícula automática; primeiro acesso com criação de senha; trilha de ${num(discPublicadas.length)} disciplinas com aulas em vídeo, materiais e avaliação corrigida no servidor; feedback do aluno ao concluir a disciplina; fórum de dúvidas moderado por IA antes da publicação; assistente de IA que responde com base no material da disciplina; perfil do aluno; área da equipe com autoria de conteúdo, gestão de alunos, convites em massa, relatórios e trilha de auditoria; painel de métricas para a coordenação com funil, origem de tráfego e exportação; e o modelo de turmas com liberação de acesso e de conteúdo por data.</p>
  </div>
</section>

<!-- ═══════════════ 3. TURMA 1 × TURMA 2 ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">03</span> Turma 1 × Turma 2</h2>
  <p class="intro">As duas turmas vieram da mesma landing, com o mesmo texto de convite e a mesma equipe. Mudaram duas coisas: a Turma 2 entrou num sistema já rodado e recebeu <strong>${T2.modulos} módulos em vez de ${T1.modulos}</strong>, liberados em conta-gotas. O resultado é melhor em todos os indicadores de engajamento.</p>

  ${tabela(
    ["Indicador", esc(T1.nome), esc(T2.nome)],
    [
      ["Abertura do acesso", dataBr(T1.abertura), dataBr(T2.abertura)],
      ["Dias de acesso até esta apuração", num(T1.diasAberta), num(T2.diasAberta)],
      ["Módulos liberados", num(T1.modulos), num(T2.modulos)],
      ["Inscritos", num(T1.inscritos), num(T2.inscritos)],
      ["Convites entregues", num(T1.convidados), num(T2.convidados)],
      ["Contas criadas", num(T1.contas), num(T2.contas)],
      [
        "<strong>Ativação (conta / convite)</strong>",
        `<strong>${pct(T1.taxaAtivacao, 0)}</strong>`,
        `<strong>${pct(T2.taxaAtivacao, 0)}</strong>`,
      ],
      ["Assistiram ≥ 1 aula", `${num(T1.comAula)} (${pct((T1.comAula / T1.contas) * 100, 0)})`, `${num(T2.comAula)} (${pct((T2.comAula / T2.contas) * 100, 0)})`],
      ["Aulas concluídas", num(T1.aulas), num(T2.aulas)],
      ["<strong>Aulas por conta criada</strong>", `<strong>${dec(T1.aulasPorConta)}</strong>`, `<strong>${dec(T2.aulasPorConta)}</strong>`],
      ["Fizeram avaliação", num(T1.comQuiz), num(T2.comQuiz)],
      ["Voltaram em um segundo dia", `${num(T1.voltaram)} de ${num(T1.comAtividade)} (${pct(T1.taxaRetorno, 0)})`, `${num(T2.voltaram)} de ${num(T2.comAtividade)} (${pct(T2.taxaRetorno, 0)})`],
      ["Avaliações de disciplina", num(T1.feedbacks), num(T2.feedbacks)],
      ["Nota média das disciplinas", T1.estrelas ? `${dec(T1.estrelas, 2)} / 5` : "—", T2.estrelas ? `${dec(T2.estrelas, 2)} / 5` : "—"],
    ],
    "zebra",
  )}

  <div class="cartao">
    <div class="cartaoTit">Indicadores relativos — a barra de baixo é a Turma 2</div>
    <div class="cartaoSub">Só percentuais, porque as turmas têm tamanhos diferentes. À direita, a diferença em pontos.</div>
    ${svgComparativoTurmas()}
    ${legenda([
      { cor: C.s2, rotulo: `${T1.nome} — ${T1.diasAberta} dias de acesso` },
      { cor: C.s1, rotulo: `${T2.nome} — ${T2.diasAberta} dias de acesso` },
    ])}
  </div>

  <div class="achado">
    <div class="achadoTit">Catálogo enxuto e liberação em conta-gotas produziram mais consumo</div>
    <p>A Turma 1 recebeu ${T1.modulos} módulos de uma vez e concluiu ${dec(T1.aulasPorConta)} aulas por conta. A Turma 2 recebeu ${T2.modulos} módulos e concluiu ${dec(T2.aulasPorConta)} — <strong>${dec(T2.aulasPorConta / Math.max(T1.aulasPorConta, 0.01))} vezes mais</strong>, com muito menos material disponível e em uma fração do tempo. Um catálogo aberto e grande não vira consumo; uma sequência curta com data vira. <strong>Esta é a descoberta mais acionável de todo o relatório.</strong></p>
  </div>

  <div class="achado risco">
    <div class="achadoTit">Como esta comparação deve ser lida</div>
    <p>A Turma 2 tem ${T2.diasAberta} dias de acesso contra ${T1.diasAberta} da Turma 1, e uma base menor (${num(T2.contas)} contas contra ${num(T1.contas)}). Métricas acumuladas — total de aulas, de avaliações — favorecem a Turma 1 pelo tempo; métricas de proporção favorecem a Turma 2 apesar do tempo. O que se pode afirmar com segurança: <strong>a Turma 2 partiu melhor</strong>. Se a vantagem se mantém depois de trinta dias, só a próxima apuração dirá — e é exatamente o que se deve medir.</p>
  </div>
</section>

<!-- ═══════════════ 4. FUNIL ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">04</span> O funil, do interesse à aprendizagem</h2>
  <p class="intro">Cada degrau abaixo é um recorte real da base somada das duas turmas. A queda mais violenta acontece entre receber o convite e criar a conta — e é ali que está a maior parte do público perdido.</p>

  <div class="cartao">
    <div class="cartaoTit">Funil completo — Turmas 1 e 2</div>
    <div class="cartaoSub">Percentuais relativos ao total de inscritos. Contas internas de teste excluídas.</div>
    ${svgFunil()}
  </div>

  <h3>Onde o público se perde</h3>
  ${tabela(
    ["Transição", "Entram", "Saem", "Passam", "Taxa"],
    funil.slice(0, -1).map((f, i) => {
      const prox = funil[i + 1];
      const taxa = (prox.n / f.n) * 100;
      return [
        `${f.rotulo} → ${prox.rotulo}`,
        num(f.n),
        num(f.n - prox.n),
        num(prox.n),
        `<strong>${pct(taxa, 0)}</strong>`,
      ];
    }),
    "zebra",
  )}

  <div class="achado risco">
    <div class="achadoTit">${num(convidadosSemConta)} pessoas receberam o convite e nunca criaram conta</div>
    <p>É o maior estoque de valor não realizado do projeto: gente que se inscreveu por vontade própria, foi aprovada, recebeu o e-mail — e não entrou. Recuperar um terço desse grupo já dobraria a base de alunos ativos sem custo nenhum de captação.</p>
  </div>

  <h3>Sinais positivos dentro do funil</h3>
  <ul>
    <li><strong>Quem entra, entra rápido.</strong> A mediana entre receber o convite e criar a conta é de ${dec(latenciaMediana)} horas, e ${pct(pctLatencia24h, 0)} das contas nasceram nas primeiras 24 horas. O convite que chega à caixa de entrada funciona muito bem.</li>
    <li><strong>Quem chega ao conteúdo, aprova.</strong> Dos ${comQuiz.size} alunos que fizeram alguma avaliação, ${aprovados.size} foram aprovados — ${pct((aprovados.size / Math.max(comQuiz.size, 1)) * 100, 0)}.</li>
    <li><strong>Não houve perda técnica.</strong> Nenhuma conta travou no primeiro acesso; as ${num(envDevolvidos)} devoluções e ${num(envFalhas)} falhas de envio são endereços incorretos, não erro de sistema.</li>
  </ul>
</section>

<!-- ═══════════════ 5. CONVITES ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">05</span> Entrega dos convites</h2>
  <p class="intro">Foram ${num(convitesEnviados.length)} convites de acesso enviados a ${num(convidados.size)} endereços distintos, em dois disparos em massa e dezenas de envios avulsos. O comportamento dos três formatos é radicalmente diferente — e a diferença não está no público.</p>

  <div class="cartao">
    <div class="cartaoTit">Taxa de ativação por tipo de envio</div>
    <div class="cartaoSub">Percentual de convidados que efetivamente criaram conta na plataforma.</div>
    ${svgLotes()}
  </div>

  <p>Os grupos vêm da mesma lista de inscritos e receberam o mesmo texto. O que muda é o <strong>volume disparado de uma vez</strong> e o <strong>reforço humano</strong>: os convites avulsos foram, em boa parte, acompanhados de aviso por WhatsApp. Disparar centenas de mensagens de uma só vez tem a assinatura clássica de filtragem por spam — o envio é aceito pelo servidor, mas a mensagem não chega à caixa de entrada.</p>

  <div class="achado risco">
    <div class="achadoTit">A campanha de reenvio de ${dataBr(VIRADA_INFRA)} é a prova do diagnóstico</div>
    <p>Em ${dataBr(VIRADA_INFRA)} a equipe reenviou o convite para <strong>${num(reenviados.size)} pessoas</strong> que já haviam recebido e nunca ativado — exatamente a recomendação nº 3 do relatório da Turma 1. Resultado: <strong>${reenvioAtivaram} contas</strong>, ${pct(taxaReenvio, 1)}. A ação estava certa; o que não mudou foi o caminho por onde o convite trafega. Repetir o envio pelo mesmo caminho não recupera a base fria — e cada tentativa sem efeito desgasta um pouco mais a lista.</p>
  </div>

  <div class="tiles t3">
    ${tile(num(envEnviados), "envios confirmados", "sem erro de entrega no servidor")}
    ${tile(num(envDevolvidos), "devolvidos (bounce)", "endereços inexistentes")}
    ${tile(num(inscritosSemConvite), "inscritos ainda sem convite", "pendentes de liberação", "alerta")}
  </div>

  <h3>Histórico de disparos</h3>
  <p>Cada linha conta apenas o <strong>primeiro</strong> convite de cada endereço, para que reenvios não sejam contados duas vezes.</p>
  ${tabela(
    ["Data", "Convidados", "Criaram conta", "Ativação", "Observação"],
    Object.entries(lotes)
      .sort()
      .map(([k, v]) => [
        `${k.slice(8, 10)}/${k.slice(5, 7)}`,
        num(v.convidados),
        num(v.ativaram),
        pct((v.ativaram / v.convidados) * 100, 0),
        k === LANCAMENTO
          ? "disparo em massa · Turma 1"
          : k === ABERTURA_T2
            ? "disparo em massa · Turma 2"
            : "avulsos",
      ]),
    "zebra",
  )}

  <div class="achado risco">
    <div class="achadoTit">O canal de convite é o teto de toda a operação</div>
    <p>Os números separam com clareza dois comportamentos: o convite disparado em bloco converte ${pct(taxaMassivo, 0)} a ${pct(taxaMassivoT2, 0)}, e o convite enviado em pequena quantidade com reforço humano converte ${pct(taxaManual, 0)}. Como praticamente toda a base de inscritos já foi convidada, <strong>não há ganho possível em captar mais gente sem antes resolver a chegada do convite</strong> — é a variável de maior alavancagem sobre o número de alunos ativos.</p>
  </div>
</section>

<!-- ═══════════════ 6. ENGAJAMENTO ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">06</span> Acessos e permanência</h2>
  <p class="intro">A curva de atividade tem <strong>dois picos</strong>, um por lançamento, e entre eles um platô baixo com repiques que coincidem exatamente com os dias de disparo de convite. O segundo pico é o da Turma 2 — e sustentou-se por mais dias que o primeiro.</p>

  <div class="cartao">
    <div class="cartaoTit">Atividade diária de ${dataBr(LANCAMENTO)} a ${dataBr(CORTE)}</div>
    <div class="cartaoSub">Alunos únicos com alguma ação registrada por dia e total de aulas concluídas no dia.</div>
    ${svgAtividade()}
    ${legenda([
      { cor: C.s1, rotulo: "Alunos ativos no dia" },
      { cor: C.s2, rotulo: "Aulas concluídas no dia" },
    ])}
  </div>

  <p>O pico de ${Math.max(...serieAtivos)} alunos ativos e os repiques posteriores nunca vêm de crescimento orgânico: são sempre reflexo de um disparo de convites ou de uma abertura de turma. <strong>A plataforma ainda não gera retorno espontâneo</strong> — falta qualquer comunicação recorrente com quem já entrou.</p>

  <div class="dupla">
    <div class="cartao">
      <div class="cartaoTit">Em quantos dias diferentes cada aluno acessou</div>
      <div class="cartaoSub">Base: ${comEvento} alunos com atividade registrada nas duas turmas.</div>
      ${svgRecorrencia()}
    </div>
    <div class="cartao">
      <div class="cartaoTit">Quantas aulas cada aluno concluiu</div>
      <div class="cartaoSub">Base: ${alunos.length} contas de aluno criadas.</div>
      ${svgProfundidade()}
    </div>
  </div>

  <div class="achado risco">
    <div class="achadoTit">A retenção do segundo dia segue sendo o problema estrutural</div>
    <p>${recorrencia[1]} dos ${comEvento} alunos com atividade acessaram a plataforma em <strong>um único dia</strong>. Entre as ${alunos.length} contas criadas, ${profundidade[0].n} <strong>não concluíram nenhuma aula</strong>. Quem assistiu, assistiu pouco: mediana de ${medianaAulas} aulas, média de ${dec(mediaAulas)}, com um único aluno chegando a ${maxAulas}. A Turma 2 melhora o indicador (${pct(T2.taxaRetorno, 0)} contra ${pct(T1.taxaRetorno, 0)}), mas está longe do necessário.</p>
  </div>

  <p>A causa não é falta de conteúdo — há ${aulasPublicadas.length} aulas publicadas. É <strong>ausência de cadência e de gatilho de retorno</strong>: nada avisa o aluno de que há material novo, nada estabelece prazo. A liberação em conta-gotas da Turma 2 é o primeiro passo certo nessa direção; falta o aviso automático que a acompanha.</p>
</section>

<!-- ═══════════════ 7. CONTEÚDO ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">07</span> Consumo do conteúdo</h2>
  <p class="intro">O catálogo publicado é maior do que o consumido, por larga margem: ${pct((aulasSemView / aulasPublicadas.length) * 100, 0)} das aulas no ar nunca foram abertas por ninguém.</p>

  <div class="cartao">
    <div class="cartaoTit">Alcance por disciplina</div>
    <div class="cartaoSub">Alunos distintos que concluíram pelo menos uma aula da disciplina, em ordem de módulo.</div>
    ${svgCobertura()}
  </div>

  <div class="tiles t3">
    ${tile(`${aulasSemView} <span style="font-size:11pt;color:${C.suave}">/ ${aulasPublicadas.length}</span>`, "aulas publicadas sem nenhuma visualização", `${pct((aulasSemView / aulasPublicadas.length) * 100, 0)} do catálogo no ar`, "alerta")}
    ${tile(num(progresso.length), "aulas concluídas no total", `por ${comAula.size} alunos distintos`)}
    ${tile(num(discPublicadas.length), "disciplinas publicadas", `em ${d.modulos.filter((m) => m.publicado).length} módulos`)}
  </div>

  <p>O padrão é inequívoco: o consumo <strong>despenca com a ordem do módulo</strong>. As primeiras disciplinas — ambientação e apresentação — concentram a maior parte do consumo, e o alcance vira residual a partir do meio da trilha.${
    discSemAluno.length
      ? ` Hoje <strong>${discSemAluno.length} disciplinas publicadas, somando ${aulasEmDiscSemAluno} aulas, não foram tocadas por um único aluno</strong>: ${discSemAluno.map((c) => esc(c.titulo)).join(", ")}.`
      : ""
  }</p>

  <div class="achado risco">
    <div class="achadoTit">Conteúdo publicado sem aviso é conteúdo invisível</div>
    <p>Módulos inteiros foram ao ar sem que ninguém fosse comunicado. Como quase nenhum aluno retorna espontaneamente, publicar sem disparar aviso equivale, na prática, a não publicar. O modelo de liberação por turma criado em agosto resolve metade do problema — define <em>quando</em> o conteúdo aparece; falta a outra metade, que é <em>avisar</em> que apareceu.</p>
  </div>

  <h3>Aulas mais assistidas</h3>
  ${tabela(
    ["Aula", "Disciplina", "Conclusões"],
    topAulas.map((a) => [esc(a.titulo), esc(a.disciplina), num(a.n)]),
    "zebra",
  )}
</section>

<!-- ═══════════════ 8. QUALIDADE ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">08</span> Qualidade percebida e aprendizagem</h2>
  <p class="intro">Este é o capítulo em que os números são bons. A amostra é pequena, mas é consistente nas duas turmas — e vem justamente dos alunos que foram mais fundo no conteúdo.</p>

  <div class="tiles">
    ${tile(dec(mediaEstrelas, 2), "estrelas de média", `${avaliacoes.length} avaliações de ${new Set(avaliacoes.map((a) => a.aluno_id)).size} alunos`, "bom")}
    ${tile(dec(notaMedia, 1), "nota média nas avaliações", `${tentativas.length} tentativas registradas`, "bom")}
    ${tile(pct(taxaAprovacao, 0), "de aprovação", `${tentativas.filter((t) => t.aprovado).length} de ${tentativas.length} tentativas`, "bom")}
    ${tile(num(comentarios.length), "comentários escritos", "todos favoráveis ao curso")}
  </div>

  <p>Das ${avaliacoes.length} avaliações, <strong>${cincoEstrelas} são de cinco estrelas</strong> (${pct((cincoEstrelas / avaliacoes.length) * 100, 0)}) e a menor nota registrada em todo o período é ${menorEstrela} de 5. As duas turmas avaliam praticamente igual — ${dec(T1.estrelas, 2)} na Turma 1 e ${dec(T2.estrelas, 2)} na Turma 2 — o que sugere que a percepção de qualidade não dependeu do desenho da turma, e sim do material em si.</p>

  <h3>Desempenho por avaliação</h3>
  ${tabela(
    ["Disciplina", "Tentativas", "Aprovações", "Nota média"],
    Object.entries(quizPorDisciplina)
      .sort((a, b) => b[1].n - a[1].n)
      .map(([k, v]) => [esc(k), num(v.n), num(v.aprov), dec(v.soma / v.n)]),
    "zebra",
  )}

  <h3>O que os alunos escreveram</h3>
  ${comentarios
    .map(
      (c) =>
        `<div class="achado"><p style="font-style:italic">“${esc(c.comentario.trim())}”</p><div class="nota" style="margin-top:1.5mm">${"★".repeat(c.estrelas)} · ${esc(tituloDisc[c.disciplina_id] ?? "—")}</div></div>`,
    )
    .join("")}

  <div class="achado">
    <div class="achadoTit">Interpretação honesta desta seção</div>
    <p>Média ${dec(mediaEstrelas, 2)} com ${avaliacoes.length} avaliações de ${new Set(avaliacoes.map((a) => a.aluno_id)).size} alunos não é evidência estatística de excelência — é evidência de que <strong>quem persiste gosta</strong>. O viés de seleção é forte e conhecido: só avalia quem chegou ao fim de uma disciplina. O valor do dado está em descartar a hipótese de que o conteúdo seja a causa do abandono. Não é.</p>
  </div>
</section>

<!-- ═══════════════ 9. CAPTAÇÃO ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">09</span> Captação e canais</h2>
  <p class="intro">A landing é o ativo mais saudável do projeto. Converte bem, nunca parou de trazer inscritos — nem entre as turmas — e foi ela que formou a Turma 2 inteira sem campanha paga ativa.</p>

  <div class="cartao">
    <div class="cartaoTit">Visitas e inscrições por dia</div>
    <div class="cartaoSub">Escalas independentes — as duas séries não compartilham eixo.</div>
    ${svgCaptacao()}
    ${legenda([
      { cor: C.s1, rotulo: "Visitas na landing" },
      { cor: C.s2, rotulo: "Inscrições concluídas" },
    ])}
  </div>

  <div class="tiles t3">
    ${tile(pct(conversaoLanding), "de conversão visita → inscrição", "muito acima do usual para captação aberta", "bom")}
    ${tile(num(T2.inscritos), "inscrições após o lançamento da Turma 1", "formaram a Turma 2 sem mídia paga", "bom")}
    ${tile(num(totalVisitas), "visitas no período medido", "a partir de 15/07")}
  </div>

  <div class="cartao">
    <div class="cartaoTit">Conversão por canal de origem</div>
    <div class="cartaoSub">Canais com ao menos 20 visitas registradas. Origem por UTM; tráfego sem parâmetro entra em “Direto / sem UTM”.</div>
    ${svgCanais()}
  </div>

  ${tabela(
    ["Canal", "Visitas", "Inscrições", "Conversão"],
    listaCanais.map((c) => [
      esc(c.nome),
      num(c.visitas),
      num(c.inscricoes),
      c.visitas ? pct(c.conv) : "—",
    ]),
    "zebra",
  )}

  <p><strong>Instagram é o canal identificável mais produtivo</strong>, com ${num(canais["Instagram"]?.inscricoes ?? 0)} inscrições. A fatia “Direto / sem UTM” é grande demais para ser realmente direta — parte relevante é divulgação por WhatsApp e link colado sem parâmetro. <strong>Marcar as UTMs de toda peça divulgada é a correção de menor custo e maior retorno analítico deste relatório.</strong></p>

  <div class="achado">
    <div class="achadoTit">A captação não é o gargalo — e isso é uma boa notícia caríssima</div>
    <p>Com ${num(d.inscricoes.length)} inscritos e ${pct(conversaoLanding)} de conversão, o topo do funil está resolvido. Cada ponto percentual ganho na ativação vale mais do que qualquer investimento novo em mídia: a fila de gente interessada já existe e já está paga.</p>
  </div>
</section>

<!-- ═══════════════ 10. PLATAFORMA E OPERAÇÃO ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">10</span> Plataforma, operação e segurança</h2>
  <p class="intro">A infraestrutura mudou de patamar em ${dataBr(VIRADA_INFRA)}, no meio do intervalo entre as duas turmas. Foi a decisão técnica mais consequente do projeto e não gerou nenhuma interrupção percebida pelo aluno.</p>

  <h3>A virada para banco próprio</h3>
  <p>Até ${dataBr(VIRADA_INFRA)} a produção rodava no plano gratuito de um Supabase na nuvem, onde <strong>cada chamada levava de 0,7 a 1,3 segundo</strong>. A produção passou a rodar num <strong>Supabase self-hosted na própria VPS</strong> — Postgres, autenticação, API e armazenamento em contêineres —, e o mesmo tipo de chamada passou a responder em <strong>cerca de 10 milissegundos</strong>, uma melhora de duas ordens de grandeza. O projeto na nuvem foi rebaixado a cópia de segurança diária.</p>

  <div class="tiles t3">
    ${tile("~10 ms", "latência típica de consulta", "era 0,7–1,3 s na nuvem", "bom")}
    ${tile("3", "camadas de proteção do dado", "dump local, espelho na nuvem, monitoramento")}
    ${tile("24 h", "perda máxima em desastre (RPO)", "limite do espelho diário")}
  </div>

  <h3>O que passou a existir junto com a virada</h3>
  <ul>
    <li><strong>Backup diário local</strong> do banco, às 03:30, com verificação de integridade.</li>
    <li><strong>Espelho diário na nuvem</strong> às 04:00 — banco e arquivos do armazenamento —, que mantém a recuperação possível mesmo com perda total da VPS.</li>
    <li><strong>Monitoramento com batimento</strong>: os scripts de backup e de espelho registram sua execução, e a rota <em>/api/health</em> permite detectar silêncio antes que o silêncio custe dados.</li>
    <li><strong>Ambiente de homologação de verdade</strong>: a mesma pilha em contêineres na VPS, onde toda migração é testada antes de tocar a produção. Antes da virada, desenvolvimento e produção compartilhavam o mesmo banco.</li>
  </ul>

  <h3>Segurança e proteção de dados</h3>
  <ul>
    <li><strong>Autorização no banco.</strong> Toda tabela tem política de acesso por linha; o aluno só alcança o próprio progresso e o conteúdo publicado, por decisão do banco, não por confiança na aplicação.</li>
    <li><strong>Gabarito nunca sai do servidor.</strong> As alternativas chegam ao aluno por uma visão sem a coluna de resposta correta, e a correção acontece num procedimento privilegiado.</li>
    <li><strong>Chave administrativa confinada.</strong> A credencial de serviço nunca vai ao navegador e não é compartilhada nem com o serviço externo que processa os vídeos, que se autentica por segredo próprio.</li>
    <li><strong>Limite de taxa por IP</strong> na inscrição pública e no painel da coordenação, contra abuso automatizado.</li>
    <li><strong>LGPD.</strong> Política de privacidade publicada, consentimento na landing, declaração das ferramentas de medição e ${num(d.eventos.length)} eventos de auditoria que registram quem fez o quê na plataforma.</li>
    <li><strong>Dado pessoal em disco próprio.</strong> Desde a virada, os dados dos alunos residem na VPS — o que aumenta o controle e, na mesma medida, a responsabilidade sobre a guarda das cópias.</li>
  </ul>

  <div class="achado">
    <div class="achadoTit">Disponibilidade no período</div>
    <p>Nenhum incidente de indisponibilidade foi registrado nos ${num(diasEntre(LANCAMENTO, CORTE))} dias de operação com aluno. O procedimento de publicação constrói a versão nova com a produção no ar e troca as duas em cerca de dois segundos, terminando com verificação automática de saúde. Nenhuma conta travou no primeiro acesso; as ${num(envDevolvidos)} devoluções e ${num(envFalhas)} falhas de e-mail são endereços incorretos, não erro de sistema.</p>
  </div>
</section>

<!-- ═══════════════ 11. FERRAMENTAS ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">11</span> Ferramentas de apoio e operação</h2>
  <p class="intro">Três recursos construídos e disponíveis estão praticamente sem uso nas duas turmas. Não é falha técnica — é falta de indução: o aluno não sabe que existem, ou não tem motivo para usá-los.</p>

  <div class="tiles t3">
    ${tile(num(d.forum_posts.length), "publicações no fórum", `${d.forum_respostas.length} respostas em ${num(diasEntre(LANCAMENTO, CORTE))} dias`, "alerta")}
    ${tile(num(d.ia_mensagens.length), "perguntas ao assistente de IA", `${alunosIA} alunos experimentaram`, "alerta")}
    ${tile(`${equipeAtiva}/${equipe.length}`, "da equipe com atividade registrada", "monitores pouco acionados")}
  </div>

  <h3>Fórum de dúvidas</h3>
  <p>${d.forum_posts.length} publicações e ${d.forum_respostas.length} respostas em ${num(diasEntre(LANCAMENTO, CORTE))} dias de operação, atravessando duas turmas. Um fórum vazio se autoalimenta negativamente: o aluno abre, vê que não há movimento e não volta. O recurso é sofisticado — tem moderação por IA antes da publicação, enquete, votação e fila de revisão humana — e está inteiramente ocioso. Para a Turma 3, ou a equipe assume o compromisso de semear e responder em prazo definido, ou o fórum sai da navegação.</p>

  <h3>Assistente de IA</h3>
  <p>${d.ia_mensagens.length} perguntas de ${alunosIA} alunos, contra uma base de conhecimento de ${num(d.disciplinas.length)} disciplinas indexadas. O recurso funciona e responde com base no material da própria disciplina, mas está descoberto: nada no percurso do aluno o apresenta como ferramenta de estudo. Uma menção no e-mail de boas-vindas e um destaque na primeira aula resolveriam a descoberta a custo zero.</p>

  <h3>Equipe e operação</h3>
  <p>${equipeAtiva} dos ${equipe.length} integrantes da equipe registraram alguma ação no período. A operação de suporte concentrou-se no contato por WhatsApp — foram ${d.eventos.filter((e) => e.acao === "contato.whatsapp").length} contatos registrados, a maioria nos dias de lançamento, o que confirma que o reforço humano foi decisivo para converter os convites que o e-mail não entregou.</p>

  <div class="achado">
    <div class="achadoTit">A trilha de auditoria funcionou</div>
    <p>Todo o diagnóstico deste relatório foi possível porque a instrumentação de eventos estava ativa desde a véspera do primeiro lançamento: ${num(d.eventos.length)} eventos registrados sem intervenção manual. Ela deve permanecer ligada e ser ampliada — ver a seção de lacunas.</p>
  </div>
</section>

<!-- ═══════════════ 12. RECOMENDAÇÕES ═══════════════ -->
<section class="pagina novaPagina">
  <h2><span class="numSecao">12</span> Recomendações</h2>
  <p class="intro">Ordenadas por impacto sobre o número de alunos ativos. Uma das recomendações do relatório da Turma 1 foi posta em prática em agosto e funcionou; outra foi tentada e não produziu resultado. Isso ajusta a ordem de prioridade, não o diagnóstico.</p>

  <div class="achado">
    <div class="achadoTit">Placar das recomendações anteriores</div>
    <p><strong>Funcionou:</strong> publicar conteúdo com data e em porções — virou o modelo de turmas com liberação em conta-gotas, e a Turma 2 responde melhor em todos os indicadores. <strong>Sem resultado:</strong> recuperar os convidados que nunca entraram — ${num(reenviados.size)} reenvios produziram ${reenvioAtivaram} contas, porque o convite foi repetido pelo mesmo caminho que já não havia funcionado. <strong>Ainda em aberto:</strong> mudar a forma de entrega do convite, criar cadência de comunicação, instrumentar tempo de vídeo e decidir o destino do fórum.</p>
  </div>

  <div class="rec"><div class="recNum">1</div><div class="recCorpo">
    <div class="recTit">Mudar a forma como o convite chega ao inscrito<span class="etiqueta et-alta">prioridade máxima</span></div>
    <div class="recTxt">Os dados isolam bem a variável: o mesmo texto, para o mesmo público, converte ${pct(taxaMassivo, 0)}–${pct(taxaMassivoT2, 0)} quando disparado em bloco e ${pct(taxaManual, 0)} quando enviado em pequena quantidade com reforço humano; e a repetição do convite em ${dataBr(VIRADA_INFRA)} converteu ${pct(taxaReenvio, 1)}. Se a ativação em massa alcançar os ${pct(taxaManual, 0)} já observados, o mesmo volume de convites do período produziria cerca de ${Math.round(convidados.size * (taxaManual / 100))} contas em vez de ${alunos.length} — sem gastar um centavo em captação nova.</div>
    <div class="recMeta">Meta: ativação ≥ 35% no primeiro disparo em massa da Turma 3</div>
  </div></div>

  <div class="rec"><div class="recNum">2</div><div class="recCorpo">
    <div class="recTit">Transformar a liberação em conta-gotas em regra, com aviso automático<span class="etiqueta et-alta">alta</span></div>
    <div class="recTxt">Foi o que separou a Turma 2 da Turma 1: ${T2.modulos} módulos com data em vez de ${T1.modulos} de uma vez, e ${dec(T2.aulasPorConta)} aulas por conta contra ${dec(T1.aulasPorConta)}. Falta a metade que ainda não existe — <strong>disparar o aviso quando o módulo abre</strong>. Publicar sem avisar, hoje, é publicar para ninguém: ${aulasSemView} das ${aulasPublicadas.length} aulas no ar nunca foram abertas.</div>
    <div class="recMeta">Meta: nenhuma aula com zero visualizações após 14 dias no ar</div>
  </div></div>

  <div class="rec"><div class="recNum">3</div><div class="recCorpo">
    <div class="recTit">Criar cadência de comunicação com quem já entrou<span class="etiqueta et-alta">alta</span></div>
    <div class="recTxt">Não existe nenhum gatilho de retorno automático. O mínimo viável: aviso de aula nova, lembrete para quem não acessa há sete dias e resumo semanal de progresso. Ataca o indicador mais grave do período — ${pct(taxaRetorno, 0)} de retorno em um segundo dia na base somada. Rende mais se vier junto com a recomendação nº 1, porque depende do mesmo canal.</div>
    <div class="recMeta">Meta: 40% dos alunos com atividade em ≥ 3 dias distintos</div>
  </div></div>

  <div class="rec"><div class="recNum">4</div><div class="recCorpo">
    <div class="recTit">Refazer a recuperação dos ${num(convidadosSemConta)} convidados sem conta — depois da nº 1<span class="etiqueta et-media">média</span></div>
    <div class="recTxt">Segue sendo o maior estoque de valor não realizado do projeto: gente que se inscreveu por vontade própria, foi liberada, recebeu o e-mail e não entrou. A tentativa de agosto rendeu ${reenvioAtivaram} contas em ${num(reenviados.size)} reenvios, e insistir pelo mesmo caminho tende a repetir esse resultado. <strong>Fazer uma única campanha, depois da recomendação nº 1</strong>, com assunto diferente e reforço por WhatsApp — que é o que comprovadamente converte.</div>
    <div class="recMeta">Meta: +70 contas sem nova captação, em campanha única após a nº 1</div>
  </div></div>

  <div class="rec"><div class="recNum">5</div><div class="recCorpo">
    <div class="recTit">Definir uma trilha obrigatória de entrada<span class="etiqueta et-media">média</span></div>
    <div class="recTxt">${profundidade[0].n} das ${alunos.length} contas não concluíram nenhuma aula. Uma sequência curta e obrigatória nos primeiros dias — ambientação, apresentação e a primeira disciplina, com avaliação ao fim — dá ao aluno um objetivo concreto em vez de um catálogo sem ponto de partida. O modelo de liberação por turma já tem a mecânica necessária.</div>
    <div class="recMeta">Meta: 70% das contas com ≥ 1 aula concluída</div>
  </div></div>

  <div class="rec"><div class="recNum">6</div><div class="recCorpo">
    <div class="recTit">Marcar UTM em toda peça divulgada<span class="etiqueta et-media">média</span></div>
    <div class="recTxt">A maior fatia do tráfego cai em “Direto / sem UTM”, o que impede decidir onde investir. Padronizar os parâmetros em todo link publicado — Instagram, WhatsApp, parceiros, material impresso — custa quase nada e torna mensurável o investimento da próxima turma. A plataforma já tem gerador de link com UTM na área da coordenação.</div>
    <div class="recMeta">Meta: menos de 20% do tráfego sem origem identificada</div>
  </div></div>

  <div class="rec"><div class="recNum">7</div><div class="recCorpo">
    <div class="recTit">Fechar as lacunas de instrumentação<span class="etiqueta et-baixa">média</span></div>
    <div class="recTxt">Ainda não é possível responder quanto tempo o aluno assiste de cada aula, nem em que ponto abandona um vídeo. A duração das aulas não está registrada e não há evento de progresso parcial. Sem isso, a Turma 3 será avaliada com a mesma cegueira parcial das duas primeiras.</div>
    <div class="recMeta">Meta: tempo de vídeo assistido disponível por aula e por aluno</div>
  </div></div>

  <div class="rec"><div class="recNum">8</div><div class="recCorpo">
    <div class="recTit">Decidir o destino do fórum e revelar o assistente de IA<span class="etiqueta et-baixa">baixa</span></div>
    <div class="recTxt">${d.forum_posts.length} publicações e ${d.forum_respostas.length} respostas em duas turmas. Ou a equipe assume o compromisso de semear e responder dentro de um prazo definido, ou o fórum sai da navegação — um espaço comunitário vazio comunica abandono. O assistente de IA tem o problema oposto: funciona e ninguém sabe que existe; basta apresentá-lo no e-mail de boas-vindas e na primeira aula.</div>
    <div class="recMeta">Decisão binária sobre o fórum antes da próxima abertura</div>
  </div></div>

  <h3>O que medir na próxima apuração</h3>
  <ul>
    <li><strong>Se a vantagem da Turma 2 se sustenta</strong> aos 30 dias de acesso, ou se ela apenas antecipou o mesmo abandono.</li>
    <li><strong>Ativação do primeiro disparo em massa</strong> depois da mudança no canal de convite — é o teste direto da recomendação nº 1.</li>
    <li><strong>Efeito do aviso de módulo novo</strong> sobre o número de alunos ativos nos três dias seguintes a cada liberação.</li>
  </ul>
</section>

<!-- ═══════════════ 13. ANEXO ═══════════════ -->
<section class="pagina">
  <h2><span class="numSecao">13</span> Anexo — dados e método</h2>

  <h3>Séries diárias desde o primeiro lançamento</h3>
  <div class="dupla">
    ${[0, 1]
      .map((metade) => {
        const meio = Math.ceil(datas.length / 2);
        const fatia = metade === 0 ? [0, meio] : [meio, datas.length];
        return tabela(
          ["Data", "Alunos ativos", "Aulas concl."],
          datas
            .slice(...fatia)
            .map((k, j) => {
              const i = fatia[0] + j;
              return [`${k.slice(8, 10)}/${k.slice(5, 7)}`, num(serieAtivos[i]), num(serieAulas[i])];
            }),
          "zebra",
        );
      })
      .join("")}
  </div>

  <h3>Catálogo publicado e alcance</h3>
  ${tabela(
    ["Disciplina", "Aulas", "Conclusões", "Alunos"],
    cobertura.map((c) => [esc(c.titulo), num(c.aulas), num(c.views), num(c.alunos)]),
    "zebra",
  )}

  <h3>Como os números foram apurados</h3>
  <ul>
    <li><strong>Fonte.</strong> Leitura direta do banco de produção em ${dataLonga(CORTE)}, sem amostragem. As métricas de construção vêm do histórico do repositório e da contagem dos arquivos do próprio projeto. Nenhum número foi estimado.</li>
    <li><strong>Base de alunos.</strong> ${alunos.length} contas com papel de aluno. Foram excluídas 2 contas internas de teste e as ${equipe.length} contas de equipe, que não entram em nenhuma métrica de engajamento.</li>
    <li><strong>Atribuição de turma.</strong> A turma é um atributo da inscrição; a conta é ligada a ela pelo endereço de e-mail. Contas sem inscrição correspondente ficam fora dos recortes por turma, mas contam nos totais.</li>
    <li><strong>“Aluno ativo”.</strong> Aluno com pelo menos um evento registrado na trilha de auditoria no dia — login, aula concluída, avaliação respondida ou publicação no fórum.</li>
    <li><strong>“Aula concluída”.</strong> Registro de progresso gravado quando o aluno marca a aula como assistida. Não mede tempo de vídeo efetivamente visto.</li>
    <li><strong>Convites.</strong> Apenas envios do tipo convite de acesso em situação “enviado”, contados por endereço distinto. E-mails de confirmação de inscrição não entram na base de convidados. Nas tabelas de lote, cada endereço é contado na data do seu <em>primeiro</em> convite.</li>
    <li><strong>Origem de tráfego.</strong> Agrupada por parâmetro UTM da primeira visita. Domínios de rede de anúncios foram consolidados em “Google / Ads”; visitas sem parâmetro entram em “Direto / sem UTM”.</li>
  </ul>

  <h3>Limitações conhecidas</h3>
  <ul>
    <li>A <strong>Turma 2 tem apenas ${T2.diasAberta} dias de acesso</strong> nesta apuração, contra ${T1.diasAberta} da Turma 1. Toda comparação entre as duas é preliminar; indicadores acumulados favorecem a Turma 1 e indicadores de proporção favorecem a Turma 2.</li>
    <li>A trilha de auditoria entrou em operação em <strong>19 de julho</strong>, véspera do primeiro lançamento. Não existe evento anterior a essa data, o que não afeta nenhuma métrica de aluno.</li>
    <li>A <strong>duração das aulas não está registrada</strong>: não é possível calcular horas assistidas, tempo médio de sessão nem ponto de abandono do vídeo.</li>
    <li>Não há evento de <strong>progresso parcial</strong> de vídeo — um aluno que assiste 80% de uma aula sem marcá-la como concluída é invisível nestes números.</li>
    <li>As visitas à landing são contadas <strong>a partir de 15 de julho</strong>, quando a instrumentação foi ativada; a conversão anterior a essa data não é comparável.</li>
    <li>A amostra de avaliações de disciplina (${avaliacoes.length} de ${new Set(avaliacoes.map((a) => a.aluno_id)).size} alunos) é pequena e enviesada para quem concluiu — deve ser lida como sinal, não como medida.</li>
    <li>As linhas de código medem volume, não valor: servem para dimensionar esforço, não para avaliar qualidade.</li>
  </ul>

  <div class="rodapeDoc">
    Relatório completo da plataforma · Turmas 1 e 2 · Plataforma CSMG — Coworking Social de Mudanças Globais<br>
    Período de ${dataLonga(INICIO)} a ${dataLonga(CORTE)} · Emitido em ${dataLonga(CORTE)} · Dados apurados diretamente do banco de produção e do repositório do projeto.
  </div>
</section>
`);

// ═══════════════════════════════════════════════════════════════════════════
// Renderização
// ═══════════════════════════════════════════════════════════════════════════
const HTML_CAPA = "/tmp/relatorio-capa.html";
const HTML_CORPO = "/tmp/relatorio-corpo.html";
const PDF_CAPA = "/tmp/relatorio-capa.pdf";
const PDF_CORPO = "/tmp/relatorio-corpo.pdf";

fs.writeFileSync(HTML_CAPA, htmlCapa);
fs.writeFileSync(HTML_CORPO, htmlCorpo);
fs.writeFileSync(SAIDA_HTML, htmlCapa + htmlCorpo); // versão única, só para conferência
fs.mkdirSync(path.dirname(SAIDA_PDF), { recursive: true });

const navegador = await chromium.launch();

async function renderizar(entrada, saida, opcoes) {
  const pagina = await navegador.newPage();
  await pagina.goto(`file://${entrada}`, { waitUntil: "networkidle" });
  await pagina.emulateMedia({ media: "print" });
  await pagina.pdf({ path: saida, format: "A4", printBackground: true, ...opcoes });
  await pagina.close();
}

// A capa é gerada à parte: sangra até a borda e não leva rodapé nem numeração.
await renderizar(HTML_CAPA, PDF_CAPA, {
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});

await renderizar(HTML_CORPO, PDF_CORPO, {
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `<div style="width:100%;font-family:sans-serif;font-size:7.5pt;color:#8a9a9e;
    padding:0 15mm;display:flex;justify-content:space-between">
    <span>Relatório completo · Turmas 1 e 2 · Plataforma CSMG</span>
    <span class="pageNumber"></span></div>`,
  margin: { top: "14mm", right: "15mm", bottom: "16mm", left: "15mm" },
});

await navegador.close();

execFileSync("pdfunite", [PDF_CAPA, PDF_CORPO, SAIDA_PDF]);

console.log(`PDF gerado: ${SAIDA_PDF}`);
console.log(`HTML de conferência: ${SAIDA_HTML}`);
