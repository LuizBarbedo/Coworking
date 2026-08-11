// Carga de um lote de conteúdo (e-books + quiz + videoaulas) nas disciplinas já
// criadas, fora do Next. Roda na VPS, a partir da raiz do projeto:
//
//   simulação (não grava nada):
//     npx tsx --conditions=react-server scripts/carregar-lote-conteudo.ts --simular
//   carga de verdade:
//     npx tsx --conditions=react-server scripts/carregar-lote-conteudo.ts
//
// O JSON de entrada (--dados, padrão conteudo/lote.json) sai de
// scripts/preparar-lote-quizzes.mjs; as aulas entram por --aulas (JSON gerado a
// partir das transcrições, ver scripts/transcrever-aulas.py).
//
// Reusa o mesmo caminho do master: extrairTextoDeArquivo pro texto da IA e
// reconstruirChunks no fim de cada disciplina.
//
// IDEMPOTENTE: cada etapa confere o que já existe (aula por video_uid, material
// por título, documento de IA por título, pergunta por enunciado) e pula. Rodar
// de novo depois de uma falha não duplica nada.
//
// A "Explicação" do gabarito fica de fora de propósito: não há coluna no schema
// e, se entrasse na base da IA, o assistente entregaria as respostas ao aluno.

process.loadEnvFile(".env.local");

import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

const SIMULAR = process.argv.includes("--simular");
const arg = (nome: string, padrao: string) => {
  const i = process.argv.indexOf(nome);
  return i === -1 ? padrao : (process.argv[i + 1] ?? padrao);
};
const CAMINHO_DADOS = arg("--dados", "conteudo/lote.json");
const CAMINHO_AULAS = arg("--aulas", "conteudo/aulas.json");

type PerguntaJson = {
  numero: number;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  correta: string;
};

type EbookJson = { arquivo: string; titulo: string };

type DisciplinaJson = {
  modulo_ordem: number;
  ebooks: EbookJson[];
  perguntas: PerguntaJson[];
};

/** Videoaulas por ordem de módulo, na ordem em que o professor gravou. */
type AulaJson = { titulo: string; descricao?: string; url: string };

const MIMES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

/** Extensão → mime e rótulo do selo que o aluno vê na aba Materiais. */
function tipoDoArquivo(nome: string) {
  const ext = extname(nome).toLowerCase();
  return { ext, mime: MIMES[ext] ?? "application/octet-stream", selo: ext.slice(1) || "arquivo" };
}

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { reconstruirChunks } = await import("@/lib/ia/conhecimento");
  const { extrairTextoDeArquivo } = await import("@/lib/ia/extrair-texto");
  const { classificarVideo } = await import("@/lib/video");

  const admin = createSupabaseAdminClient();
  const lote: DisciplinaJson[] = JSON.parse(await readFile(CAMINHO_DADOS, "utf8"));

  // As aulas são opcionais: dá pra carregar quiz e e-book antes de as
  // transcrições ficarem prontas, e rodar de novo depois só pelas aulas.
  let aulasPorModulo: Record<number, AulaJson[]> = {};
  try {
    aulasPorModulo = JSON.parse(await readFile(CAMINHO_AULAS, "utf8"));
  } catch {
    console.log(`(sem ${CAMINHO_AULAS} — nenhuma aula será criada nesta rodada)\n`);
  }

  if (SIMULAR) console.log("MODO SIMULAÇÃO — nada é gravado.\n");

  for (const item of lote) {
    // ── disciplina de destino ────────────────────────────────────────────────
    const { data: modulo } = await admin
      .from("modulos")
      .select("id, titulo, publicado")
      .eq("ordem", item.modulo_ordem)
      .single();
    if (!modulo) {
      console.error(`[${item.modulo_ordem}] módulo não encontrado — pulando.`);
      continue;
    }

    const { data: disciplina } = await admin
      .from("disciplinas")
      .select("id, titulo")
      .eq("modulo_id", modulo.id)
      .order("ordem")
      .limit(1)
      .maybeSingle();
    if (!disciplina) {
      console.error(`[${item.modulo_ordem}] ${modulo.titulo}: sem disciplina — pulando.`);
      continue;
    }

    console.log(`\n[${item.modulo_ordem}] ${disciplina.titulo}`);
    const discId = disciplina.id as string;

    // ── e-books: bucket público "materiais" + linha em materiais ─────────────
    const { data: materiaisExistentes } = await admin
      .from("materiais")
      .select("id, titulo, url")
      .eq("disciplina_id", discId);

    // Material cadastrado com caminho de arquivo local em vez de URL (acontece
    // ao colar o caminho do PC no formulário) não abre pro aluno: descarta.
    const quebrados = (materiaisExistentes ?? []).filter(
      (m) => !/^https?:\/\//.test(String(m.url ?? "").replace(/^"/, "")),
    );
    for (const m of quebrados) {
      console.log(`   material quebrado (URL não é link): "${m.titulo}" — removido`);
      if (!SIMULAR) await admin.from("materiais").delete().eq("id", m.id);
    }

    const validos = (materiaisExistentes ?? []).filter(
      (m) => !quebrados.some((q) => q.id === m.id),
    );
    let ordemMaterial = validos.length;

    // Guardado pra reusar no passo da base da IA (evita reler os arquivos).
    const lidos: { ebook: EbookJson; bytes: Buffer; nome: string }[] = [];

    for (const ebook of item.ebooks) {
      const bytes = await readFile(ebook.arquivo);
      const nome = basename(ebook.arquivo);
      const { ext, mime, selo } = tipoDoArquivo(nome);
      lidos.push({ ebook, bytes, nome });

      const chave = `ebooks/${discId}/${nome.replace(/[^\w.\-]+/g, "_")}`;
      const urlPublica =
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/materiais/${chave}`;

      if (validos.some((m) => m.titulo === ebook.titulo || m.url === urlPublica)) {
        console.log(`   material "${ebook.titulo}": já existe — pulado`);
        continue;
      }
      if (SIMULAR) {
        console.log(
          `   material "${ebook.titulo}": subiria ${nome} (${bytes.length} bytes, ${ext}) → ${chave}`,
        );
        continue;
      }

      const { error: erroUp } = await admin.storage
        .from("materiais")
        .upload(chave, bytes, { contentType: mime, upsert: true });
      if (erroUp) {
        console.error(`   material "${ebook.titulo}": falha no upload — ${erroUp.message}`);
        continue;
      }
      ordemMaterial += 1;
      const { error } = await admin.from("materiais").insert({
        disciplina_id: discId,
        titulo: ebook.titulo,
        tipo: selo,
        url: urlPublica,
        ordem: ordemMaterial,
      });
      console.log(
        error
          ? `   material "${ebook.titulo}": falha ao inserir — ${error.message}`
          : `   material "${ebook.titulo}": ok`,
      );
    }

    // ── videoaulas ───────────────────────────────────────────────────────────
    const { data: aulasExistentes } = await admin
      .from("aulas")
      .select("id, titulo, video_uid, ordem")
      .eq("disciplina_id", discId);
    let ordemAula = Math.max(0, ...(aulasExistentes ?? []).map((a) => a.ordem ?? 0));

    for (const video of aulasPorModulo[item.modulo_ordem] ?? []) {
      const { provider, uid } = classificarVideo(video.url);
      const repetida = (aulasExistentes ?? []).some(
        (a) => a.video_uid === uid || a.titulo === video.titulo,
      );
      if (repetida) {
        console.log(`   aula "${video.titulo}": já existe — pulada`);
        continue;
      }
      ordemAula += 1;
      if (SIMULAR) {
        console.log(`   aula "${video.titulo}": criaria [${provider}] ${uid}`);
        continue;
      }
      const { error } = await admin.from("aulas").insert({
        disciplina_id: discId,
        titulo: video.titulo,
        descricao: video.descricao ?? null,
        provider,
        video_uid: uid,
        ordem: ordemAula,
      });
      console.log(
        error
          ? `   aula "${video.titulo}": falha — ${error.message}`
          : `   aula "${video.titulo}": ok`,
      );
    }

    // ── base de conhecimento da IA (texto dos e-books) ───────────────────────
    const { data: docsExistentes } = await admin
      .from("disciplina_conhecimento")
      .select("id, titulo")
      .eq("disciplina_id", discId);
    let ordemDoc = docsExistentes?.length ?? 0;

    for (const { ebook, bytes, nome } of lidos) {
      if ((docsExistentes ?? []).some((d) => d.titulo === ebook.titulo)) {
        console.log(`   base da IA "${ebook.titulo}": já existe — pulada`);
        continue;
      }
      const { mime } = tipoDoArquivo(nome);
      const arquivo = new File([new Uint8Array(bytes)], nome, { type: mime });
      const texto = (await extrairTextoDeArquivo(arquivo)).trim();
      if (SIMULAR) {
        console.log(`   base da IA "${ebook.titulo}": gravaria ${texto.length} caracteres`);
        continue;
      }
      const caminhoOriginal = `${discId}/${nome.replace(/[^\w.\-]+/g, "_")}`;
      const { error: erroUp } = await admin.storage
        .from("conhecimento")
        .upload(caminhoOriginal, bytes, { contentType: mime, upsert: true });
      ordemDoc += 1;
      const { error } = await admin.from("disciplina_conhecimento").insert({
        disciplina_id: discId,
        titulo: ebook.titulo,
        conteudo: texto,
        ordem: ordemDoc,
        ...(erroUp
          ? {}
          : {
              arquivo_nome: nome,
              arquivo_path: caminhoOriginal,
              arquivo_mime: mime,
              arquivo_tamanho: bytes.length,
            }),
      });
      console.log(
        error
          ? `   base da IA "${ebook.titulo}": falha — ${error.message}`
          : `   base da IA "${ebook.titulo}": ok (${texto.length} caracteres)`,
      );
    }

    // ── quiz ─────────────────────────────────────────────────────────────────
    let quizId: string | null = null;
    const { data: quizExistente } = await admin
      .from("quizzes")
      .select("id")
      .eq("disciplina_id", discId)
      .maybeSingle();

    if (quizExistente) {
      quizId = quizExistente.id as string;
    } else if (SIMULAR) {
      console.log(`   quiz: criaria a avaliação`);
    } else {
      const { data } = await admin
        .from("quizzes")
        .insert({
          disciplina_id: discId,
          titulo: "Avaliação final",
          nota_minima: 70,
        })
        .select("id")
        .single();
      quizId = (data?.id as string) ?? null;
    }

    if (quizId || SIMULAR) {
      const { data: jaGravadas } = quizId
        ? await admin.from("quiz_perguntas").select("enunciado").eq("quiz_id", quizId)
        : { data: [] as { enunciado: string }[] };
      const conhecidas = new Set((jaGravadas ?? []).map((p) => p.enunciado));

      let novas = 0;
      for (const pergunta of item.perguntas) {
        if (conhecidas.has(pergunta.enunciado)) continue;
        novas += 1;
        if (SIMULAR || !quizId) continue;

        const { data: linha, error: erroP } = await admin
          .from("quiz_perguntas")
          .insert({
            quiz_id: quizId,
            enunciado: pergunta.enunciado,
            ordem: pergunta.numero,
          })
          .select("id")
          .single();
        if (erroP || !linha) {
          console.error(`   quiz: falha na pergunta ${pergunta.numero}`);
          continue;
        }
        const { error: erroA } = await admin.from("quiz_alternativas").insert(
          pergunta.alternativas.map((a, i) => ({
            pergunta_id: linha.id,
            texto: a.texto,
            correta: a.letra === pergunta.correta,
            ordem: i + 1,
          })),
        );
        if (erroA) console.error(`   quiz: falha nas alternativas da ${pergunta.numero}`);
      }
      console.log(
        `   quiz: ${novas} pergunta(s) ${SIMULAR ? "seriam criadas" : "criadas"}, ` +
          `${item.perguntas.length - novas} já existiam`,
      );
    }

    // ── índice da IA ─────────────────────────────────────────────────────────
    if (SIMULAR) {
      console.log(`   índice da IA: reconstruiria os trechos`);
    } else {
      await reconstruirChunks(admin, discId);
      const { count } = await admin
        .from("disciplina_chunks")
        .select("*", { count: "exact", head: true })
        .eq("disciplina_id", discId);
      console.log(`   índice da IA: ${count} trecho(s)`);
    }

    console.log(
      `   módulo segue ${modulo.publicado ? "PUBLICADO" : "despublicado"} — publicação é manual.`,
    );
  }
}

main();
