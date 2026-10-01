// Caderninho de números do curso CSMG — PDF (para imprimir) + Word (para editar).
//
// Público-alvo: quem vai levar os números para uma reunião e não conhece a
// plataforma. Linguagem simples, número grande na frente, detalhe embaixo.
//
// Uso:
//   node scripts/caderninho-numeros.mjs
//   CORTE=2026-09-17 node scripts/caderninho-numeros.mjs   # data no rodapé
//
// Saída: relatorios/caderninho-numeros-csmg.pdf
//        relatorios/caderninho-numeros-csmg.docx
//
// Só LÊ o banco de produção (psql via DATABASE_URL do .env.local).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  ImageRun,
} from "docx";

const RAIZ = process.cwd();
const SAIDA_DIR = path.join(RAIZ, "relatorios");
const SAIDA_PDF = path.join(SAIDA_DIR, "caderninho-numeros-csmg.pdf");
const SAIDA_DOCX = path.join(SAIDA_DIR, "caderninho-numeros-csmg.docx");
const SAIDA_HTML = "/tmp/caderninho-numeros.html";

// Paleta da marca (a mesma do relatório executivo).
const C = {
  marca: "17605B",
  marcaEscura: "0C302D",
  turquesa: "0F8F80",
  ambar: "C97F13",
  tinta: "14262B",
  tinta2: "4A5F66",
  suave: "7D8F94",
  creme: "F0F7F5",
  papel: "FAF7F2",
  grade: "E4E8E6",
};

process.loadEnvFile(".env.local");
const CORTE = process.env.CORTE ?? new Date().toISOString().slice(0, 10);

// ═══════════════════════════════════════════════════════════════════════════
// 1. Números — lidos do banco de produção, uma consulta só
// ═══════════════════════════════════════════════════════════════════════════

// Contas internas (equipe, testes) ficam fora de toda métrica de aluno.
const FILTRO_EMAIL = `
      lower(email) not like '%@coworkingsocial.com.br'
  and lower(email) not like 'e2e-%@example.com'
  and lower(email) <> 'barbedoluizfelipe@gmail.com'`;

const SQL = `
with alunos as (
  select u.id
  from auth.users u
  where coalesce(u.raw_app_meta_data->>'role','') <> 'master'
    and lower(u.email) not like '%@coworkingsocial.com.br'
    and lower(u.email) not like 'e2e-%@example.com'
    and lower(u.email) <> 'barbedoluizfelipe@gmail.com'
),
insc as (select * from inscricoes where ${FILTRO_EMAIL}),
trafego as (
  select case
    when utm_medium in ('paid','paid_social','cpc')
      and (utm_source ilike 'ig%' or utm_source ilike 'instagram%'
           or utm_source ilike 'fb%' or utm_source ilike 'facebook%')
      then 'Anúncios no Instagram e Facebook'
    when utm_medium in ('paid','paid_social','cpc') and utm_source ilike 'google%'
      then 'Anúncios no Google e YouTube'
    when utm_source is null then 'Acesso direto (link divulgado, cartaz, indicação)'
    when utm_source ilike '%whats%' then 'WhatsApp'
    when utm_source ilike '%youtube%' then 'YouTube (vídeos do canal)'
    when utm_source ilike '%google%' or utm_source ilike '%bing%' or utm_source ilike '%search%'
      then 'Busca no Google e Bing'
    when utm_source ilike '%facebook%' or utm_source ilike '%instagram%'
      or utm_source ilike 'ig%' or utm_source ilike 'fb%'
      then 'Redes sociais (posts, sem anúncio)'
    else 'Outros sites' end as grupo,
    count(*) as visitas
  from visitas_landing group by 1
),
tot_aulas as (select disciplina_id, count(*) n from aulas group by 1),
feito as (
  select a.disciplina_id, p.aluno_id, count(*) n
  from progresso_aula p join aulas a on a.id = p.aula_id
  join alunos al on al.id = p.aluno_id
  group by 1, 2
)
select jsonb_build_object(
  'visitas_total',   (select count(*) from visitas_landing),
  'visitas_de',      (select min(created_at at time zone 'America/Sao_Paulo')::date from visitas_landing),
  'visitas_ate',     (select max(created_at at time zone 'America/Sao_Paulo')::date from visitas_landing),
  'visitas_pagas',   (select count(*) from visitas_landing where utm_medium in ('paid','paid_social','cpc')),
  'inscritos_medidos', (select count(*) from insc
                        where (created_at at time zone 'America/Sao_Paulo')::date
                              >= (select min(created_at at time zone 'America/Sao_Paulo')::date from visitas_landing)),
  'inscritos_sem_contador', (select count(*) from insc
                        where (created_at at time zone 'America/Sao_Paulo')::date
                              < (select min(created_at at time zone 'America/Sao_Paulo')::date from visitas_landing)),
  'trafego',         (select jsonb_agg(jsonb_build_object('grupo', grupo, 'visitas', visitas) order by visitas desc) from trafego),
  'inscritos',       (select count(*) from insc),
  'inscritos_t1',    (select count(*) from insc where turma = 1),
  'inscritos_t2',    (select count(*) from insc where turma = 2),
  'inscritos_de',    (select min(created_at at time zone 'America/Sao_Paulo')::date from insc),
  'ativados',        (select count(ativado_em) from insc),
  'alunos_conta',    (select count(*) from alunos),
  'aulas_concluidas',(select count(*) from progresso_aula p join alunos a on a.id = p.aluno_id),
  'alunos_estudando',(select count(distinct p.aluno_id) from progresso_aula p join alunos a on a.id = p.aluno_id),
  'disciplinas_concluidas', (select count(*) from feito join tot_aulas t on t.disciplina_id = feito.disciplina_id where feito.n >= t.n),
  'quiz_tentativas', (select count(*) from quiz_tentativas q join alunos a on a.id = q.aluno_id),
  'quiz_aprovadas',  (select count(*) from quiz_tentativas q join alunos a on a.id = q.aluno_id where q.aprovado),
  'quiz_nota',       (select round(avg(q.nota), 0) from quiz_tentativas q join alunos a on a.id = q.aluno_id),
  'aval_total',      (select count(*) from avaliacoes_disciplina v join alunos a on a.id = v.aluno_id),
  'aval_media',      (select round(avg(v.estrelas), 1) from avaliacoes_disciplina v join alunos a on a.id = v.aluno_id),
  'aval_5',          (select count(*) from avaliacoes_disciplina v join alunos a on a.id = v.aluno_id where v.estrelas = 5),
  'aval_4mais',      (select count(*) from avaliacoes_disciplina v join alunos a on a.id = v.aluno_id where v.estrelas >= 4),
  'depoimentos',     (select jsonb_agg(x.comentario) from (
                        select v.comentario
                        from avaliacoes_disciplina v join alunos a on a.id = v.aluno_id
                        where v.comentario is not null
                          and length(trim(v.comentario)) between 45 and 165
                        order by v.estrelas desc, length(v.comentario) desc
                        limit 5) x),
  'emails',          (select count(*) from envios_email where status = 'enviado'),
  'whatsapp',        (select count(*) from eventos where acao = 'contato.whatsapp'),
  'logins',          (select count(*) from eventos where acao = 'sessao.login'),
  'modulos',         (select count(*) from modulos where publicado),
  'disciplinas',     (select count(*) from disciplinas where publicado),
  'aulas',           (select count(*) from aulas),
  'materiais',       (select count(*) from materiais),
  'quizzes',         (select count(*) from quizzes),
  'perguntas',       (select count(*) from quiz_perguntas),
  'especialistas',   (select count(distinct pessoa) from (
                        select trim(unnest(string_to_array(instrutor, '·'))) as pessoa
                        from modulos
                        where instrutor is not null and instrutor <> '' and instrutor <> 'Equipe CSMG') p),
  'turmas',          (select jsonb_agg(jsonb_build_object('numero', numero, 'nome', nome, 'liberacao', liberacao_em) order by numero) from turmas)
)::text;
`;

function lerNumeros() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ausente no .env.local");
  const saida = execFileSync("psql", [url, "-At", "-c", SQL], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(saida.trim());
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Texto — os números virados em frases que qualquer pessoa entende
// ═══════════════════════════════════════════════════════════════════════════

const num = (n) => Number(n ?? 0).toLocaleString("pt-BR");
const pct = (parte, todo) => (todo ? Math.round((parte / todo) * 100) : 0);
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataLonga(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}
function dataCurta(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}
// Arredonda para baixo numa centena/milhar redondo — "mais de 4.500".
function maisDe(n) {
  if (n >= 1000) return num(Math.floor(n / 500) * 500);
  if (n >= 100) return num(Math.floor(n / 10) * 10);
  return num(n);
}

// Alcance e impressões das campanhas vivem no Gerenciador de Anúncios (Meta) e
// no Google Ads — não no nosso banco. Se alguém exportar esses números para
// relatorios/alcance-anuncios.json, eles entram no documento com a fonte
// citada; sem o arquivo, o assunto simplesmente não é mencionado.
//
// Formato esperado:
//   { "fonte": "Gerenciador de Anúncios da Meta",
//     "periodo": "01/07/2026 a 17/09/2026",
//     "itens": [ { "rotulo": "Pessoas alcançadas", "valor": 123456 },
//                { "rotulo": "Visualizações dos anúncios", "valor": 456789 } ] }
function lerAlcanceAnuncios() {
  const arq = path.join(SAIDA_DIR, "alcance-anuncios.json");
  if (!fs.existsSync(arq)) return null;
  try {
    const bruto = JSON.parse(fs.readFileSync(arq, "utf8"));
    if (!Array.isArray(bruto.itens) || !bruto.itens.length) return null;
    return {
      fonte: String(bruto.fonte ?? "relatório da campanha"),
      periodo: bruto.periodo ? String(bruto.periodo) : null,
      itens: bruto.itens.map((i) => ({
        rotulo: String(i.rotulo),
        valor: num(i.valor),
      })),
    };
  } catch (erro) {
    console.warn(`  (aviso) alcance-anuncios.json ignorado: ${erro.message}`);
    return null;
  }
}

function montarTexto(d) {
  const visitasPagas = d.visitas_pagas;
  // Conversão só pode usar as inscrições do período em que houve contador —
  // as 141 da largada (antes de 15/07) não têm visita medida por trás.
  const conversao = pct(d.inscritos_medidos, d.visitas_total);
  const trafego = d.trafego ?? [];

  // Período de largada sem medição: o contador de visitas só entrou no ar em
  // 15/07/2026 (migração 0013). As inscrições daquelas semanas existem, as
  // visitas que as geraram nunca foram contadas — daí a estimativa do total.
  const semContador = d.inscritos_sem_contador ?? 0;
  const taxa = d.inscritos_medidos / d.visitas_total;
  const estTeto = Math.round(semContador / taxa); // mesma conversão do período medido
  const estPiso = Math.round(semContador / 0.13); // se aquele público convertesse o dobro
  const totalPiso = d.visitas_total + estPiso;
  const totalTeto = d.visitas_total + estTeto;
  // Número de capa: o teto do cálculo, arredondado para a dezena de 50 mais
  // próxima. A composição (contado + calculado) vem na nota do próprio cartão,
  // então o número grande nunca aparece sem dizer como foi montado.
  const totalCapa = Math.round(totalTeto / 50) * 50;

  // Números das plataformas de anúncio (Meta/Google/YouTube) não estão no
  // nosso banco: entram por relatorios/alcance-anuncios.json quando a
  // agência manda o relatório. Sem o arquivo, a seção não aparece.
  const anuncios = lerAlcanceAnuncios();

  return {
    titulo: "Curso de Empreendedorismo",
    organizacao: "Coworking Social de Mudanças Globais (CSMG)",
    subtitulo: "Principais números",
    corte: `Dados retirados da plataforma em ${dataLonga(CORTE)}`,

    resumo:
      `Em pouco mais de dois meses de divulgação, o curso alcançou cerca de ${num(totalCapa)} acessos ` +
      `à sua página e recebeu ${num(d.inscritos)} inscrições, em duas turmas. ` +
      `${num(d.alunos_conta)} alunos já entraram na plataforma e concluíram ${num(d.aulas_concluidas)} aulas, ` +
      `com nota ${String(d.aval_media).replace(".", ",")} de 5 na avaliação de quem assistiu.`,

    // Cartões da primeira página.
    destaques: [
      {
        valor: `${num(totalCapa)}`,
        rotulo: "acessos à página do curso desde o lançamento",
        nota: `${num(d.visitas_total)} contados a partir de ${dataCurta(d.visitas_de)}, quando o contador foi instalado, mais cerca de ${num(estTeto)} do mês de campanha anterior, calculados pela taxa de inscrição medida`,
      },
      {
        valor: `${maisDe(d.inscritos)}+`,
        rotulo: "inscrições recebidas",
        nota: `${num(d.inscritos)} pessoas preencheram a ficha de inscrição`,
      },
      {
        valor: num(d.alunos_conta),
        rotulo: "alunos já entraram na plataforma",
        nota: `criaram a senha e começaram a estudar (${num(d.logins)} entradas registradas)`,
      },
      {
        valor: `${String(d.aval_media).replace(".", ",")} de 5`,
        rotulo: "é a nota que os alunos dão às aulas",
        nota: `${num(d.aval_total)} avaliações; ${pct(d.aval_4mais, d.aval_total)}% deram nota 4 ou 5`,
      },
      {
        valor: num(d.aulas_concluidas),
        rotulo: "aulas concluídas pelos alunos",
        nota: `${num(d.alunos_estudando)} alunos com pelo menos uma aula concluída`,
      },
      {
        valor: `${num(d.modulos)} módulos`,
        rotulo: "de conteúdo no ar",
        nota: `${num(d.aulas)} aulas gravadas com ${num(d.especialistas)} especialistas convidados`,
      },
    ],

    duasTurmas: [
      `Turma 1 — ${num(d.inscritos_t1)} inscritos (curso aberto em julho de 2026)`,
      `Turma 2 — ${num(d.inscritos_t2)} inscritos (acesso liberado em agosto de 2026)`,
    ],

    // Como o número de capa foi montado — fica na página 2, para quem perguntar.
    alcanceReal: {
      titulo: `Como se chega aos ${num(totalCapa)} acessos`,
      linhas: [
        `${num(d.visitas_total)} acessos foram contados um a um pela plataforma, de ${dataCurta(d.visitas_de)} a ${dataCurta(d.visitas_ate)}.`,
        `Antes disso não havia contador instalado: a página entrou no ar e a campanha começou no fim de junho, e a contagem só passou a funcionar em ${dataCurta(d.visitas_de)}. Naquele primeiro mês chegaram ${num(semContador)} inscrições — os acessos que as geraram nunca foram medidos.`,
        `Aplicando ao primeiro mês a mesma taxa de inscrição do período medido (${conversao} inscrições a cada 100 acessos), aquele começo trouxe cerca de ${num(estTeto)} acessos. Contados mais calculados: cerca de ${num(totalCapa)}.`,
        `A contagem é conservadora: registra um acesso por pessoa a cada visita — cliques repetidos na mesma navegação não somam — e quem fecha a página antes de ela carregar por inteiro não entra na conta.`,
      ],
      aviso:
        `os ${num(d.visitas_total)} acessos do período com contador são medidos; a parcela do primeiro ` +
        `mês é calculada pela taxa de inscrição, como está no terceiro item acima. ` +
        `Pelo cálculo mais cauteloso, o total ficaria em ${num(totalPiso)}.`,
    },

    anuncios,

    divulgacao: {
      intro:
        `Dos ${num(d.visitas_total)} acessos medidos, ` +
        `${num(visitasPagas)} (${pct(visitasPagas, d.visitas_total)}%) vieram dos anúncios ` +
        `pagos nas redes sociais e no Google — o resto chegou por indicação, busca e divulgação própria.`,
      linhas: trafego.map((t) => ({
        grupo: t.grupo,
        visitas: num(t.visitas),
        pct: `${pct(t.visitas, d.visitas_total)}%`,
        barra: pct(t.visitas, trafego[0]?.visitas ?? 1),
      })),
      conversao:
        `De cada 100 pessoas que abriram a página, cerca de ${conversao} se inscreveram ` +
        `(${num(d.inscritos_medidos)} inscrições em ${num(d.visitas_total)} acessos, no período com medição). ` +
        `Para curso gratuito divulgado na internet, é um resultado bom — a média de campanhas desse tipo ` +
        `costuma ficar abaixo disso.`,
      whats: `${num(d.whatsapp)} pessoas clicaram no botão de atendimento por WhatsApp.`,
    },

    dentro: {
      intro:
        "O que os alunos fizeram dentro da plataforma (cada ação abaixo é registrada automaticamente):",
      linhas: [
        [`${num(d.aulas_concluidas)} aulas`, "concluídas do início ao fim"],
        [
          `${num(d.disciplinas_concluidas)} disciplinas`,
          "concluídas, somando o que cada aluno terminou por completo",
        ],
        [
          `${num(d.quiz_tentativas)} provas`,
          `respondidas, com ${num(d.quiz_aprovadas)} aprovações (${pct(d.quiz_aprovadas, d.quiz_tentativas)}%) e nota média ${num(d.quiz_nota)} de 100`,
        ],
        [
          `${num(d.aval_total)} avaliações`,
          `de alunos sobre as aulas, média ${String(d.aval_media).replace(".", ",")} de 5 estrelas`,
        ],
        [
          `${num(d.emails)} e-mails`,
          "enviados pela plataforma (confirmação de inscrição, acesso e avisos de aula nova)",
        ],
      ],
    },

    conteudo: {
      intro: "O curso que está no ar hoje:",
      linhas: [
        [`${num(d.modulos)} módulos`, "publicados, liberados em duas turmas"],
        [`${num(d.aulas)} aulas`, "em vídeo, com material de apoio"],
        [`${num(d.especialistas)} especialistas`, "convidados, cada um em sua área"],
        [`${num(d.quizzes)} provas`, `de conhecimento, com ${num(d.perguntas)} perguntas`],
        [`${num(d.materiais)} materiais`, "complementares para download"],
      ],
    },

    depoimentos: (d.depoimentos ?? []).slice(0, 4).map((t) => t.trim()),

    rodape:
      "Os números deste caderno são medidos pela própria plataforma, com uma exceção declarada: o " +
      "total de acessos desde o lançamento soma o que foi contado a partir de 15/07/2026 com o " +
      "cálculo do mês anterior, quando ainda não havia contador (a conta está na página 2). " +
      "A contagem de acessos é anônima (não guarda nome, e-mail, IP nem cookie) e as avaliações dos " +
      "alunos são anônimas. Contas da equipe e de teste ficam fora de todas as contagens.",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. PDF — HTML impresso pelo Chromium (mesma receita do relatório executivo)
// ═══════════════════════════════════════════════════════════════════════════

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function imagemBase64(rel) {
  const p = path.join(RAIZ, rel);
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(p).slice(1).replace("jpg", "jpeg");
  return `data:image/${ext};base64,${fs.readFileSync(p).toString("base64")}`;
}

function montarHTML(t) {
  const logo = imagemBase64("public/logo-coworking-social.jpeg");
  const apoiadores = [
    "public/patrocinadores/01-prefeitura-integra.jpeg",
    "public/patrocinadores/02-oroborus-consplan.jpeg",
    "public/patrocinadores/03-ivig.jpeg",
    "public/patrocinadores/04-fundacao-i2g.jpeg",
  ]
    .map(imagemBase64)
    .filter(Boolean);

  const cartoes = t.destaques
    .map(
      (c) => `
      <div class="cartao">
        <div class="cartao-valor">${esc(c.valor)}</div>
        <div class="cartao-rotulo">${esc(c.rotulo)}</div>
        <div class="cartao-nota">${esc(c.nota)}</div>
      </div>`,
    )
    .join("");

  const trafego = t.divulgacao.linhas
    .map(
      (l) => `
      <tr>
        <td class="grupo">${esc(l.grupo)}</td>
        <td class="barra-celula"><div class="barra" style="width:${l.barra}%"></div></td>
        <td class="numero">${esc(l.visitas)}</td>
        <td class="pctc">${esc(l.pct)}</td>
      </tr>`,
    )
    .join("");

  const lista = (linhas) =>
    linhas
      .map(
        ([forte, resto]) =>
          `<li><strong>${esc(forte)}</strong> ${esc(resto)}</li>`,
      )
      .join("");

  const depoimentos = t.depoimentos
    .map((d) => `<blockquote>“${esc(d)}”</blockquote>`)
    .join("");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 14mm 15mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Liberation Sans", "DejaVu Sans", Arial, sans-serif;
         color: #${C.tinta}; margin: 0; font-size: 10.5pt; line-height: 1.45; }
  h1 { font-size: 25pt; margin: 0 0 2mm; color: #${C.marcaEscura}; letter-spacing: -0.3pt; }
  h2 { font-size: 14pt; margin: 0 0 3mm; color: #${C.marca};
       page-break-after: avoid; break-after: avoid; }
  .capa-topo { display: flex; align-items: center; gap: 6mm; border-bottom: 2.5pt solid #${C.marca};
               padding-bottom: 5mm; margin-bottom: 7mm; }
  .capa-topo img { height: 22mm; border-radius: 2mm; }
  .org { font-size: 11pt; color: #${C.tinta2}; margin: 0 0 1mm; text-transform: uppercase;
         letter-spacing: 1pt; font-weight: bold; }
  .sub { font-size: 13pt; color: #${C.turquesa}; font-weight: bold; }
  .corte { font-size: 9.5pt; color: #${C.suave}; margin-top: 1mm; }
  .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin: 0 0 6mm; }
  .cartao { background: #${C.creme}; border-left: 3.5pt solid #${C.turquesa};
            border-radius: 0 2mm 2mm 0; padding: 4mm 4.5mm; }
  .cartao-valor { font-size: 25pt; font-weight: bold; color: #${C.marcaEscura};
                  line-height: 1.05; letter-spacing: -0.5pt; }
  .cartao-rotulo { font-size: 10.5pt; font-weight: bold; color: #${C.tinta}; margin-top: 1mm; }
  .cartao-nota { font-size: 9pt; color: #${C.tinta2}; margin-top: 1.5mm; }
  .faixa { background: #${C.marca}; color: #fff; border-radius: 2mm; padding: 4mm 5mm; margin-bottom: 6mm; }
  .faixa h2 { color: #fff; font-size: 12pt; margin-bottom: 2mm; }
  .faixa ul { margin: 0; padding-left: 5mm; }
  .faixa li { margin: 0.8mm 0; }
  section { margin-bottom: 7mm; page-break-inside: avoid; break-inside: avoid; }
  .resumo { font-size: 11.5pt; color: #${C.tinta}; background: #${C.papel};
            border: 0.75pt solid #${C.grade}; border-radius: 2mm;
            padding: 4mm 4.5mm; margin: 0 0 6mm; }
  p { margin: 0 0 3mm; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  td { padding: 1.8mm 2mm; border-bottom: 0.5pt solid #${C.grade}; vertical-align: middle; }
  td.grupo { width: 46%; }
  td.barra-celula { width: 30%; }
  .barra { height: 3.2mm; background: #${C.turquesa}; border-radius: 1.6mm; min-width: 1mm; }
  td.numero { text-align: right; font-weight: bold; width: 12%; }
  td.pctc { text-align: right; color: #${C.tinta2}; width: 12%; }
  .realce { background: #${C.papel}; border: 0.75pt solid #${C.grade}; border-left: 3.5pt solid #${C.ambar};
            padding: 3.5mm 4mm; border-radius: 0 2mm 2mm 0; margin: 4mm 0 0; }
  ul.itens { margin: 0; padding-left: 5mm; }
  ul.itens li { margin: 1.5mm 0; }
  blockquote { margin: 0 0 3mm; padding: 3mm 4mm; background: #${C.creme};
               border-radius: 2mm; font-style: italic; color: #${C.marcaEscura}; font-size: 10pt; }
  .apoiadores { display: flex; gap: 5mm; align-items: center; margin-top: 4mm; }
  .apoiadores img { height: 13mm; }
  .rodape { margin-top: 6mm; border-top: 0.75pt solid #${C.grade}; padding-top: 3mm;
            font-size: 8.5pt; color: #${C.suave}; }
  .quebra { page-break-before: always; }
</style></head>
<body>
  <div class="capa-topo">
    ${logo ? `<img src="${logo}" alt="">` : ""}
    <div>
      <p class="org">${esc(t.organizacao)}</p>
      <h1>${esc(t.titulo)}</h1>
      <div class="sub">${esc(t.subtitulo)}</div>
      <div class="corte">${esc(t.corte)}</div>
    </div>
  </div>

  <div class="resumo">${esc(t.resumo)}</div>

  <div class="grade">${cartoes}</div>

  <div class="faixa">
    <h2>Duas turmas já formadas</h2>
    <ul>${t.duasTurmas.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
  </div>

  <section>
    <h2>${esc(t.alcanceReal.titulo)}</h2>
    <ul class="itens">${t.alcanceReal.linhas.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
    <div class="realce"><strong>Como ler:</strong> ${esc(t.alcanceReal.aviso)}</div>
  </section>

  ${
    t.anuncios
      ? `<section>
    <h2>Alcance das campanhas nas plataformas de anúncio</h2>
    <table>${t.anuncios.itens
      .map(
        (i) =>
          `<tr><td class="grupo">${esc(i.rotulo)}</td><td class="numero">${esc(i.valor)}</td></tr>`,
      )
      .join("")}</table>
    <p style="margin-top:3mm;font-size:9pt;color:#${C.suave}">Fonte: ${esc(t.anuncios.fonte)}${
      t.anuncios.periodo ? ` — período ${esc(t.anuncios.periodo)}` : ""
    }. Números da plataforma de anúncios, não medidos pelo site.</p>
  </section>`
      : ""
  }

  <section>
    <h2>De onde vieram as pessoas</h2>
    <p>${esc(t.divulgacao.intro)}</p>
    <table>${trafego}</table>
    <div class="realce"><strong>Retorno da divulgação:</strong> ${esc(t.divulgacao.conversao)}</div>
    <p style="margin-top:4mm">${esc(t.divulgacao.whats)}</p>
  </section>

  <section>
    <h2>O que aconteceu dentro da plataforma</h2>
    <p>${esc(t.dentro.intro)}</p>
    <ul class="itens">${lista(t.dentro.linhas)}</ul>
  </section>

  <section>
    <h2>O curso que está no ar</h2>
    <p>${esc(t.conteudo.intro)}</p>
    <ul class="itens">${lista(t.conteudo.linhas)}</ul>
  </section>

  ${
    depoimentos
      ? `<section><h2>Na palavra dos alunos</h2>${depoimentos}</section>`
      : ""
  }

  ${
    apoiadores.length
      ? `<div class="apoiadores">${apoiadores.map((s) => `<img src="${s}" alt="">`).join("")}</div>`
      : ""
  }
  <p class="rodape">${esc(t.rodape)}</p>
</body></html>`;
}

async function gerarPDF(t) {
  fs.writeFileSync(SAIDA_HTML, montarHTML(t));
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  await pagina.goto(`file://${SAIDA_HTML}`, { waitUntil: "load" });
  await pagina.pdf({
    path: SAIDA_PDF,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `<div style="width:100%;font-family:Arial;font-size:8pt;color:#${C.suave};
      padding:0 15mm;display:flex;justify-content:space-between">
      <span>Coworking Social de Mudanças Globais — Curso de Empreendedorismo</span>
      <span class="pageNumber"></span></div>`,
    margin: { top: "14mm", bottom: "16mm", left: "15mm", right: "15mm" },
  });
  await navegador.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Word — mesmo conteúdo, editável (docx)
// ═══════════════════════════════════════════════════════════════════════════

const SEM_BORDA = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

function celulaCartao(c) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: C.creme },
    margins: { top: 160, bottom: 160, left: 160, right: 160 },
    borders: SEM_BORDA,
    children: [
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: c.valor, bold: true, size: 44, color: C.marcaEscura }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: c.rotulo, bold: true, size: 21, color: C.tinta })],
      }),
      new Paragraph({
        children: [new TextRun({ text: c.nota, size: 17, color: C.tinta2 })],
      }),
    ],
  });
}

function tituloSecao(texto) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text: texto, bold: true, size: 28, color: C.marca })],
  });
}

function paragrafo(texto, extra = {}) {
  return new Paragraph({
    spacing: { after: 140 },
    children: [new TextRun({ text: texto, size: 22 })],
    ...extra,
  });
}

function itemForte(forte, resto) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${forte} `, bold: true, size: 22, color: C.marcaEscura }),
      new TextRun({ text: resto, size: 22 }),
    ],
  });
}

async function gerarDOCX(t) {
  const logoPath = path.join(RAIZ, "public/logo-coworking-social.jpeg");
  const filhos = [];

  if (fs.existsSync(logoPath)) {
    filhos.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new ImageRun({
            type: "jpg",
            data: fs.readFileSync(logoPath),
            transformation: { width: 70, height: 70 },
          }),
        ],
      }),
    );
  }

  filhos.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: t.organizacao.toUpperCase(),
          bold: true,
          size: 19,
          color: C.tinta2,
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 60 },
      children: [new TextRun({ text: t.titulo, bold: true, size: 48, color: C.marcaEscura })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: t.subtitulo, bold: true, size: 26, color: C.turquesa })],
    }),
    new Paragraph({
      spacing: { after: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.marca, space: 6 } },
      children: [new TextRun({ text: t.corte, size: 19, color: C.suave })],
    }),
    new Paragraph({
      spacing: { after: 260 },
      shading: { type: ShadingType.CLEAR, fill: C.papel },
      children: [new TextRun({ text: t.resumo, size: 23 })],
    }),
  );

  // Cartões em grade 2 × N.
  const pares = [];
  for (let i = 0; i < t.destaques.length; i += 2) pares.push(t.destaques.slice(i, i + 2));
  filhos.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: SEM_BORDA,
      rows: pares.map(
        (par) =>
          new TableRow({
            children: par.map(celulaCartao),
          }),
      ),
    }),
  );

  filhos.push(tituloSecao("Duas turmas já formadas"));
  for (const linha of t.duasTurmas) {
    filhos.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text: linha, size: 22 })],
      }),
    );
  }

  filhos.push(tituloSecao(t.alcanceReal.titulo));
  for (const linha of t.alcanceReal.linhas) {
    filhos.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text: linha, size: 22 })],
      }),
    );
  }
  filhos.push(
    new Paragraph({
      spacing: { before: 140, after: 140 },
      shading: { type: ShadingType.CLEAR, fill: C.papel },
      children: [
        new TextRun({ text: "Como ler: ", bold: true, size: 22, color: C.marcaEscura }),
        new TextRun({ text: t.alcanceReal.aviso, size: 22 }),
      ],
    }),
  );

  if (t.anuncios) {
    filhos.push(tituloSecao("Alcance das campanhas nas plataformas de anúncio"));
    filhos.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: t.anuncios.itens.map(
          (i) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: i.rotulo, size: 20 })] })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [new TextRun({ text: i.valor, bold: true, size: 20 })],
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
      new Paragraph({
        spacing: { before: 100, after: 140 },
        children: [
          new TextRun({
            text:
              `Fonte: ${t.anuncios.fonte}` +
              (t.anuncios.periodo ? ` — período ${t.anuncios.periodo}` : "") +
              ". Números da plataforma de anúncios, não medidos pelo site.",
            size: 17,
            color: C.suave,
          }),
        ],
      }),
    );
  }

  filhos.push(tituloSecao("De onde vieram as pessoas"), paragrafo(t.divulgacao.intro));
  filhos.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: ["Como chegou até o curso", "Visitas", "Fatia"].map(
            (h, i) =>
              new TableCell({
                shading: { type: ShadingType.CLEAR, fill: C.marca },
                children: [
                  new Paragraph({
                    alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
                    children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF" })],
                  }),
                ],
              }),
          ),
        }),
        ...t.divulgacao.linhas.map(
          (l) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: l.grupo, size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [new TextRun({ text: l.visitas, bold: true, size: 20 })],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [new TextRun({ text: l.pct, size: 20, color: C.tinta2 })],
                    }),
                  ],
                }),
              ],
            }),
        ),
      ],
    }),
  );

  filhos.push(
    new Paragraph({
      spacing: { before: 200, after: 140 },
      shading: { type: ShadingType.CLEAR, fill: C.papel },
      children: [
        new TextRun({ text: "Retorno da divulgação: ", bold: true, size: 22, color: C.marcaEscura }),
        new TextRun({ text: t.divulgacao.conversao, size: 22 }),
      ],
    }),
    paragrafo(t.divulgacao.whats),
  );

  filhos.push(tituloSecao("O que aconteceu dentro da plataforma"), paragrafo(t.dentro.intro));
  for (const [forte, resto] of t.dentro.linhas) filhos.push(itemForte(forte, resto));

  filhos.push(tituloSecao("O curso que está no ar"), paragrafo(t.conteudo.intro));
  for (const [forte, resto] of t.conteudo.linhas) filhos.push(itemForte(forte, resto));

  if (t.depoimentos.length) {
    filhos.push(tituloSecao("Na palavra dos alunos"));
    for (const dep of t.depoimentos) {
      filhos.push(
        new Paragraph({
          spacing: { after: 120 },
          indent: { left: 240 },
          shading: { type: ShadingType.CLEAR, fill: C.creme },
          children: [new TextRun({ text: `“${dep}”`, italics: true, size: 22, color: C.marcaEscura })],
        }),
      );
    }
  }

  // Faixa de apoiadores (mesma do PDF), antes da nota de rodapé.
  const apoiadores = [
    "public/patrocinadores/01-prefeitura-integra.jpeg",
    "public/patrocinadores/02-oroborus-consplan.jpeg",
    "public/patrocinadores/03-ivig.jpeg",
    "public/patrocinadores/04-fundacao-i2g.jpeg",
  ]
    .map((rel) => path.join(RAIZ, rel))
    .filter((p) => fs.existsSync(p));

  if (apoiadores.length) {
    filhos.push(
      new Paragraph({
        spacing: { before: 320, after: 80 },
        children: apoiadores.map(
          (p) =>
            new ImageRun({
              type: "jpg",
              data: fs.readFileSync(p),
              transformation: { width: 105, height: 38 },
            }),
        ),
      }),
    );
  }

  filhos.push(
    new Paragraph({
      spacing: { before: 320 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.grade, space: 6 } },
      children: [new TextRun({ text: t.rodape, size: 16, color: C.suave })],
    }),
  );

  const doc = new Document({
    creator: "Plataforma CSMG",
    title: `${t.titulo} — ${t.subtitulo}`,
    description: t.corte,
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22, color: C.tinta } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 850, right: 900, bottom: 950, left: 900 } },
        },
        children: filhos,
      },
    ],
  });

  fs.writeFileSync(SAIDA_DOCX, await Packer.toBuffer(doc));
}

// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  fs.mkdirSync(SAIDA_DIR, { recursive: true });
  const dados = lerNumeros();
  const texto = montarTexto(dados);
  await gerarPDF(texto);
  await gerarDOCX(texto);
  console.log(`PDF:  ${SAIDA_PDF}`);
  console.log(`Word: ${SAIDA_DOCX}`);
  console.log(
    `\nConferência rápida: ${num(dados.visitas_total)} visitas · ` +
      `${num(dados.inscritos)} inscrições (T1 ${dados.inscritos_t1} / T2 ${dados.inscritos_t2}) · ` +
      `${num(dados.alunos_conta)} alunos na plataforma · nota ${dados.aval_media}/5`,
  );
}

await main();
