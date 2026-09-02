// Levantamento de dados para o relatório executivo pós-lançamento.
// Uso: npx tsx --conditions=react-server scripts/relatorio-executivo-dados.ts
//
// Só lê. Escreve um JSON com todas as agregações em /tmp para o gerador do PDF.

export {}; // módulo isolado

process.loadEnvFile(".env.local");

const SAIDA = process.env.SAIDA_JSON ?? "/tmp/relatorio-dados.json";

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const fs = await import("node:fs/promises");
  const admin = createSupabaseAdminClient();

  const dados: Record<string, unknown> = {};

  // ── Inscrições ────────────────────────────────────────────────────────────
  const { data: inscricoes } = await admin
    .from("inscricoes")
    .select(
      "id, email, created_at, selecionado, ativado_em, turma, utm_source, utm_medium, utm_campaign",
    )
    .order("created_at");
  dados.inscricoes = inscricoes ?? [];

  // ── Turmas e plano de liberação de conteúdo por turma (0023 / 0026) ───────
  const { data: turmas } = await admin
    .from("turmas")
    .select("numero, nome, liberacao_em, conteudo_restrito, created_at")
    .order("numero");
  dados.turmas = turmas ?? [];
  dados.turma_modulos = await paginar(admin, "turma_modulos", "turma, modulo_id, liberacao_em").catch(
    () => [],
  );

  // ── Usuários do Auth (alunos + equipe) ────────────────────────────────────
  const usuarios: Array<Record<string, unknown>> = [];
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw error;
    if (!data.users.length) break;
    for (const u of data.users) {
      usuarios.push({
        id: u.id,
        email: u.email,
        papel: (u.app_metadata as { role?: string } | null)?.role ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        confirmado: Boolean(u.email_confirmed_at ?? u.confirmed_at),
      });
    }
    if (data.users.length < 200) break;
  }
  dados.usuarios = usuarios;

  // ── Catálogo: módulos → disciplinas → aulas/quizzes ───────────────────────
  const [{ data: modulos }, { data: disciplinas }, { data: aulas }, { data: quizzes }, { data: materiais }] =
    await Promise.all([
      admin.from("modulos").select("id, titulo, ordem, publicado").order("ordem"),
      admin.from("disciplinas").select("id, modulo_id, titulo, slug, ordem, publicado").order("ordem"),
      admin
        .from("aulas")
        .select("id, disciplina_id, titulo, ordem, provider, duracao_seg, video_status")
        .order("ordem"),
      admin.from("quizzes").select("id, disciplina_id, titulo"),
      admin.from("materiais").select("id, disciplina_id"),
    ]);
  dados.modulos = modulos ?? [];
  dados.disciplinas = disciplinas ?? [];
  dados.aulas = aulas ?? [];
  dados.quizzes = quizzes ?? [];
  dados.materiais = materiais ?? [];

  // ── Progresso (paginado: pode passar de 1000 linhas) ──────────────────────
  dados.progresso = await paginar(admin, "progresso_aula", "aluno_id, aula_id, assistida_em");
  dados.tentativas = await paginar(
    admin,
    "quiz_tentativas",
    "id, aluno_id, quiz_id, nota, aprovado, created_at",
  );

  // ── Fórum ─────────────────────────────────────────────────────────────────
  dados.forum_posts = await paginar(
    admin,
    "forum_posts",
    "id, autor_id, status, created_at, tipo",
  ).catch(() => []);
  dados.forum_respostas = await paginar(admin, "forum_respostas", "id, autor_id, created_at").catch(
    () => [],
  );

  // ── E-mails, eventos, IA, feedback, visitas ───────────────────────────────
  dados.envios_email = await paginar(admin, "envios_email", "id, email, tipo, status, created_at").catch(
    () => [],
  );
  dados.eventos = await paginar(admin, "eventos", "id, ator_id, ator_papel, acao, created_at").catch(
    () => [],
  );
  dados.ia_mensagens = await paginar(admin, "ia_mensagens", "id, aluno_id, created_at").catch(() => []);
  dados.avaliacoes = await paginar(
    admin,
    "avaliacoes_disciplina",
    "id, disciplina_id, aluno_id, estrelas, comentario, created_at",
  ).catch(() => []);
  dados.visitas = await paginar(admin, "visitas_landing", "id, created_at, utm_source, utm_medium").catch(
    () => [],
  );

  // ── Engenharia: o que foi construído, medido no próprio repositório ───────
  dados.engenharia = await levantarEngenharia();

  dados.gerado_em = new Date().toISOString();

  await fs.writeFile(SAIDA, JSON.stringify(dados, null, 2));

  for (const [chave, valor] of Object.entries(dados)) {
    if (Array.isArray(valor)) console.log(`${chave}: ${valor.length}`);
  }
  console.log(`\nJSON escrito em ${SAIDA}`);
}

// Mede o esforço de construção direto no repositório: histórico do git,
// volume de código por área e inventário de testes/migrações/rotas.
async function levantarEngenharia() {
  const { execFileSync } = await import("node:child_process");
  const fs = await import("node:fs");
  const path = await import("node:path");

  const git = (args: string[]) =>
    execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim();

  const linhas = git(["log", "--reverse", "--format=%ad\t%an\t%s", "--date=short"]).split("\n");
  const commits = linhas.map((l) => {
    const [data, autor, ...resto] = l.split("\t");
    return { data, autor, assunto: resto.join("\t") };
  });

  const porMes: Record<string, number> = {};
  const porTipo: Record<string, number> = {};
  const porAutor: Record<string, number> = {};
  for (const c of commits) {
    const mes = c.data.slice(0, 7);
    porMes[mes] = (porMes[mes] ?? 0) + 1;
    porAutor[c.autor] = (porAutor[c.autor] ?? 0) + 1;
    const tipo = /^([a-z]+)(\([^)]*\))?:/.exec(c.assunto)?.[1] ?? "outros";
    porTipo[tipo] = (porTipo[tipo] ?? 0) + 1;
  }

  // Linhas de código por área do projeto.
  const EXTS = new Set([".ts", ".tsx", ".sql", ".py", ".mjs", ".sh", ".css"]);
  const contar = (raiz: string) => {
    let arquivos = 0;
    let linhasTotal = 0;
    const andar = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (item.name === "node_modules" || item.name.startsWith(".")) continue;
          andar(p);
        } else if (EXTS.has(path.extname(item.name))) {
          arquivos++;
          linhasTotal += fs.readFileSync(p, "utf8").split("\n").length;
        }
      }
    };
    andar(raiz);
    return { arquivos, linhas: linhasTotal };
  };

  const areas = {
    "Telas e rotas (app)": contar("src/app"),
    "Componentes de interface": contar("src/components"),
    "Regras de negócio (lib)": contar("src/lib"),
    "Banco de dados (SQL)": contar("supabase"),
    "Automação e operação": contar("scripts"),
    "Testes de ponta a ponta": contar("e2e"),
  };

  const arquivosDe = (raiz: string, filtro: (n: string) => boolean) => {
    const achados: string[] = [];
    const andar = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (item.name === "node_modules" || item.name.startsWith(".")) continue;
          andar(p);
        } else if (filtro(item.name)) achados.push(p);
      }
    };
    andar(raiz);
    return achados;
  };

  return {
    commits: commits.length,
    primeiro: commits[0]?.data ?? null,
    ultimo: commits.at(-1)?.data ?? null,
    por_mes: porMes,
    por_tipo: porTipo,
    por_autor: porAutor,
    areas,
    migracoes: fs.existsSync("supabase/migrations")
      ? fs.readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).length
      : 0,
    testes_unitarios: arquivosDe("src", (n) => /\.test\.tsx?$/.test(n)).length,
    testes_e2e: arquivosDe("e2e", (n) => /\.spec\.ts$/.test(n)).length,
    paginas: arquivosDe("src/app", (n) => n === "page.tsx").length,
    rotas_api: arquivosDe("src/app", (n) => n === "route.ts").length,
    marcos: commits
      .filter((c) => /^(feat|docs)\(?/.test(c.assunto))
      .map((c) => ({ data: c.data, assunto: c.assunto })),
  };
}

// O PostgREST devolve no máximo 1000 linhas por chamada; percorre em páginas.
type ClientePaginavel = {
  from: (tabela: string) => {
    select: (colunas: string) => {
      range: (
        de: number,
        ate: number,
      ) => PromiseLike<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
  };
};

async function paginar(
  admin: ClientePaginavel,
  tabela: string,
  colunas: string,
): Promise<Array<Record<string, unknown>>> {
  const tudo: Array<Record<string, unknown>> = [];
  const tamanho = 1000;
  for (let pagina = 0; pagina < 100; pagina++) {
    const de = pagina * tamanho;
    const { data, error } = await admin.from(tabela).select(colunas).range(de, de + tamanho - 1);
    if (error) {
      console.warn(`  (aviso) ${tabela}: ${error.message}`);
      return tudo;
    }
    tudo.push(...(data ?? []));
    if (!data || data.length < tamanho) break;
  }
  return tudo;
}

void main();
