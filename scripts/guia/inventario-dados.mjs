// Levanta o inventário do banco pro documento técnico: colunas e volume de
// cada tabela. Imprime SÓ nomes de coluna e contagens — nenhum dado.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
  { auth: { persistSession: false } },
);

const TABELAS = [
  "inscricoes", "modulos", "disciplinas", "aulas", "materiais",
  "quizzes", "quiz_perguntas", "quiz_alternativas", "quiz_tentativas",
  "progresso_aula", "disciplina_conhecimento", "disciplina_chunks",
  "ia_mensagens", "forum_posts", "forum_respostas", "forum_enquete_opcoes",
  "forum_votos_posts", "forum_votos_respostas", "forum_votos_enquete",
  "perfis", "eventos", "envios_email", "visitas_landing", "video_jobs",
  "avaliacoes_disciplina",
];

for (const t of TABELAS) {
  const { data, error } = await admin.from(t).select("*").limit(1);
  const { count } = await admin
    .from(t)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.log(`${t}\tERRO: ${error.message}`);
    continue;
  }
  const colunas = data?.[0] ? Object.keys(data[0]).join(", ") : "(sem linhas)";
  console.log(`${t}\t[${count ?? 0} linhas]\t${colunas}`);
}
