import { describe, expect, it } from "vitest";

import {
  CHAMADAS_CTA,
  COMO_FUNCIONA,
  CORTES_YOUTUBE,
  MOTIVOS,
  PALESTRANTES,
  PERGUNTAS_FREQUENTES,
  PUBLICO_ALVO,
  SECOES_LANDING,
  TEMAS,
  TEXTOS,
} from "./conteudo-landing";

// O conteúdo vem do roteiro da marketing (landing-material/roteiro.txt) e do
// documento de especialistas. Estes testes travam as invariantes que, se
// quebrarem, publicam página errada: contagem prometida no texto, foto sem
// descrição, âncora duplicada, palestrante sem tema.

describe("temas da formação", () => {
  it("tem os 11 temas que o texto da seção promete", () => {
    expect(TEMAS).toHaveLength(11);
    expect(TEXTOS.temas.intro).toContain("11 temas");
  });

  it("dá capa e descrição a todo tema", () => {
    for (const tema of TEMAS) {
      expect(tema.nome.length).toBeGreaterThan(0);
      expect(tema.descricao.length).toBeGreaterThan(0);
      expect(tema.capa).toMatch(/^\/modulos\/[a-z0-9-]+\.webp$/);
    }
  });

  it("não repete tema", () => {
    expect(new Set(TEMAS.map((t) => t.nome)).size).toBe(TEMAS.length);
  });
});

describe("palestrantes", () => {
  it("tem os 11 especialistas que o texto da seção promete", () => {
    expect(PALESTRANTES).toHaveLength(11);
    expect(TEXTOS.especialistas.paragrafos[0]).toContain("11 especialistas");
  });

  it("dá nome, cargo, tema e foto a todo especialista", () => {
    for (const p of PALESTRANTES) {
      expect(p.nome.length).toBeGreaterThan(0);
      expect(p.cargo.length).toBeGreaterThan(0);
      expect(p.temas.length).toBeGreaterThan(0);
      expect(p.foto).toBe(`/palestrantes/${p.slug}.webp`);
    }
  });

  it("usa slug único e no formato do arquivo gerado", () => {
    const slugs = PALESTRANTES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("só cita tema que existe na formação", () => {
    const nomes = new Set(TEMAS.map((t) => t.nome));
    for (const p of PALESTRANTES) {
      for (const tema of p.temas) expect(nomes).toContain(tema);
    }
  });
});

describe("seções e âncoras", () => {
  it("não repete id de âncora", () => {
    const ids = SECOES_LANDING.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("usa id válido para href de âncora", () => {
    for (const secao of SECOES_LANDING) {
      expect(secao.id).toMatch(/^[a-z0-9-]+$/);
      expect(secao.rotulo.length).toBeGreaterThan(0);
    }
  });

  it("coloca 'para quem é' logo depois do hero", () => {
    // "Isso é para mim?" é a pergunta da primeira tela. Enterrada na sétima
    // seção, quem não se reconhece abandona antes de chegar nela.
    expect(SECOES_LANDING[0].id).toBe("inicio");
    expect(SECOES_LANDING[1].id).toBe("para-quem");
  });

  it("termina na inscrição", () => {
    expect(SECOES_LANDING.at(-1)?.id).toBe("inscricao");
  });
});

describe("respostas às objeções", () => {
  it("diz quem pode participar, com idade e região", () => {
    const criterios = TEXTOS.paraQuem.elegibilidade;
    // Regressão real: o roteiro tirou os critérios do edital e a campanha paga
    // passou a atrair inscrição inelegível.
    expect(criterios).toContain("15 a 65");
    expect(criterios).toContain("Região Metropolitana do Rio de Janeiro");
    expect(criterios).toMatch(/MEI/);
  });

  it("promete a declaração de participação em algum lugar da página", () => {
    const tudo = [
      ...COMO_FUNCIONA.map((i) => `${i.titulo} ${i.texto}`),
      ...PERGUNTAS_FREQUENTES.map((p) => `${p.pergunta} ${p.resposta}`),
    ].join(" ");
    expect(tudo.toLowerCase()).toContain("declaração de participação");
  });

  it("explica por que o CPF é pedido", () => {
    const cpf = PERGUNTAS_FREQUENTES.find((p) => p.pergunta.includes("CPF"));
    expect(cpf).toBeDefined();
    expect(cpf!.resposta).toMatch(/LGPD/);
  });

  it("tem pergunta e resposta não vazias em todo item do FAQ", () => {
    expect(PERGUNTAS_FREQUENTES.length).toBeGreaterThanOrEqual(5);
    for (const { pergunta, resposta } of PERGUNTAS_FREQUENTES) {
      expect(pergunta.trim().endsWith("?")).toBe(true);
      expect(resposta.trim().length).toBeGreaterThan(40);
    }
  });

  it("descreve o formato da formação em 'como funciona'", () => {
    expect(COMO_FUNCIONA.length).toBeGreaterThanOrEqual(3);
    for (const item of COMO_FUNCIONA) {
      expect(item.titulo.length).toBeGreaterThan(0);
      expect(item.texto.length).toBeGreaterThan(20);
    }
  });
});

describe("apoio", () => {
  it("tem os 5 motivos e os 7 perfis do roteiro", () => {
    expect(MOTIVOS).toHaveLength(5);
    expect(PUBLICO_ALVO).toHaveLength(7);
  });

  it("tem as chamadas de CTA sugeridas, todas não vazias", () => {
    expect(CHAMADAS_CTA.length).toBeGreaterThanOrEqual(4);
    for (const chamada of Object.values(CHAMADAS_CTA)) {
      expect(chamada.trim()).not.toBe("");
    }
  });

  it("usa id de vídeo do YouTube no formato de 11 caracteres", () => {
    expect(CORTES_YOUTUBE.length).toBeGreaterThan(0);
    for (const corte of CORTES_YOUTUBE) {
      expect(corte.id).toMatch(/^[\w-]{11}$/);
      expect(corte.titulo.length).toBeGreaterThan(0);
    }
  });

  it("marca exatamente um corte como destaque do hero", () => {
    // Mais de um, e a página não sabe qual mostrar; nenhum, e o hero fica sem
    // vídeo em silêncio.
    expect(CORTES_YOUTUBE.filter((c) => c.destaque)).toHaveLength(1);
  });
});
