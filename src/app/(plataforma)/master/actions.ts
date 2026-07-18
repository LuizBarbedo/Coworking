"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reconstruirChunks } from "@/lib/ia/conhecimento";
import { extrairTextoDeArquivo } from "@/lib/ia/extrair-texto";
import {
  chaveAula,
  chaveOriginal,
  urlUploadOriginal,
} from "@/lib/r2";
import { classificarVideo, resolverVideoAoAtualizar } from "@/lib/video";

/**
 * Reconstrói o índice do assistente de IA da disciplina. Best-effort: uma falha
 * aqui nunca deve derrubar a operação principal do master.
 */
async function reindexarIA(admin: Admin, disciplinaId: string): Promise<void> {
  try {
    await reconstruirChunks(admin, disciplinaId);
  } catch {
    // Índice desatualizado é tolerável; o master pode salvar de novo.
  }
}

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


// ─── módulos ─────────────────────────────────────────────────────────────────
export async function criarModulo(formData: FormData) {
  await exigirPermissao("editar_conteudo");
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
  await exigirPermissao("editar_conteudo");
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
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await admin.from("modulos").delete().eq("id", id);
  revalidatePath("/master");
  redirect("/master");
}

// ─── disciplinas ─────────────────────────────────────────────────────────────
export async function criarDisciplina(formData: FormData) {
  await exigirPermissao("editar_conteudo");
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
  await exigirPermissao("editar_conteudo");
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

  await reindexarIA(admin, id);
  revalidatePath(`/master/disciplinas/${id}`);
}

export async function excluirDisciplina(formData: FormData) {
  await exigirPermissao("editar_conteudo");
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
  await exigirPermissao("editar_conteudo");
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

  await reindexarIA(admin, disciplinaId);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

/**
 * Cria uma aula e retorna o id — usado pelo formulário client de adicionar
 * aula, que pode em seguida enviar um arquivo de vídeo para essa aula.
 */
export async function criarAulaComId(
  disciplinaId: string,
  titulo: string,
  descricao: string,
  link: string,
): Promise<{ id: string } | { erro: string }> {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();
  if (!disciplinaId || !titulo.trim()) return { erro: "Informe o título da aula." };

  const { provider, uid } = classificarVideo(link);
  const ordem = await proximaOrdem(admin, "aulas", "disciplina_id", disciplinaId);
  const { data, error } = await admin
    .from("aulas")
    .insert({
      disciplina_id: disciplinaId,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      provider,
      video_uid: uid,
      ordem,
    })
    .select("id")
    .single();
  if (error || !data) return { erro: "Não foi possível criar a aula." };

  await reindexarIA(admin, disciplinaId);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
  return { id: data.id as string };
}

export async function atualizarAula(formData: FormData) {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();

  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!id || !titulo) return;

  // Link vazio não pode apagar um vídeo hospedado (r2) — o campo de link
  // fica em branco nessas aulas e "salvar" não significa "remover o vídeo".
  const { data: atual } = await admin
    .from("aulas")
    .select("provider, video_uid")
    .eq("id", id)
    .maybeSingle();
  const { provider, video_uid } = resolverVideoAoAtualizar(
    String(formData.get("video_link") ?? ""),
    (atual as { provider: string; video_uid: string | null } | null) ??
      undefined,
  );

  await admin
    .from("aulas")
    .update({
      titulo,
      descricao: String(formData.get("descricao") ?? "").trim() || null,
      provider,
      video_uid,
    })
    .eq("id", id);

  await reindexarIA(admin, disciplinaId);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

export async function excluirAula(formData: FormData) {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  if (!id) return;
  await admin.from("aulas").delete().eq("id", id);
  await reindexarIA(admin, disciplinaId);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

// ─── upload de vídeo (Cloudflare R2 + transcodificação) ───────────────────────

const TIPOS_VIDEO = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-msvideo",
]);

/**
 * Passo 1 do upload: devolve uma URL assinada para o navegador enviar o vídeo
 * ORIGINAL direto para o R2 (contorna o limite de corpo da Vercel).
 */
export async function iniciarUploadVideo(
  aulaId: string,
  nomeArquivo: string,
  contentType: string,
): Promise<{ url: string; chave: string } | { erro: string }> {
  await exigirPermissao("editar_conteudo");
  if (!aulaId || !nomeArquivo) return { erro: "Aula ou arquivo inválido." };
  if (!TIPOS_VIDEO.has(contentType)) {
    return { erro: "Envie um arquivo de vídeo (MP4, MOV, WEBM, MKV ou AVI)." };
  }
  const chave = chaveOriginal(aulaId, nomeArquivo);
  const url = await urlUploadOriginal(chave, contentType, 3600);
  return { url, chave };
}

/**
 * Passo 2: o original já está no R2. Registra o job e dispara a
 * transcodificação SOB DEMANDA na Modal, marcando a aula como "processando".
 * A Modal gera a versão 720p + thumbnail e marca "pronta" via webhook.
 */
export async function finalizarUploadVideo(
  aulaId: string,
  chaveOriginalArq: string,
  disciplinaId: string,
): Promise<void> {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();
  if (!aulaId || !chaveOriginalArq) return;

  await admin
    .from("aulas")
    .update({
      provider: "r2",
      video_uid: chaveAula(aulaId), // chave final que a Modal vai produzir
      video_status: "processando",
      video_pronto_em: null,
    })
    .eq("id", aulaId);

  const { data: job } = await admin
    .from("video_jobs")
    .insert({ aula_id: aulaId, chave_original: chaveOriginalArq, status: "processando" })
    .select("id")
    .single();

  // Dispara a transcodificação na Modal SOB DEMANDA (sem polling).
  const url = process.env.MODAL_TRANSCODE_URL;
  const segredo = process.env.VIDEO_WEBHOOK_SECRET;
  if (url && segredo) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: segredo,
          jobId: job?.id,
          aulaId,
          chaveOriginal: chaveOriginalArq,
        }),
      });
    } catch {
      // Se a Modal não responder, a aula fica "processando"; o master reenvia.
    }
  }

  if (disciplinaId) revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

// ─── materiais ───────────────────────────────────────────────────────────────
export async function criarMaterial(formData: FormData) {
  await exigirPermissao("editar_conteudo");
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

  await reindexarIA(admin, disciplinaId);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

export async function atualizarMaterial(formData: FormData) {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();

  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!id || !titulo || !url) return;

  await admin
    .from("materiais")
    .update({
      titulo,
      tipo: String(formData.get("tipo") ?? "pdf").trim() || "pdf",
      url,
    })
    .eq("id", id);

  await reindexarIA(admin, disciplinaId);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

export async function excluirMaterial(formData: FormData) {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  if (!id) return;
  await admin.from("materiais").delete().eq("id", id);
  await reindexarIA(admin, disciplinaId);
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
  await exigirPermissao("editar_conteudo");
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
  await exigirPermissao("editar_conteudo");
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

export async function atualizarPergunta(formData: FormData) {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();

  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  const enunciado = String(formData.get("enunciado") ?? "").trim();
  const correta = String(formData.get("correta") ?? "");
  if (!id || !enunciado || !correta) return;

  const letras = ["a", "b", "c", "d", "e"];
  const alternativas = letras
    .map((letra) => ({
      letra,
      texto: String(formData.get(`alt_${letra}`) ?? "").trim(),
    }))
    .filter((a) => a.texto);

  if (alternativas.length < 2) return;
  if (!alternativas.some((a) => a.letra === correta)) return;

  await admin.from("quiz_perguntas").update({ enunciado }).eq("id", id);
  // Substitui as alternativas por completo (mais simples e consistente).
  await admin.from("quiz_alternativas").delete().eq("pergunta_id", id);
  await admin.from("quiz_alternativas").insert(
    alternativas.map((a, i) => ({
      pergunta_id: id,
      texto: a.texto,
      correta: a.letra === correta,
      ordem: i + 1,
    })),
  );

  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

export async function excluirPergunta(formData: FormData) {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  if (!id) return;
  await admin.from("quiz_perguntas").delete().eq("id", id);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

// ─── base de conhecimento da IA ────────────────────────────────────────────────
const BUCKET_CONHECIMENTO = "conhecimento";

type MetaArquivo = {
  arquivo_nome: string;
  arquivo_path: string;
  arquivo_mime: string | null;
  arquivo_tamanho: number;
};

/** Envia o arquivo ao Storage privado e devolve os metadados (ou null se falhar). */
async function subirArquivoConhecimento(
  admin: Admin,
  disciplinaId: string,
  arquivo: File,
): Promise<MetaArquivo | null> {
  const seguro = arquivo.name.replace(/[^\w.\-]+/g, "_").slice(-100) || "arquivo";
  const path = `${disciplinaId}/${randomUUID()}-${seguro}`;
  const buffer = Buffer.from(await arquivo.arrayBuffer());

  const { error } = await admin.storage
    .from(BUCKET_CONHECIMENTO)
    .upload(path, buffer, {
      contentType: arquivo.type || "application/octet-stream",
      upsert: false,
    });
  if (error) return null;

  return {
    arquivo_nome: arquivo.name,
    arquivo_path: path,
    arquivo_mime: arquivo.type || null,
    arquivo_tamanho: arquivo.size,
  };
}

/** Remove um arquivo do Storage (best-effort). */
async function removerArquivoConhecimento(
  admin: Admin,
  path: string | null | undefined,
): Promise<void> {
  if (!path) return;
  await admin.storage.from(BUCKET_CONHECIMENTO).remove([path]);
}

/**
 * Prepara uma linha da base de conhecimento a partir do formulário: junta o
 * texto colado com o texto extraído do arquivo (para a IA) e sobe o arquivo
 * original ao Storage (para consulta/download). A entrada é válida se tiver ao
 * menos texto OU um arquivo.
 */
async function prepararConhecimento(
  admin: Admin,
  disciplinaId: string,
  formData: FormData,
): Promise<{ titulo: string; conteudo: string; meta: MetaArquivo | null } | null> {
  let titulo = String(formData.get("titulo") ?? "").trim();
  const textoColado = String(formData.get("conteudo") ?? "").trim();

  let textoArquivo = "";
  let meta: MetaArquivo | null = null;

  const arquivo = formData.get("arquivo");
  if (arquivo instanceof File && arquivo.size > 0) {
    meta = await subirArquivoConhecimento(admin, disciplinaId, arquivo);
    try {
      textoArquivo = (await extrairTextoDeArquivo(arquivo)).trim();
    } catch {
      // Arquivo sem texto extraível (ex.: PDF escaneado): guardamos só o arquivo.
      textoArquivo = "";
    }
    if (!titulo) titulo = arquivo.name.replace(/\.[^.]+$/, "").trim();
  }

  const conteudo = [textoColado, textoArquivo].filter(Boolean).join("\n\n");

  // Precisa de um título e de algum conteúdo (texto ou arquivo).
  if (!titulo || (!conteudo && !meta)) {
    if (meta) await removerArquivoConhecimento(admin, meta.arquivo_path);
    return null;
  }
  return { titulo, conteudo, meta };
}

export async function criarConhecimento(formData: FormData) {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();

  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  if (!disciplinaId) return;
  const dados = await prepararConhecimento(admin, disciplinaId, formData);
  if (!dados) return;

  const ordem = await proximaOrdem(
    admin,
    "disciplina_conhecimento",
    "disciplina_id",
    disciplinaId,
  );
  await admin.from("disciplina_conhecimento").insert({
    disciplina_id: disciplinaId,
    titulo: dados.titulo,
    conteudo: dados.conteudo,
    ordem,
    ...(dados.meta ?? {}),
  });

  await reindexarIA(admin, disciplinaId);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

export async function atualizarConhecimento(formData: FormData) {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();

  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  if (!id) return;
  const dados = await prepararConhecimento(admin, disciplinaId, formData);
  if (!dados) return;

  // Anexou um arquivo novo? Remove o antigo do Storage antes de substituir.
  if (dados.meta) {
    const { data: antigo } = await admin
      .from("disciplina_conhecimento")
      .select("arquivo_path")
      .eq("id", id)
      .maybeSingle();
    await removerArquivoConhecimento(
      admin,
      antigo?.arquivo_path as string | null,
    );
  }

  await admin
    .from("disciplina_conhecimento")
    .update({
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      updated_at: new Date().toISOString(),
      ...(dados.meta ?? {}),
    })
    .eq("id", id);

  await reindexarIA(admin, disciplinaId);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}

export async function excluirConhecimento(formData: FormData) {
  await exigirPermissao("editar_conteudo");
  const admin = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "");
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  if (!id) return;

  const { data: linha } = await admin
    .from("disciplina_conhecimento")
    .select("arquivo_path")
    .eq("id", id)
    .maybeSingle();

  await admin.from("disciplina_conhecimento").delete().eq("id", id);
  await removerArquivoConhecimento(admin, linha?.arquivo_path as string | null);
  await reindexarIA(admin, disciplinaId);
  revalidatePath(`/master/disciplinas/${disciplinaId}`);
}
