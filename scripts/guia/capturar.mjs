// Captura as telas da plataforma pro guia de treinamento.
//
// Loga numa conta de equipe temporária (criada e apagada aqui mesmo),
// percorre as telas, TROCA TODO DADO PESSOAL REAL por dados fictícios
// direto no navegador, desenha as marcações numeradas e salva os prints.
//
// Uso: node capturar.mjs [--only=03,07]

import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://127.0.0.1:3000";
const SAIDA =
  process.env.GUIA_SAIDA ??
  "/tmp/claude-0/-home-projetos-Coworking/f71d88e1-e47f-4dab-b001-5fbbb001bed9/scratchpad/guia/prints/";
const so = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7);
const FILTRO = so ? so.split(",") : null;

mkdirSync(SAIDA, { recursive: true });

// ---------------------------------------------------------------- ambiente
const env = Object.fromEntries(
  readFileSync("/home/projetos/Coworking/.env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// --------------------------------------------------- dados fictícios (LGPD)
const PRENOMES = [
  "Ana", "Bruno", "Carla", "Daniel", "Elaine", "Fábio", "Gabriela", "Heitor",
  "Isabel", "João", "Karina", "Lucas", "Marina", "Nelson", "Olívia", "Paulo",
  "Queila", "Rafael", "Sônia", "Tiago", "Úrsula", "Vitor", "Wanda", "Yuri",
];
const SOBRENOMES = [
  "Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Ferreira", "Gomes",
  "Henriques", "Ipiranga", "Jardim", "Klein", "Lima", "Moreira", "Nunes",
  "Oliveira", "Pinheiro", "Queiroz", "Ramos", "Santana", "Teixeira",
];
const semAcento = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function nomeFicticio(i) {
  // Passo primo no sobrenome pra não sair página inteira de "Lima".
  return `${PRENOMES[i % PRENOMES.length]} ${
    SOBRENOMES[(i * 7 + 3) % SOBRENOMES.length]
  }`;
}
const emailsUsados = new Set();
function emailFicticio(i) {
  const [p, s] = nomeFicticio(i).split(" ");
  const base = `${semAcento(p)}.${semAcento(s)}`;
  let email = `${base}@exemplo.com`;
  let n = 2;
  while (emailsUsados.has(email)) email = `${base}${n++}@exemplo.com`;
  emailsUsados.add(email);
  return email;
}
function embaralharDigitos(texto, semente) {
  let k = 0;
  return texto.replace(/\d/g, () => String((semente * 7 + k++ * 3) % 10));
}

// Palavras que também são nome de alguém no banco, mas aparecem na tela como
// texto da interface — trocar quebraria a leitura ("Área do Master").
const NAO_TROCAR = new Set([
  "master", "equipe", "admin", "aluno", "alunos", "monitor", "monitora",
  "teste", "csmg", "coworking", "social", "turma", "curso", "plataforma",
  "geral", "online", "brasil", "rio", "janeiro", "marco", "maria",
]);

/** Monta o dicionário real → fictício a partir do banco. */
async function montarDisfarce() {
  const { data: inscricoes } = await admin
    .from("inscricoes")
    .select("nome, email, cpf, telefone, matricula");
  const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });

  const nomes = {};
  const emails = {};
  const matriculas = {};
  let i = 0;

  const registrar = (nome, email) => {
    const limpo = (nome ?? "").trim().replace(/\s+/g, " ");
    // Só troca nome completo (2+ palavras) ou primeiro nome com 4+ letras que
    // não seja palavra da interface — evita mutilar palavras comuns.
    if (limpo.length > 3 && !nomes[limpo] && !NAO_TROCAR.has(limpo.toLowerCase())) {
      nomes[limpo] = nomeFicticio(i);
      const primeiro = limpo.split(" ")[0];
      if (
        primeiro.length >= 4 &&
        !nomes[primeiro] &&
        !NAO_TROCAR.has(primeiro.toLowerCase())
      ) {
        nomes[primeiro] = nomeFicticio(i).split(" ")[0];
      }
    }
    if (email && !emails[email.toLowerCase()]) {
      emails[email.toLowerCase()] = emailFicticio(i);
    }
    i += 1;
  };

  for (const ins of inscricoes ?? []) {
    registrar(ins.nome, ins.email);
    if (ins.matricula && !matriculas[ins.matricula]) {
      matriculas[ins.matricula] = embaralharDigitos(ins.matricula, i);
    }
    // CPF e telefone entram pelo valor exato do banco — na tela eles podem
    // aparecer sem formatação, e aí nenhuma máscara genérica pegaria.
    if (ins.cpf) {
      matriculas[ins.cpf] = "000.000.000-00";
      matriculas[ins.cpf.replace(/\D/g, "")] = "00000000000";
    }
    if (ins.telefone) {
      matriculas[ins.telefone] = "(21) 90000-0000";
      matriculas[ins.telefone.replace(/\D/g, "")] = "21900000000";
    }
  }
  for (const u of lista?.users ?? []) {
    registrar((u.user_metadata ?? {}).nome ?? "", u.email ?? "");
  }
  return { nomes, emails, matriculas };
}

// --------------------------------------------------------------- navegador
const COR = "#c2410c"; // laranja-tijolo: destaca sobre o verde da marca

/** Injeta o disfarce + as funções de marcação na página. */
async function preparar(page, disfarce) {
  await page.addStyleTag({
    content: `*,*::before,*::after{animation-duration:.01s!important;
      animation-delay:0s!important;transition-duration:.01s!important}
      html{scroll-behavior:auto!important}`,
  });
  await page.evaluate((d) => {
    // ---- 1. troca dados pessoais reais por fictícios ---------------------
    const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const chaves = [
      ...Object.keys(d.nomes),
      ...Object.keys(d.emails),
      ...Object.keys(d.matriculas),
    ].sort((a, b) => b.length - a.length);
    const mapa = {};
    for (const [k, v] of Object.entries(d.nomes)) mapa[k.toLowerCase()] = v;
    for (const [k, v] of Object.entries(d.emails)) mapa[k.toLowerCase()] = v;
    for (const [k, v] of Object.entries(d.matriculas)) mapa[k.toLowerCase()] = v;
    // Lookarounds em vez de \b: nomes acentuados ("José") quebram o \b do JS.
    const re = chaves.length
      ? new RegExp(
          `(?<![\\p{L}\\p{N}])(?:${chaves.map(escapar).join("|")})(?![\\p{L}\\p{N}])`,
          "giu",
        )
      : null;

    const trocar = (texto) => {
      let t = texto;
      if (re) t = t.replace(re, (m) => mapa[m.toLowerCase()] ?? m);
      // Redes de segurança: qualquer e-mail, CPF ou telefone remanescente.
      t = t.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, (m) =>
        m.endsWith("@exemplo.com") ? m : "contato@exemplo.com",
      );
      t = t.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "000.000.000-00");
      t = t.replace(/\(\d{2}\)\s?9?\d{4}-\d{4}/g, "(21) 90000-0000");
      return t;
    };

    const anda = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nos = [];
    while (anda.nextNode()) nos.push(anda.currentNode);
    for (const no of nos) {
      const novo = trocar(no.nodeValue);
      if (novo !== no.nodeValue) no.nodeValue = novo;
    }
    for (const el of document.querySelectorAll("input[value], input")) {
      if (el.value && /@|\d{3}\./.test(el.value)) el.value = trocar(el.value);
    }

    // ---- 2. ferramenta de marcação --------------------------------------
    window.__marcar = (marcas, cor) => {
      document.getElementById("__anot")?.remove();
      const caixa = document.createElement("div");
      caixa.id = "__anot";
      Object.assign(caixa.style, {
        position: "absolute", top: "0", left: "0", width: "100%",
        height: `${document.documentElement.scrollHeight}px`,
        pointerEvents: "none", zIndex: "2147483647",
      });
      document.body.appendChild(caixa);

      for (const m of marcas) {
        let el = null;
        if (m.texto) {
          el = [...document.querySelectorAll(m.sel || "*")].find(
            (e) => e.textContent.trim().startsWith(m.texto),
          );
        } else {
          const todos = document.querySelectorAll(m.sel);
          el = todos[m.idx ?? 0];
        }
        if (!el) { console.warn("marca não encontrada:", JSON.stringify(m)); continue; }
        const r = el.getBoundingClientRect();
        const t = r.top + window.scrollY;
        const l = r.left + window.scrollX;

        const borda = document.createElement("div");
        Object.assign(borda.style, {
          position: "absolute", top: `${t - 4}px`, left: `${l - 4}px`,
          width: `${r.width + 8}px`, height: `${r.height + 8}px`,
          border: `3px solid ${cor}`, borderRadius: "10px",
          boxShadow: `0 0 0 4px ${cor}22`, boxSizing: "border-box",
        });
        caixa.appendChild(borda);

        const pos = m.pos || "tl";
        const bola = document.createElement("div");
        bola.textContent = m.n;
        Object.assign(bola.style, {
          position: "absolute",
          top: pos.startsWith("t") ? `${t - 19}px` : `${t + r.height - 19}px`,
          left: pos.endsWith("l") ? `${l - 19}px` : `${l + r.width - 19}px`,
          width: "34px", height: "34px", borderRadius: "50%",
          background: cor, color: "#fff", fontWeight: "700",
          fontSize: "18px", lineHeight: "34px", textAlign: "center",
          fontFamily: "Liberation Sans, Arial, sans-serif",
          boxShadow: "0 2px 6px rgba(0,0,0,.35)", border: "2px solid #fff",
        });
        caixa.appendChild(bola);
      }
    };
  }, disfarce);
}

async function marcar(page, marcas) {
  await page.evaluate(
    ([m, c]) => window.__marcar(m, c),
    [marcas, COR],
  );
  await page.waitForTimeout(120);
}

/** Print da página inteira ou recortado no elemento indicado. */
async function tirar(page, nome, opcoes = {}) {
  const arquivo = `${SAIDA}${nome}.jpg`;
  const comum = { path: arquivo, type: "jpeg", quality: 92 };
  if (opcoes.sel) {
    const caixa = await page.evaluate(
      ([sel, idx, folga]) => {
        const el = document.querySelectorAll(sel)[idx ?? 0];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const larguraDoc = document.documentElement.scrollWidth;
        const alturaDoc = document.documentElement.scrollHeight;
        const x = Math.max(0, r.left + window.scrollX - folga);
        const y = Math.max(0, r.top + window.scrollY - folga);
        return {
          x, y,
          width: Math.min(r.width + folga * 2, larguraDoc - x),
          height: Math.min(r.height + folga * 2, alturaDoc - y),
        };
      },
      [opcoes.sel, opcoes.idx ?? 0, opcoes.folga ?? 24],
    );
    if (!caixa) throw new Error(`elemento não encontrado: ${opcoes.sel}`);
    if (opcoes.alturaMax) caixa.height = Math.min(caixa.height, opcoes.alturaMax);
    await page.screenshot({ ...comum, fullPage: true, clip: caixa });
  } else if (opcoes.alturaMax) {
    const dim = await page.evaluate(() => ({
      w: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
    }));
    await page.screenshot({
      ...comum,
      fullPage: true,
      clip: { x: 0, y: opcoes.topo ?? 0, width: dim.w, height: Math.min(dim.h, opcoes.alturaMax) },
    });
  } else {
    await page.screenshot({ ...comum, fullPage: opcoes.inteira !== false });
  }
  console.log("  ✓", nome);
}

const querem = (nome) => !FILTRO || FILTRO.some((f) => nome.startsWith(f));

// ------------------------------------------------------------------- roteiro
async function principal() {
  const marca = Date.now();
  const emailMaster = `e2e-guia-${marca}@example.com`;
  const senhaMaster = `Guia!${marca}`;
  let idMaster = null;
  let idPostDemo = null;

  console.log("→ criando conta de equipe temporária…");
  const { data: criada, error: erroConta } = await admin.auth.admin.createUser({
    email: emailMaster,
    password: senhaMaster,
    email_confirm: true,
    user_metadata: { nome: "Equipe CSMG" },
    app_metadata: { role: "master", nivel: "admin", permissoes: [] },
  });
  if (erroConta) throw erroConta;
  idMaster = criada.user.id;

  const disfarce = await montarDisfarce();
  console.log(
    `→ disfarce pronto: ${Object.keys(disfarce.nomes).length} nomes, ` +
      `${Object.keys(disfarce.emails).length} e-mails`,
  );

  // Alvos reais pras telas de detalhe. Pra ficha, o aluno que mais avançou —
  // uma ficha zerada não ensina nada.
  const { data: progresso } = await admin
    .from("progresso_aula")
    .select("aluno_id");
  const porAluno = new Map();
  for (const p of progresso ?? []) {
    porAluno.set(p.aluno_id, (porAluno.get(p.aluno_id) ?? 0) + 1);
  }
  const { data: todosUsuarios } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const campeao = [...porAluno.entries()].sort((a, b) => b[1] - a[1])[0];
  const emailCampeao = campeao
    ? todosUsuarios.users.find((u) => u.id === campeao[0])?.email
    : null;
  const { data: alunoAtivo } = emailCampeao
    ? await admin
        .from("inscricoes")
        .select("id")
        .ilike("email", emailCampeao)
        .maybeSingle()
    : await admin
        .from("inscricoes")
        .select("id")
        .not("ativado_em", "is", null)
        .limit(1)
        .maybeSingle();
  const { data: moduloAlvo } = await admin
    .from("modulos")
    .select("id, titulo")
    .eq("titulo", "Técnicas de Compra e Venda")
    .maybeSingle();
  const { data: discAlvo } = await admin
    .from("disciplinas")
    .select("id, titulo")
    .eq("modulo_id", moduloAlvo.id)
    .limit(1)
    .maybeSingle();

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({
    viewport: { width: 1360, height: 900 },
    deviceScaleFactor: 2,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "light",
  });
  // O tour guiado abre sozinho no primeiro acesso de cada perfil — marcar
  // como "já visto" mantém as telas limpas pros prints.
  await contexto.addInitScript(() => {
    try {
      localStorage.setItem("csmg-tour-master-visto", "1");
      localStorage.setItem("csmg-tour-aluno-visto", "1");
    } catch {
      /* ignora */
    }
  });

  const page = await contexto.newPage();
  const ir = async (rota) => {
    await page.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load").catch(() => {});
    await page.waitForTimeout(700);
    await preparar(page, disfarce);
  };

  try {
    // ---------------------------------------------------------- 01 login
    if (querem("01")) {
      console.log("→ 01 login");
      await ir("/login");
      await marcar(page, [
        { sel: "#email", n: 1 },
        { sel: "#password", n: 2 },
        { sel: 'button[type="submit"]', n: 3, pos: "tr" },
        { sel: 'a[href="/primeiro-acesso"]', n: 4, pos: "bl" },
      ]);
      await tirar(page, "01-login", { inteira: false });
    }

    // -------------------------------------------------- 02 primeiro acesso
    if (querem("02")) {
      console.log("→ 02 primeiro acesso");
      await ir("/primeiro-acesso");
      await tirar(page, "02-primeiro-acesso", { inteira: false });
    }

    // ------------------------------------------------------------- entrar
    console.log("→ entrando como equipe…");
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#email", emailMaster);
    await page.fill("#password", senhaMaster);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(painel|master)/, { timeout: 40_000 });

    // ------------------------------------------------------- 03 cabeçalho
    if (querem("03")) {
      console.log("→ 03 cabeçalho");
      await ir("/master");
      await marcar(page, [
        { sel: 'a[href="/master"]', n: 1 },
        { sel: "nav", n: 2, idx: 0, pos: "bl" },
        { sel: 'a[href="/painel"]', n: 3 },
        { sel: "header button", n: 4, idx: 0 },
        { sel: "header button", n: 5, idx: 1, pos: "tr" },
        { sel: "header button", n: 6, idx: 2 },
        { sel: 'header form button[type="submit"]', n: 7, pos: "tr" },
      ]);
      await tirar(page, "03-cabecalho", { alturaMax: 210 });
    }

    // -------------------------------------------------------- 04 conteúdo
    if (querem("04")) {
      console.log("→ 04 conteúdo");
      await ir("/master");
      await marcar(page, [
        { sel: '[data-tour="master-modulos"] li', n: 1 },
        { sel: '[data-tour="master-modulos"] li button', n: 2, idx: 0, pos: "tr" },
        { sel: 'form input[name="titulo"]', n: 3 },
        { sel: 'form input[name="publicar_em"]', n: 4 },
        { sel: 'form button[type="submit"]', n: 5, idx: 1, pos: "tr" },
      ]);
      await tirar(page, "04-conteudo", { alturaMax: 1250 });
    }

    // ---------------------------------------------------------- 05 módulo
    if (querem("05")) {
      console.log("→ 05 módulo");
      await ir(`/master/modulos/${moduloAlvo.id}`);
      await marcar(page, [
        { sel: "ul li a", n: 1, idx: 0 },
        { sel: 'input[name="titulo"]', n: 2, idx: 1 },
        { sel: 'input[name="capa"]', n: 3 },
        { sel: 'input[name="publicar_em"]', n: 4 },
        { sel: 'input[name="publicado"]', n: 5, pos: "tr" },
        { sel: 'button[type="submit"]', n: 6, idx: 2, pos: "tr" },
      ]);
      await tirar(page, "05-modulo", { alturaMax: 1250 });
    }

    // ------------------------------------------------------ 06-11 disciplina
    if (querem("06") || querem("07") || querem("08") || querem("09") ||
        querem("10") || querem("11")) {
      console.log("→ 06..11 disciplina");
      await ir(`/master/disciplinas/${discAlvo.id}`);

      if (querem("06")) {
        await marcar(page, [
          { sel: 'input[name="titulo"]', n: 1 },
          { sel: 'textarea[name="descricao"]', n: 2 },
          { sel: 'input[name="publicado"]', n: 3, pos: "tr" },
        ]);
        await tirar(page, "06-disciplina-dados", { sel: "section", idx: 0 });
      }

      if (querem("07")) {
        await page.getByRole("button", { name: "+ Adicionar aula" }).click();
        await page.waitForTimeout(300);
        await preparar(page, disfarce);
        await marcar(page, [
          { sel: '[data-tour="master-aulas"] ul li', n: 1, idx: 0 },
          { sel: '[data-tour="master-aulas"] input[name="titulo"]', n: 2 },
          { sel: '[data-tour="master-aulas"] input[name="video_link"]', n: 3 },
          { sel: '[data-tour="master-aulas"] input[type="file"]', n: 4 },
        ]);
        await tirar(page, "07-aulas", { sel: '[data-tour="master-aulas"]' });
        await page.getByRole("button", { name: "Cancelar" }).first().click();
        await page.waitForTimeout(200);
      }

      if (querem("08")) {
        await page
          .locator('[data-tour="master-aulas"]')
          .getByRole("button", { name: "Editar" })
          .first()
          .click();
        await page.waitForTimeout(300);
        await preparar(page, disfarce);
        await marcar(page, [
          { sel: '[data-tour="master-aulas"] input[name="titulo"]', n: 1 },
          { sel: '[data-tour="master-aulas"] input[name="video_link"]', n: 2 },
          { sel: '[data-tour="master-aulas"] input[name="descricao"]', n: 3 },
          { sel: '[data-tour="master-aulas"] li form .border-dashed', n: 4 },
        ]);
        await tirar(page, "08-aula-editar", {
          sel: '[data-tour="master-aulas"] li',
        });
        await page
          .locator('[data-tour="master-aulas"]')
          .getByRole("button", { name: "Fechar" })
          .first()
          .click();
        await page.waitForTimeout(200);
      }

      if (querem("09")) {
        await page.getByRole("button", { name: "+ Adicionar material" }).click();
        await page.waitForTimeout(300);
        await preparar(page, disfarce);
        await marcar(page, [
          { sel: '[data-tour="master-materiais"] input[name="titulo"]', n: 1 },
          { sel: '[data-tour="master-materiais"] input[name="tipo"]', n: 2 },
          { sel: '[data-tour="master-materiais"] input[name="url"]', n: 3 },
        ]);
        await tirar(page, "09-materiais", {
          sel: '[data-tour="master-materiais"]',
        });
        await page.getByRole("button", { name: "Cancelar" }).first().click();
        await page.waitForTimeout(200);
      }

      if (querem("10")) {
        await page.getByRole("button", { name: "+ Adicionar conteúdo" }).click();
        await page.waitForTimeout(300);
        await preparar(page, disfarce);
        await marcar(page, [
          { sel: '[data-tour="master-conhecimento"] input[name="titulo"]', n: 1 },
          { sel: '[data-tour="master-conhecimento"] input[type="file"]', n: 2 },
          { sel: '[data-tour="master-conhecimento"] textarea[name="conteudo"]', n: 3 },
        ]);
        await tirar(page, "10-conhecimento-ia", {
          sel: '[data-tour="master-conhecimento"]',
        });
        await page.getByRole("button", { name: "Cancelar" }).first().click();
        await page.waitForTimeout(200);
      }

      if (querem("11")) {
        // Topo da seção: título, nota de corte e as perguntas já cadastradas.
        await marcar(page, [
          { sel: '[data-tour="master-avaliacao"] input[name="titulo"]', n: 1 },
          { sel: '[data-tour="master-avaliacao"] input[name="nota_minima"]', n: 2 },
          { sel: '[data-tour="master-avaliacao"] ul li', n: 3, idx: 0 },
        ]);
        await tirar(page, "11-avaliacao", {
          sel: '[data-tour="master-avaliacao"]',
          alturaMax: 820,
        });

        // Formulário de nova pergunta, aberto.
        await page.getByRole("button", { name: "+ Adicionar pergunta" }).click();
        await page.waitForTimeout(300);
        await preparar(page, disfarce);
        await marcar(page, [
          { sel: '[data-tour="master-avaliacao"] textarea[name="enunciado"]', n: 1 },
          { sel: '[data-tour="master-avaliacao"] input[name="alt_a"]', n: 2 },
          { sel: '[data-tour="master-avaliacao"] input[name="correta"]', n: 3, pos: "bl" },
        ]);
        await tirar(page, "11b-nova-pergunta", {
          sel: '[data-tour="master-avaliacao"] > .border-dashed',
        });
      }
    }

    // ----------------------------------------------------------- 12 alunos
    if (querem("12")) {
      console.log("→ 12 alunos");
      await ir("/master/alunos");
      await marcar(page, [
        { sel: 'input[name="q"]', n: 1 },
        { sel: 'a[href*="status="]', n: 2, pos: "bl" },
        { sel: "ul li a", n: 3, idx: 0 },
        { sel: "ul li", n: 4, idx: 0, pos: "tr" },
        { sel: "#aluno-nome", n: 5 },
      ]);
      await tirar(page, "12-alunos", { alturaMax: 1150 });
    }

    // ------------------------------------------------------------ 13 ficha
    if (querem("13") && alunoAtivo) {
      console.log("→ 13 ficha do aluno");
      await ir(`/master/alunos/${alunoAtivo.id}`);
      await marcar(page, [
        { sel: "section", n: 1, idx: 0 },
        { sel: "section", n: 2, idx: 1 },
        { sel: "div.grid.grid-cols-2", n: 3, pos: "tr" },
        { sel: "table", n: 4 },
      ]);
      await tirar(page, "13-ficha-aluno", { alturaMax: 1300 });
    }

    // ---------------------------------------------------------- 14 e-mails
    if (querem("14")) {
      console.log("→ 14 e-mails");
      await ir("/master/emails");
      // Por texto, não por índice: o primeiro form da página é o "Sair" do
      // cabeçalho, e a marcação caía nele.
      await marcar(page, [
        { sel: "div.grid > div", n: 1, idx: 0 },
        { sel: "button", texto: "Liberar inscrições", n: 2, pos: "tr" },
        { sel: "button", texto: "Conferir devoluções", n: 3, pos: "tr" },
        { sel: "table", n: 4 },
      ]);
      await tirar(page, "14-emails", { alturaMax: 1100 });
    }

    // ------------------------------------------------------------ 15 fórum
    if (querem("15")) {
      console.log("→ 15 moderação do fórum");
      // Post fictício só pra ilustrar a fila; some logo depois.
      const { data: autor } = await admin
        .from("inscricoes")
        .select("email")
        .not("ativado_em", "is", null)
        .limit(1)
        .maybeSingle();
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const autorId =
        users.users.find((u) => u.email === autor?.email)?.id ?? idMaster;
      const { data: post } = await admin
        .from("forum_posts")
        .insert({
          autor_id: autorId,
          disciplina_id: discAlvo.id,
          tipo: "duvida",
          titulo: "Como calculo a margem de lucro de um produto artesanal?",
          corpo:
            "Assisti a aula sobre precificação, mas fiquei na dúvida em como " +
            "entrar com o custo do meu tempo de trabalho na conta. Alguém pode " +
            "dar um exemplo prático? Meu contato é (21) 90000-0000.",
          status: "pendente",
          veredito_ia: "suspeito",
          motivo_ia: "a publicação contém um telefone pessoal",
        })
        .select("id")
        .single();
      idPostDemo = post?.id ?? null;

      await ir("/master/forum");
      await marcar(page, [
        { sel: "ul li p", n: 1, idx: 0 },
        { sel: "ul li h3", n: 2, idx: 0 },
        { sel: "ul li form button", n: 3, idx: 0, pos: "tr" },
        { sel: "ul li button[type=button]", n: 4, idx: 0, pos: "tr" },
      ]);
      await tirar(page, "15-forum-moderacao", { alturaMax: 620 });
    }

    // ------------------------------------------------------- 16/17 relatórios
    if (querem("16")) {
      console.log("→ 16 relatórios (inscrições)");
      await ir("/master/relatorios");
      await marcar(page, [
        { sel: 'nav a[href*="visao=turma"]', n: 1, pos: "tr" },
        { sel: "div.grid > div", n: 2, idx: 0 },
      ]);
      await tirar(page, "16-relatorios-inscricoes", { alturaMax: 1400 });
    }
    if (querem("17")) {
      console.log("→ 17 relatórios (turma)");
      await ir("/master/relatorios?visao=turma");
      await marcar(page, [
        { sel: "table", n: 1, idx: 0 },
      ]);
      await tirar(page, "17-relatorios-turma", { alturaMax: 1250 });
    }

    // ----------------------------------------------------------- 18 equipe
    if (querem("18")) {
      console.log("→ 18 equipe");
      await ir("/master/equipe");
      await marcar(page, [
        { sel: "ul > li", n: 1, idx: 0 },
        { sel: "#monitor-nome", n: 2 },
        { sel: "fieldset", n: 3 },
      ]);
      await tirar(page, "18-equipe", { alturaMax: 1250 });
    }

    // ---------------------------------------------------------- 19 eventos
    if (querem("19")) {
      console.log("→ 19 eventos");
      await ir("/master/eventos");
      await marcar(page, [
        { sel: 'input[name="q"]', n: 1 },
        { sel: 'a[href*="tipo="]', n: 2, idx: 1, pos: "bl" },
        { sel: "table", n: 3 },
      ]);
      await tirar(page, "19-eventos", { alturaMax: 1150 });
    }

    // ------------------------------------------------------- 20..23 aluno
    if (querem("20")) {
      console.log("→ 20 painel do aluno");
      await ir("/painel");
      await tirar(page, "20-painel-aluno", { alturaMax: 1300 });
    }
    if (querem("21")) {
      console.log("→ 21 disciplina do aluno");
      await page.goto(`${BASE}/painel`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      // Card do módulo → primeira disciplina → tela da aula.
      await page
        .locator('a[href^="/modulos/"]')
        .filter({ hasText: moduloAlvo.titulo })
        .first()
        .click();
      await page.waitForTimeout(1000);
      await page.locator('a[href^="/modulos/"]').first().click();
      await page.waitForTimeout(1500);
      await preparar(page, disfarce);
      await marcar(page, [
        { sel: "video, iframe", n: 1 },
      ]);
      await tirar(page, "21-disciplina-aluno", { alturaMax: 1500 });
    }
    if (querem("22")) {
      console.log("→ 22 fórum do aluno");
      await ir("/forum");
      await tirar(page, "22-forum-aluno", { alturaMax: 1200 });
    }
    if (querem("23")) {
      console.log("→ 23 assistente");
      await ir("/painel");
      const botao = page.locator('button[aria-label*="ssistente"], button[title*="ssistente"]');
      if (await botao.count()) {
        await botao.first().click();
        await page.waitForTimeout(900);
        await preparar(page, disfarce);
      }
      await tirar(page, "23-assistente", { inteira: false });
    }

    // ------------------------------------------------- 24 painel /relatorios
    if (querem("24")) {
      console.log("→ 24 painel de inscrições");
      await ir("/relatorios");
      await tirar(page, "24-painel-senha", { inteira: false });
    }
  } finally {
    await contexto.close();
    await navegador.close();
    console.log("→ limpando…");
    if (idPostDemo) await admin.from("forum_posts").delete().eq("id", idPostDemo);
    // Apaga a trilha de auditoria da conta temporária antes de removê-la
    // (depois do delete o ator_id vira nulo e não dá mais pra achar).
    if (idMaster) await admin.from("eventos").delete().eq("ator_id", idMaster);
    if (idMaster) await admin.auth.admin.deleteUser(idMaster);
    console.log("→ conta temporária e post de exemplo removidos.");
  }
}

principal().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
