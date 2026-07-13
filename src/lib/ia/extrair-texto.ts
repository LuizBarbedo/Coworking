import "server-only";

/**
 * Extrai texto de arquivos enviados pelo master para a base de conhecimento da
 * IA. Suporta PDF, DOCX, XLSX e texto simples (TXT/MD/CSV). O texto extraído é
 * o que alimenta a busca/RAG — o arquivo original não é guardado.
 *
 * As libs são importadas sob demanda (dynamic import) para não pesar em quem
 * nunca faz upload.
 */

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export const EXTENSOES_SUPORTADAS = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".txt",
  ".md",
  ".csv",
] as const;

/** Extensões aceitas no <input type="file" accept="…"> do formulário. */
export const ACCEPT_ARQUIVOS = EXTENSOES_SUPORTADAS.join(",");

export async function extrairTextoDeArquivo(arquivo: File): Promise<string> {
  if (!arquivo || arquivo.size === 0) return "";
  if (arquivo.size > MAX_BYTES) {
    throw new Error("Arquivo muito grande. O limite é 20 MB.");
  }

  const nome = arquivo.name.toLowerCase();
  const buffer = Buffer.from(await arquivo.arrayBuffer());

  let texto: string;
  if (nome.endsWith(".pdf")) {
    texto = await extrairPdf(buffer);
  } else if (nome.endsWith(".docx")) {
    texto = await extrairDocx(buffer);
  } else if (nome.endsWith(".xlsx")) {
    texto = await extrairXlsx(buffer);
  } else if (
    nome.endsWith(".txt") ||
    nome.endsWith(".md") ||
    nome.endsWith(".csv")
  ) {
    texto = buffer.toString("utf-8");
  } else {
    throw new Error(
      "Formato não suportado. Envie PDF, DOCX, XLSX, TXT, MD ou CSV.",
    );
  }

  return normalizar(texto);
}

async function extrairPdf(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function extrairDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const extrair = mammoth.extractRawText ?? mammoth.default?.extractRawText;
  if (!extrair) return "";
  // A versão Node do mammoth aceita { buffer } (NÃO { arrayBuffer }). O cast
  // resolve a divergência entre a definição de Buffer do mammoth e a do Node.
  const { value } = await extrair({ buffer } as Parameters<typeof extrair>[0]);
  return value;
}

async function extrairXlsx(buffer: Buffer): Promise<string> {
  const mod = await import("exceljs");
  const Workbook = mod.default?.Workbook ?? mod.Workbook;
  const wb = new Workbook();
  // exceljs traz sua própria definição de Buffer; coage ao tipo que ele espera.
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

  const linhas: string[] = [];
  wb.eachSheet((planilha) => {
    linhas.push(`## ${planilha.name}`);
    planilha.eachRow({ includeEmpty: false }, (linha) => {
      const valores = Array.isArray(linha.values) ? linha.values.slice(1) : [];
      const celulas = valores.map(celulaTexto).filter((c) => c !== "");
      if (celulas.length) linhas.push(celulas.join(" | "));
    });
  });

  return linhas.join("\n");
}

/** Converte um valor de célula do ExcelJS (rich text, fórmula, data…) em texto. */
function celulaTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number" || typeof valor === "boolean") {
    return String(valor);
  }
  if (valor instanceof Date) return valor.toLocaleDateString("pt-BR");
  if (typeof valor === "object") {
    const v = valor as Record<string, unknown>;
    if (typeof v.text === "string") return v.text.trim();
    if (typeof v.result !== "undefined") return celulaTexto(v.result);
    if (Array.isArray(v.richText)) {
      return v.richText.map((r) => celulaTexto(r)).join("");
    }
    if (typeof v.hyperlink === "string") return v.hyperlink;
  }
  return "";
}

/** Colapsa espaços/linhas em branco excessivos, mantendo parágrafos. */
function normalizar(texto: string): string {
  return texto
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
