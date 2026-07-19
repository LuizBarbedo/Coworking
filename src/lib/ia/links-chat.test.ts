import { describe, expect, it } from "vitest";
import { segmentarLinks } from "./links-chat";

describe("segmentarLinks", () => {
  it("separa links markdown do texto ao redor", () => {
    expect(
      segmentarLinks("Veja em [Meus módulos](/painel) o seu progresso."),
    ).toEqual([
      { tipo: "texto", texto: "Veja em " },
      { tipo: "link", texto: "Meus módulos", href: "/painel" },
      { tipo: "texto", texto: " o seu progresso." },
    ]);
  });

  it("aceita vários links na mesma resposta", () => {
    const segmentos = segmentarLinks(
      "[Fórum](/forum) e [Perfil](/perfil)",
    );
    expect(segmentos.filter((s) => s.tipo === "link")).toHaveLength(2);
  });

  it("só aceita caminhos internos — link externo vira texto", () => {
    expect(segmentarLinks("[golpe](https://evil.example)")).toEqual([
      { tipo: "texto", texto: "[golpe](https://evil.example)" },
    ]);
  });

  it("texto sem link passa inteiro", () => {
    expect(segmentarLinks("apenas texto")).toEqual([
      { tipo: "texto", texto: "apenas texto" },
    ]);
  });
});
