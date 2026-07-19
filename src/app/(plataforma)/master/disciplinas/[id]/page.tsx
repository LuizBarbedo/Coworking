import { FormAcao } from "@/components/ui/form-acao";
import type { AcaoState } from "@/lib/acao";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigirPermissao } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LinhaEditavel } from "@/components/master/linha-editavel";
import { BlocoAdicionar } from "@/components/master/bloco-adicionar";
import { BotaoEnviar } from "@/components/master/botao-enviar";
import { UploadVideo } from "@/components/master/upload-video";
import { AdicionarAula } from "@/components/master/adicionar-aula";
import { ConhecimentoVazio } from "@/components/ilustracoes";
import {
  atualizarDisciplina,
  excluirDisciplina,
  atualizarAula,
  excluirAula,
  criarMaterial,
  atualizarMaterial,
  excluirMaterial,
  atualizarQuiz,
  criarPergunta,
  atualizarPergunta,
  excluirPergunta,
  criarConhecimento,
  atualizarConhecimento,
  excluirConhecimento,
} from "../../actions";

export const metadata: Metadata = { title: "Editar disciplina — CSMG" };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
const cardClass = "rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm";
const btnPrimario =
  "rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]";

type Params = { id: string };

export default async function DisciplinaMasterPage({
  params,
}: {
  params: Promise<Params>;
}) {
  await exigirPermissao("editar_conteudo");
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: disciplina } = await admin
    .from("disciplinas")
    .select("id, modulo_id, titulo, descricao, publicado")
    .eq("id", id)
    .maybeSingle();
  if (!disciplina) notFound();

  const [
    { data: aulas },
    { data: materiais },
    { data: quiz },
    { data: conhecimento },
  ] = await Promise.all([
    admin
      .from("aulas")
      // "*" para tolerar ambientes sem a migration 0011 (video_status vem como
      // undefined até ela ser aplicada, e o código trata como null).
      .select("*")
      .eq("disciplina_id", id)
      .order("ordem", { ascending: true }),
    admin
      .from("materiais")
      .select("id, titulo, tipo, url, ordem")
      .eq("disciplina_id", id)
      .order("ordem", { ascending: true }),
    admin
      .from("quizzes")
      .select("id, titulo, nota_minima")
      .eq("disciplina_id", id)
      .maybeSingle(),
    admin
      .from("disciplina_conhecimento")
      .select("id, titulo, conteudo, ordem, arquivo_nome, arquivo_path")
      .eq("disciplina_id", id)
      .order("ordem", { ascending: true }),
  ]);

  // URLs assinadas (1h) para o master baixar/consultar os arquivos anexados.
  const pathsArquivos = (conhecimento ?? [])
    .map((k) => k.arquivo_path as string | null)
    .filter((p): p is string => Boolean(p));
  const urlPorPath = new Map<string, string>();
  if (pathsArquivos.length > 0) {
    const { data: assinadas } = await admin.storage
      .from("conhecimento")
      .createSignedUrls(pathsArquivos, 3600);
    for (const a of assinadas ?? []) {
      if (a.path && a.signedUrl) urlPorPath.set(a.path, a.signedUrl);
    }
  }

  let perguntas:
    | {
        id: string;
        enunciado: string;
        alternativas: { id: string; texto: string; correta: boolean }[];
      }[]
    | null = null;
  if (quiz) {
    const { data: pergs } = await admin
      .from("quiz_perguntas")
      .select("id, enunciado, ordem")
      .eq("quiz_id", quiz.id)
      .order("ordem", { ascending: true });
    const pergIds = (pergs ?? []).map((p) => p.id as string);
    const { data: alts } = pergIds.length
      ? await admin
          .from("quiz_alternativas")
          .select("id, pergunta_id, texto, correta, ordem")
          .in("pergunta_id", pergIds)
          .order("ordem", { ascending: true })
      : { data: [] as { id: string; pergunta_id: string; texto: string; correta: boolean }[] };
    const porPergunta = new Map<
      string,
      { id: string; texto: string; correta: boolean }[]
    >();
    for (const a of alts ?? []) {
      const arr = porPergunta.get(a.pergunta_id as string) ?? [];
      arr.push({
        id: a.id as string,
        texto: a.texto as string,
        correta: a.correta as boolean,
      });
      porPergunta.set(a.pergunta_id as string, arr);
    }
    perguntas = (pergs ?? []).map((p) => ({
      id: p.id as string,
      enunciado: p.enunciado as string,
      alternativas: porPergunta.get(p.id as string) ?? [],
    }));
  }

  const letras = ["a", "b", "c", "d", "e"];

  return (
    <div className="animate-aparecer space-y-8">
      <div>
        <Link
          href={`/master/modulos/${disciplina.modulo_id}`}
          className="text-sm text-brand-600 transition hover:text-brand-700"
        >
          ← Voltar ao módulo
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
          {disciplina.titulo}
        </h1>
      </div>

      {/* Editar disciplina */}
      <section className={cardClass}>
        <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">Dados da disciplina</h2>
        <FormAcao action={atualizarDisciplina} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={disciplina.id} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Título
            </label>
            <input
              name="titulo"
              required
              defaultValue={disciplina.titulo}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Descrição
            </label>
            <textarea
              name="descricao"
              rows={2}
              defaultValue={disciplina.descricao ?? ""}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="publicado"
              defaultChecked={disciplina.publicado}
              className="h-4 w-4 accent-brand-600"
            />
            Publicada
          </label>
          <div className="flex justify-end">
            <button type="submit" className={btnPrimario}>
              Salvar
            </button>
          </div>
        </FormAcao>
      </section>

      {/* Aulas */}
      <section className={cardClass} data-tour="master-aulas">
        <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">Aulas (vídeo)</h2>
        {aulas && aulas.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {aulas.map((a, i) => (
              <li key={a.id as string} className="py-2.5">
                <LinhaEditavel
                  resumo={
                    <span className="text-sm text-slate-700">
                      <span className="font-medium text-brand-900 dark:text-brand-100">
                        {i + 1}. {a.titulo as string}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {a.provider === "r2"
                          ? a.video_status === "pronta"
                            ? "vídeo próprio"
                            : a.video_status === "processando"
                              ? "processando…"
                              : (a.video_status as string) ?? "vídeo"
                          : a.video_uid
                            ? (a.provider as string)
                            : "sem vídeo"}
                      </span>
                    </span>
                  }
                  excluir={
                    <FormExcluir
                      action={excluirAula}
                      id={a.id as string}
                      disciplinaId={disciplina.id}
                    />
                  }
                  formulario={
                    <FormAcao
                      action={atualizarAula}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      <input type="hidden" name="id" value={a.id as string} />
                      <input
                        type="hidden"
                        name="disciplina_id"
                        value={disciplina.id}
                      />
                      <input
                        name="titulo"
                        required
                        defaultValue={a.titulo as string}
                        placeholder="Título da aula"
                        className={inputClass}
                      />
                      <input
                        name="video_link"
                        defaultValue={
                          a.provider === "r2"
                            ? ""
                            : ((a.video_uid as string | null) ?? "")
                        }
                        placeholder="Link do YouTube ou Cloudflare"
                        className={inputClass}
                      />
                      <input
                        name="descricao"
                        defaultValue={(a.descricao as string | null) ?? ""}
                        placeholder="Descrição (opcional)"
                        className={`sm:col-span-2 ${inputClass}`}
                      />
                      <div className="sm:col-span-2 flex justify-end">
                        <button type="submit" className={btnPrimario}>
                          Salvar aula
                        </button>
                      </div>
                      <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                          ou hospede o vídeo na plataforma
                        </p>
                        <UploadVideo
                          aulaId={a.id as string}
                          disciplinaId={disciplina.id}
                          status={a.video_status as string | null}
                        />
                      </div>
                    </FormAcao>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Nenhuma aula ainda.</p>
        )}

        <BlocoAdicionar rotulo="Adicionar aula">
          <AdicionarAula disciplinaId={disciplina.id} />
        </BlocoAdicionar>
      </section>

      {/* Materiais */}
      <section className={cardClass} data-tour="master-materiais">
        <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">Materiais</h2>
        {materiais && materiais.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {materiais.map((m) => (
              <li key={m.id as string} className="py-2.5">
                <LinhaEditavel
                  resumo={
                    <a
                      href={m.url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
                    >
                      {m.titulo as string}
                    </a>
                  }
                  excluir={
                    <FormExcluir
                      action={excluirMaterial}
                      id={m.id as string}
                      disciplinaId={disciplina.id}
                    />
                  }
                  formulario={
                    <FormAcao
                      action={atualizarMaterial}
                      className="grid gap-2 sm:grid-cols-4"
                    >
                      <input type="hidden" name="id" value={m.id as string} />
                      <input
                        type="hidden"
                        name="disciplina_id"
                        value={disciplina.id}
                      />
                      <input
                        name="titulo"
                        required
                        defaultValue={m.titulo as string}
                        placeholder="Título"
                        className={`sm:col-span-2 ${inputClass}`}
                      />
                      <input
                        name="tipo"
                        defaultValue={(m.tipo as string | null) ?? "pdf"}
                        placeholder="Tipo"
                        className={inputClass}
                      />
                      <input
                        name="url"
                        required
                        defaultValue={m.url as string}
                        placeholder="URL"
                        className={inputClass}
                      />
                      <div className="sm:col-span-4 flex justify-end">
                        <button type="submit" className={btnPrimario}>
                          Salvar material
                        </button>
                      </div>
                    </FormAcao>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Nenhum material ainda.</p>
        )}

        <BlocoAdicionar rotulo="Adicionar material">
          <FormAcao action={criarMaterial} className="grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="disciplina_id" value={disciplina.id} />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Título
              </label>
              <input name="titulo" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tipo
              </label>
              <input name="tipo" defaultValue="pdf" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                URL
              </label>
              <input name="url" required className={inputClass} />
            </div>
            <div className="sm:col-span-4 flex justify-end">
              <button type="submit" className={btnPrimario}>
                Adicionar material
              </button>
            </div>
          </FormAcao>
        </BlocoAdicionar>
      </section>

      {/* Base de conhecimento da IA */}
      <section className={cardClass} data-tour="master-conhecimento">
        <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">
          Base de conhecimento da IA
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Cole um texto <strong>ou anexe um arquivo</strong> (PDF, DOCX, XLSX,
          TXT, MD ou CSV) com o material que o assistente usará para tirar as
          dúvidas dos alunos <strong>somente sobre esta disciplina</strong>. O
          texto do arquivo é extraído e guardado. Títulos e descrições das aulas
          e materiais já são lidos automaticamente.
        </p>

        {conhecimento && conhecimento.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {conhecimento.map((k) => (
              <li key={k.id as string} className="py-2.5">
                <LinhaEditavel
                  resumo={
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-900 dark:text-brand-100">
                        {k.titulo as string}
                      </p>
                      {k.arquivo_nome ? (
                        <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          <span aria-hidden>📎</span>
                          {urlPorPath.get(k.arquivo_path as string) ? (
                            <a
                              href={urlPorPath.get(k.arquivo_path as string)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-brand-700 hover:underline dark:text-brand-300"
                            >
                              {k.arquivo_nome as string}
                            </a>
                          ) : (
                            <span className="truncate">
                              {k.arquivo_nome as string}
                            </span>
                          )}
                        </span>
                      ) : null}
                      {(k.conteudo as string) ? (
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {(k.conteudo as string).slice(0, 120)}
                        </p>
                      ) : null}
                    </div>
                  }
                  excluir={
                    <FormExcluir
                      action={excluirConhecimento}
                      id={k.id as string}
                      disciplinaId={disciplina.id}
                    />
                  }
                  formulario={
                    <FormAcao action={atualizarConhecimento} className="grid gap-2">
                      <input type="hidden" name="id" value={k.id as string} />
                      <input
                        type="hidden"
                        name="disciplina_id"
                        value={disciplina.id}
                      />
                      <input
                        name="titulo"
                        required
                        defaultValue={k.titulo as string}
                        placeholder="Título do conteúdo"
                        className={inputClass}
                      />
                      <textarea
                        name="conteudo"
                        rows={8}
                        defaultValue={k.conteudo as string}
                        placeholder="Conteúdo (texto do material)"
                        className={inputClass}
                      />
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          Anexar arquivo (acrescenta ao texto acima)
                        </label>
                        <input
                          type="file"
                          name="arquivo"
                          accept=".pdf,.docx,.xlsx,.txt,.md,.csv"
                          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 transition hover:file:bg-brand-100 dark:file:bg-brand-900/40 dark:file:text-brand-300 dark:hover:file:bg-brand-900/60"
                        />
                      </div>
                      <div className="flex justify-end">
                        <BotaoEnviar className={btnPrimario}>
                          Salvar conteúdo
                        </BotaoEnviar>
                      </div>
                    </FormAcao>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 flex flex-col items-center rounded-lg border border-dashed border-slate-300 p-6 text-center">
            <ConhecimentoVazio className="h-28 w-auto text-slate-300" />
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              Nenhum conteúdo cadastrado. Sem material, o assistente responderá
              que não há conteúdo sobre a pergunta.
            </p>
          </div>
        )}

        <BlocoAdicionar rotulo="Adicionar conteúdo">
          <FormAcao action={criarConhecimento} className="grid gap-3">
            <input type="hidden" name="disciplina_id" value={disciplina.id} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Título do conteúdo
              </label>
              <input
                name="titulo"
                placeholder="Ex.: Introdução ao tema (se vazio, usa o nome do arquivo)"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Anexar arquivo (opcional)
              </label>
              <input
                type="file"
                name="arquivo"
                accept=".pdf,.docx,.xlsx,.txt,.md,.csv"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 transition hover:file:bg-brand-100 dark:file:bg-brand-900/40 dark:file:text-brand-300 dark:hover:file:bg-brand-900/60"
              />
              <p className="mt-1 text-xs text-slate-400">
                PDF, DOCX, XLSX, TXT, MD ou CSV (até 20 MB). PDFs escaneados
                (imagem) não têm texto para extrair.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Conteúdo em texto (opcional se anexar arquivo)
              </label>
              <textarea
                name="conteudo"
                rows={8}
                placeholder="Cole aqui o texto do material desta disciplina…"
                className={inputClass}
              />
            </div>
            <div className="flex justify-end">
              <BotaoEnviar className={btnPrimario}>
                Adicionar conteúdo
              </BotaoEnviar>
            </div>
          </FormAcao>
        </BlocoAdicionar>
      </section>

      {/* Avaliação */}
      <section className={cardClass} data-tour="master-avaliacao">
        <h2 className="font-display font-semibold text-brand-900 dark:text-brand-100">Avaliação final</h2>

        <FormAcao
          action={atualizarQuiz}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="disciplina_id" value={disciplina.id} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Título
            </label>
            <input
              name="titulo"
              defaultValue={quiz?.titulo ?? "Avaliação final"}
              className={inputClass}
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nota mín. (%)
            </label>
            <input
              name="nota_minima"
              type="number"
              min={0}
              max={100}
              defaultValue={quiz?.nota_minima ?? 70}
              className={inputClass}
            />
          </div>
          <button type="submit" className={btnPrimario}>
            Salvar avaliação
          </button>
        </FormAcao>

        {/* Perguntas existentes */}
        {perguntas && perguntas.length > 0 ? (
          <ul className="escalonado mt-6 space-y-3">
            {perguntas.map((p, i) => (
              <li
                key={p.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <LinhaEditavel
                  resumo={
                    <>
                      <p className="font-medium text-brand-900 dark:text-brand-100">
                        {i + 1}. {p.enunciado}
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {p.alternativas.map((alt, j) => (
                          <li
                            key={alt.id}
                            className={
                              alt.correta
                                ? "font-medium text-green-700"
                                : "text-slate-600"
                            }
                          >
                            {String.fromCharCode(65 + j)}) {alt.texto}
                            {alt.correta ? " ✓" : ""}
                          </li>
                        ))}
                      </ul>
                    </>
                  }
                  excluir={
                    <FormExcluir
                      action={excluirPergunta}
                      id={p.id}
                      disciplinaId={disciplina.id}
                    />
                  }
                  formulario={
                    <FormAcao action={atualizarPergunta}>
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="hidden"
                        name="disciplina_id"
                        value={disciplina.id}
                      />
                      <textarea
                        name="enunciado"
                        required
                        rows={2}
                        defaultValue={p.enunciado}
                        className={inputClass}
                      />
                      <div className="mt-2 space-y-2">
                        {letras.map((letra, k) => {
                          const alt = p.alternativas[k];
                          return (
                            <div
                              key={letra}
                              className="flex items-center gap-3"
                            >
                              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                                <input
                                  type="radio"
                                  name="correta"
                                  value={letra}
                                  defaultChecked={alt?.correta ?? false}
                                  required={letra === "a"}
                                  className="h-4 w-4 accent-brand-600"
                                />
                                {letra.toUpperCase()}
                              </label>
                              <input
                                name={`alt_${letra}`}
                                defaultValue={alt?.texto ?? ""}
                                placeholder={`Alternativa ${letra.toUpperCase()}`}
                                className={inputClass}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button type="submit" className={btnPrimario}>
                          Salvar pergunta
                        </button>
                      </div>
                    </FormAcao>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Nenhuma pergunta ainda.
          </p>
        )}

        {/* Nova pergunta */}
        <BlocoAdicionar rotulo="Adicionar pergunta">
          <FormAcao action={criarPergunta}>
            <input type="hidden" name="disciplina_id" value={disciplina.id} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Enunciado
              </label>
              <textarea
                name="enunciado"
                required
                rows={2}
                className={inputClass}
              />
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Preencha as alternativas e marque a correta. Deixe em branco as que
              não usar (mínimo 2).
            </p>
            <div className="mt-2 space-y-2">
              {letras.map((letra) => (
                <div key={letra} className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                    <input
                      type="radio"
                      name="correta"
                      value={letra}
                      className="h-4 w-4 accent-brand-600"
                      required={letra === "a"}
                    />
                    {letra.toUpperCase()}
                  </label>
                  <input
                    name={`alt_${letra}`}
                    placeholder={`Alternativa ${letra.toUpperCase()}`}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" className={btnPrimario}>
                Adicionar pergunta
              </button>
            </div>
          </FormAcao>
        </BlocoAdicionar>
      </section>

      {/* Excluir disciplina */}
      <FormAcao action={excluirDisciplina}>
        <input type="hidden" name="id" value={disciplina.id} />
        <input type="hidden" name="modulo_id" value={disciplina.modulo_id} />
        <button
          type="submit"
          className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          Excluir disciplina
        </button>
      </FormAcao>
    </div>
  );
}

/** Botãozinho de excluir reutilizável (form com id + disciplina). */
function FormExcluir({
  action,
  id,
  disciplinaId,
}: {
  action: (prev: AcaoState, formData: FormData) => Promise<AcaoState>;
  id: string;
  disciplinaId: string;
}) {
  return (
    <FormAcao action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="disciplina_id" value={disciplinaId} />
      <button
        type="submit"
        className="flex-none rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        Excluir
      </button>
    </FormAcao>
  );
}
