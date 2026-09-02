/**
 * Prepara as mídias da landing de rolagem a partir dos materiais da marketing.
 *
 *   node scripts/preparar-midia-landing.mjs
 *
 * Duas saídas, ambas idempotentes (pula o que já existe, com --forcar refaz):
 *
 *   public/palestrantes/<slug>.webp  fotos extraídas do PDF "ESPECIALISTAS E
 *       PALESTRANTES - CSMG.pdf" (pdfimages devolve o bitmap embutido cru; o
 *       sharp corta em 4:5 e converte). A ordem das imagens no PDF segue a
 *       ordem do documento — conferida página a página no material original —
 *       e é isso que ORDEM_PALESTRANTES registra. Mexer nessa lista sem
 *       reconferir o PDF troca a foto de pessoa real na página pública.
 *
 *   public/modulos/<slug>.webp  capas dos módulos, reduzidas ao tamanho de
 *       card (as de capas-geradas/ são grandes demais pra landing).
 *
 * O sharp não copia EXIF a menos que se peça: as fotos saem sem metadado de
 * câmera, data ou GPS. `rotate()` sem argumento aplica a orientação EXIF antes
 * de descartá-la, senão foto de celular sai deitada.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";

const RAIZ = new URL("..", import.meta.url).pathname;
const PDF_PALESTRANTES = join(
  RAIZ,
  "landing-material/ESPECIALISTAS E PALESTRANTES - CSMG.pdf",
);
const CAPAS = join(RAIZ, "capas-geradas");
const SAIDA_PALESTRANTES = join(RAIZ, "public/palestrantes");
const SAIDA_MODULOS = join(RAIZ, "public/modulos");
const SAIDA_CORTES = join(RAIZ, "public/cortes");
const PALESTRANTES_AJUSTADOS = join(
  RAIZ,
  "landing-material/palestrantes-ajustados",
);

const FORCAR = process.argv.includes("--forcar");

/** Ordem das imagens embutidas no PDF = ordem dos especialistas no documento. */
const ORDEM_PALESTRANTES = [
  "ronaldinho-do-cavaquinho",
  "aurelio-murta",
  "jorge-bittencourt",
  "gabriel-chilleli",
  "jose-pinto-monteiro",
  "jose-dutra",
  "jorge-victor",
  "fabio-laje",
  "maria-da-penha",
  "renato-mansur",
  "ronaldo-gaudio",
];

/** Capas usadas na seção "O que você vai aprender" (uma por tema do roteiro). */
const CAPAS_DOS_TEMAS = [
  "empreendendo-com-legado-cultural",
  "empreender-com-organizacao",
  "contabilidade-e-nocoes-financeiras",
  "aspectos-juridicos-e-formalizacao",
  "financiamento-e-cooperativismo-de-credito",
  "tecnicas-de-compra-e-venda",
  "estrategias-de-marketing-digital",
  "planejamento-e-precificacao",
  "empreendendo-com-inteligencia-artificial",
  "gestao-e-planejamento-financeiro",
  "empreendedorismo-social",
];

/** Ids dos cortes da playlist "CORTES - COWORKING SOCIAL" usados na landing. */
const CORTES = [
  "9ZmDAaMFg6E",
  "vKyQr-Rjing",
  "WiducuuQQmo",
  "s4P2IhWop3k",
  "jghN6pf6f1E",
];

// Retrato 4:5 a 2x do tamanho renderizado (320x400 no card).
// effort 6 (o padrão é 4) troca tempo de build por ~20% menos bytes; vale
// porque isso roda uma vez e o resultado vai pra todo visitante.
const FOTO = { largura: 640, altura: 800, qualidade: 72, esforco: 6 };
// Capa a 2x de um card de ~400px de largura.
const CAPA = { largura: 800, qualidade: 74, esforco: 6 };
// Capa de vídeo vertical (reels) a 2x de um card de ~360px.
const CORTE = { largura: 720, qualidade: 72, esforco: 6 };

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

async function gerarFotos() {
  if (!existsSync(PDF_PALESTRANTES)) {
    log(`! PDF de palestrantes não encontrado: ${PDF_PALESTRANTES}`);
    return;
  }
  mkdirSync(SAIDA_PALESTRANTES, { recursive: true });

  const pendentes = ORDEM_PALESTRANTES.filter(
    (slug) => FORCAR || !existsSync(join(SAIDA_PALESTRANTES, `${slug}.webp`)),
  );
  if (pendentes.length === 0) {
    log("= fotos dos palestrantes já geradas");
    return;
  }

  const temp = mkdtempSync(join(tmpdir(), "csmg-palestrantes-"));
  try {
    execFileSync("pdfimages", ["-all", "-p", PDF_PALESTRANTES, join(temp, "foto")]);
    // pdfimages nomeia foto-<pagina>-<indice>.<ext>; a ordenação alfabética
    // coincide com a ordem do documento porque os dois campos são zero-padded.
    const extraidas = readdirSync(temp).sort();

    if (extraidas.length !== ORDEM_PALESTRANTES.length) {
      throw new Error(
        `o PDF trouxe ${extraidas.length} imagem(ns) e ORDEM_PALESTRANTES tem ` +
          `${ORDEM_PALESTRANTES.length} nome(s). O documento mudou: reconfira o ` +
          `casamento foto/pessoa antes de publicar.`,
      );
    }

    for (const [i, slug] of ORDEM_PALESTRANTES.entries()) {
      const destino = join(SAIDA_PALESTRANTES, `${slug}.webp`);
      if (!FORCAR && existsSync(destino)) continue;

      const ajustado = join(PALESTRANTES_AJUSTADOS, `${slug}.png`);
      const fonte = existsSync(ajustado) ? ajustado : join(temp, extraidas[i]);

      const info = await sharp(fonte)
        .rotate()
        .resize(FOTO.largura, FOTO.altura, {
          fit: "cover",
          // "attention" escolhe a região de maior interesse visual — em
          // retrato cai no rosto, que é o que o card precisa mostrar.
          position: sharp.strategy.attention,
        })
        .webp({ quality: FOTO.qualidade, effort: FOTO.esforco })
        .toFile(destino);
      log(`+ ${slug}.webp (${Math.round(info.size / 1024)} KB)`);
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

async function gerarCapas() {
  mkdirSync(SAIDA_MODULOS, { recursive: true });
  for (const slug of CAPAS_DOS_TEMAS) {
    const destino = join(SAIDA_MODULOS, `${slug}.webp`);
    if (!FORCAR && existsSync(destino)) continue;

    const origem = [
      join(CAPAS, "webp", `${slug}.webp`),
      join(CAPAS, `${slug}.png`),
    ].find(existsSync);
    if (!origem) {
      log(`! capa ausente para "${slug}" (procurei em capas-geradas/)`);
      continue;
    }
    const info = await sharp(origem)
      .resize(CAPA.largura, null, { withoutEnlargement: true })
      .webp({ quality: CAPA.qualidade, effort: CAPA.esforco })
      .toFile(destino);
    log(`+ modulos/${slug}.webp (${Math.round(info.size / 1024)} KB)`);
  }
}

/**
 * Baixa a capa de cada corte do YouTube e guarda local. Não é economia de
 * bytes: é o mesmo motivo da fachada de vídeo — sem isso, a landing pede a
 * imagem pro i.ytimg.com no carregamento e entrega o IP de todo visitante ao
 * Google antes de qualquer consentimento.
 *
 * Os cortes são reels (vertical), e o YouTube entrega a capa sempre em 16:9,
 * preenchendo as laterais com o próprio conteúdo esticado — não com preto, por
 * isso `trim()` não resolve. Recortamos a faixa central 9:16, que é o vídeo de
 * verdade, e o player também fica vertical: sem tarja, e o embed do Shorts
 * preenche o quadro.
 */
async function gerarCapasDosCortes() {
  mkdirSync(SAIDA_CORTES, { recursive: true });
  for (const id of CORTES) {
    const destino = join(SAIDA_CORTES, `${id}.webp`);
    if (!FORCAR && existsSync(destino)) continue;

    // maxresdefault não existe pra todo vídeo; hqdefault existe sempre.
    let bytes = null;
    for (const nome of ["maxresdefault", "hqdefault"]) {
      const resposta = await fetch(`https://i.ytimg.com/vi/${id}/${nome}.jpg`);
      if (resposta.ok) {
        bytes = Buffer.from(await resposta.arrayBuffer());
        break;
      }
    }
    if (!bytes) {
      log(`! não consegui baixar a capa do corte ${id}`);
      continue;
    }

    const { width = 0, height = 0 } = await sharp(bytes).metadata();
    const larguraUtil = Math.round((height * 9) / 16);
    const recorte =
      width > larguraUtil
        ? {
            left: Math.round((width - larguraUtil) / 2),
            top: 0,
            width: larguraUtil,
            height,
          }
        : null;

    let pipeline = sharp(bytes);
    if (recorte) pipeline = pipeline.extract(recorte);
    const info = await pipeline
      .resize(CORTE.largura, null, { withoutEnlargement: true })
      .webp({ quality: CORTE.qualidade, effort: CORTE.esforco })
      .toFile(destino);
    log(
      `+ cortes/${id}.webp (${Math.round(info.size / 1024)} KB, ` +
        `${info.width}x${info.height})`,
    );
  }
}

await gerarFotos();
await gerarCapas();
await gerarCapasDosCortes();
log("pronto");
