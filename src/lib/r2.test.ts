import { beforeAll, describe, expect, it } from "vitest";
import {
  chaveAula,
  chaveOriginal,
  chaveThumb,
  urlAssistir,
  urlUploadOriginal,
} from "./r2";

// Credenciais dummy só para exercitar a assinatura (não chamam o R2).
beforeAll(() => {
  process.env.R2_ACCOUNT_ID = "conta123";
  process.env.R2_ACCESS_KEY_ID = "chave-de-acesso";
  process.env.R2_SECRET_ACCESS_KEY = "segredo-de-teste";
  process.env.R2_BUCKET_VIDEOS = "csmg-videos";
});

describe("chaves de objeto no R2", () => {
  it("monta chaves determinísticas por aula", () => {
    expect(chaveAula("a1")).toBe("aulas/a1/video.mp4");
    expect(chaveThumb("a1")).toBe("aulas/a1/thumb.jpg");
  });

  it("normaliza a extensão do original enviado", () => {
    expect(chaveOriginal("a1", "Minha Aula.MP4")).toBe("raw/a1/original.mp4");
    expect(chaveOriginal("a1", "gravacao.mov")).toBe("raw/a1/original.mov");
    expect(chaveOriginal("a1", "sem-extensao")).toBe("raw/a1/original.mp4");
    expect(chaveOriginal("a1", "x.we!b#m")).toBe("raw/a1/original.webm");
  });
});

describe("URLs assinadas", () => {
  it("URL de assistir aponta para o objeto e vem assinada/expirável", async () => {
    const url = await urlAssistir(chaveAula("a1"), 3600);
    expect(url).toContain("conta123.r2.cloudflarestorage.com");
    expect(url).toContain("aulas/a1/video.mp4");
    expect(url).toContain("X-Amz-Signature=");
    expect(url).toContain("X-Amz-Expires=3600");
  });

  it("URL de upload é para o original (PUT assinado)", async () => {
    const url = await urlUploadOriginal(
      chaveOriginal("a1", "v.mp4"),
      "video/mp4",
      600,
    );
    expect(url).toContain("raw/a1/original.mp4");
    expect(url).toContain("X-Amz-Signature=");
    expect(url).toContain("X-Amz-Expires=600");
  });
});
