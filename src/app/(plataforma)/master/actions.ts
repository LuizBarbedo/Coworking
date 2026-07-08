"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirMaster } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// ─── utilidades ──────────────────────────────────────────────────────────────
function slugify(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

type Admin = ReturnType<typeof createSupabaseAdminClient>;

async function slugModuloUnico(admin: Admin, base: string): Promise<string> {
  let slug = base;
  let n = 1;
  // Tenta base, base-2, base-3… até achar um livre.
  // (loop pequeno; catálogo de módulos é curto)
  while (true) {
    const { data } = await admin
      .from("modulos")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function slugDisciplinaUnico(
  admin: Admin,
  moduloId: string,
  base: string,
): Promise<string> {
  let slug = base;
  let n = 1;
  while (true) {
    const { data } = await admin
      .from("disciplinas")
      .select("id")
      .eq("modulo_id", moduloId)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function proximaOrdem(
  admin: Admin,
  tabela: string,
  campo: string,
  valor: string,
): Promise<number> {
  const { data } = await admin
    .from(tabela)
    .select("ordem")
    .eq(campo, valor)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.ordem as number | undefined) ?? 0) + 1;
}

/** Detecta o provedor de vídeo a partir do link colado pelo master. */
function classificarVideo(link: string): { provider: string; uid: string | null } {
  const v = link.trim();
  if (!v) return { provider: "youtube", uid: null };
  if (/youtube\.com|youtu\.be/.test(v)) return { provider: "youtube", uid: v };
  if (/^https?:\/\//.test(v)) return { provider: "url", uid: v };
  // Sem esquema: assume ID de YouTube ou UID de Cloudflare.
  return { provider: "youtube", uid: v };
}

// ─── módulos ─────────────────────────────────────────────────────────────────
export async function criarModulo(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const instrutor = String(formData.get("instrutor") ?? "").trim() || null;

  const slug = await slugModuloUnico(admin, slugify(titulo));
  const { data, error } = await admin
    .from("modulos")
    .insert({ slug, titulo, descricao, instrutor, ordem: 0, publicado: false })
    .select("id")
    .single();

  if (error || !data) return;
  revalidatePath("/master");
  redirect(`/master/modulos/${data.id}`);
}

export async function atualizarModulo(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;

  await admin
    .from("modulos")
    .update({
      titulo,
      descricao: String(formData.get("descricao") ?? "").trim() || null,
      instrutor: String(formData.get("instrutor") ?? "").trim() || null,
      publicado: formData.get("publicado") === "on",
    })
    .eq("id", id);

  revalidatePath(`/master/modulos/${id}`);
  revalidatePath("/master");
}

export async function excluirModulo(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await admin.from("modulos").delete().eq("id", id);
  revalidatePath("/master");
  redirect("/master");
}

// ─── disciplinas ─────────────────────────────────────────────────────────────
export async function criarDisciplina(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();

  const moduloId = String(formData.get("modulo_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!moduloId || !titulo) return;

  const slug = await slugDisciplinaUnico(admin, moduloId, slugify(titulo));
  const ordem = await proximaOrdem(admin, "disciplinas", "modulo_id", moduloId);
  const { data } = await admin
    .from("disciplinas")
    .insert({
      modulo_id: moduloId,
      slug,
      titulo,
      descricao: String(formData.get("descricao") ?? "").trim() || null,
      ordem,
      publicado: true,
    })
    .select("id")
    .single();

  revalidatePath(`/master/modulos/${moduloId}`);
  if (data) redirect(`/master/disciplinas/${data.id}`);
}

export async function atualizarDisciplina(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!id || !titulo) return;

  await admin
    .from("disciplinas")
    .update({
      titulo,
      descricao: String(formData.get("descricao") ?? "").trim() || null,
      publicado: formData.get("publicado") === "on",
    })
    .eq("id", id);

  revalidatePath(`/master/disciplinas/${id}`);
}

export async function excluirDisciplina(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  const moduloId = String(formData.get("modulo_id") ?? "");
  if (!id) return;
  await admin.from("disciplinas").delete().eq("id", id);
  revalidatePath(`/master/modulos/${moduloId}`);
  if (moduloId) redirect(`/master/modulos/${moduloId}`);
}

// ─── aulas ───────────────────────────────────────────────────────────────────
export async function criarAula(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();

  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!disciplinaId || !titulo) return;

  const { provider, uid } = classificarVideo(
    String(formData.get("video_link") ?? ""),
  );
  const ordem = await proximaOrdem(admin, "aulas", "disciplina_id", disciplinaId);

  await admin.from("aulas").insert({
    disciplina_id: disciplinaId,
    titulo,
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    provider,
    video_uid: uid,
    ordem,
  });

  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

export async function excluirAula(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  if (!id) return;
  await admin.from("aulas").delete().eq("id", id);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

// ─── materiais ───────────────────────────────────────────────────────────────
export async function criarMaterial(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();

  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!disciplinaId || !titulo || !url) return;

  const ordem = await proximaOrdem(
    admin,
    "materiais",
    "disciplina_id",
    disciplinaId,
  );
  await admin.from("materiais").insert({
    disciplina_id: disciplinaId,
    titulo,
    tipo: String(formData.get("tipo") ?? "pdf").trim() || "pdf",
    url,
    ordem,
  });

  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

export async function excluirMaterial(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  if (!id) return;
  await admin.from("materiais").delete().eq("id", id);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

// ─── quiz (avaliação) ────────────────────────────────────────────────────────
/** Garante que a disciplina tenha um quiz e devolve o id. */
async function garantirQuiz(admin: Admin, disciplinaId: string): Promise<string> {
  const { data: existente } = await admin
    .from("quizzes")
    .select("id")
    .eq("disciplina_id", disciplinaId)
    .maybeSingle();
  if (existente) return existente.id as string;
  const { data } = await admin
    .from("quizzes")
    .insert({ disciplina_id: disciplinaId, titulo: "Avaliação final", nota_minima: 70 })
    .select("id")
    .single();
  return data!.id as string;
}

export async function atualizarQuiz(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  if (!disciplinaId) return;
  const quizId = await garantirQuiz(admin, disciplinaId);
  const nota = Number(formData.get("nota_minima") ?? 70);
  await admin
    .from("quizzes")
    .update({
      titulo: String(formData.get("titulo") ?? "Avaliação final").trim(),
      nota_minima: Number.isFinite(nota) ? Math.max(0, Math.min(100, nota)) : 70,
    })
    .eq("id", quizId);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

export async function criarPergunta(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();

  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  const enunciado = String(formData.get("enunciado") ?? "").trim();
  const correta = String(formData.get("correta") ?? ""); // 'a'..'e'
  if (!disciplinaId || !enunciado || !correta) return;

  // Alternativas não vazias, na ordem A..E.
  const letras = ["a", "b", "c", "d", "e"];
  const alternativas = letras
    .map((letra) => ({
      letra,
      texto: String(formData.get(`alt_${letra}`) ?? "").trim(),
    }))
    .filter((a) => a.texto);

  if (alternativas.length < 2) return; // precisa de ao menos 2 opções
  if (!alternativas.some((a) => a.letra === correta)) return; // correta precisa ter texto

  const quizId = await garantirQuiz(admin, disciplinaId);
  const ordem = await proximaOrdem(admin, "quiz_perguntas", "quiz_id", quizId);

  const { data: pergunta } = await admin
    .from("quiz_perguntas")
    .insert({ quiz_id: quizId, enunciado, ordem })
    .select("id")
    .single();
  if (!pergunta) return;

  await admin.from("quiz_alternativas").insert(
    alternativas.map((a, i) => ({
      pergunta_id: pergunta.id,
      texto: a.texto,
      correta: a.letra === correta,
      ordem: i + 1,
    })),
  );

  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

export async function excluirPergunta(formData: FormData) {
  await exigirMaster();
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  if (!id) return;
  await admin.from("quiz_perguntas").delete().eq("id", id);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}
