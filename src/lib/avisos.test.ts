import { describe, expect, it } from "vitest";

import { separarDestinatarios } from "./avisos";

const inscricao = (dados: Partial<Parameters<typeof separarDestinatarios>[0]["inscricoes"][number]>) => ({
  nome: "Fulano",
  email: "fulano@exemplo.com",
  matricula: "2026001",
  ativado_em: null,
  ...dados,
});

describe("separarDestinatarios", () => {
  it("manda o aviso simples pra quem já ativou a conta", () => {
    const { ativados, pendentes } = separarDestinatarios({
      inscricoes: [inscricao({ email: "ana@exemplo.com", ativado_em: "2026-07-21" })],
      jaAvisados: new Set(),
    });

    expect(ativados).toHaveLength(1);
    expect(ativados[0].email).toBe("ana@exemplo.com");
    expect(pendentes).toHaveLength(0);
  });

  it("manda o aviso com o passo a passo de acesso pra quem nunca entrou", () => {
    const { ativados, pendentes } = separarDestinatarios({
      inscricoes: [inscricao({ email: "bruno@exemplo.com", matricula: "2026042" })],
      jaAvisados: new Set(),
    });

    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].matricula).toBe("2026042");
    expect(ativados).toHaveLength(0);
  });

  it("pula quem já recebeu este aviso — rodar de novo não duplica", () => {
    const { ativados, pendentes } = separarDestinatarios({
      inscricoes: [
        inscricao({ email: "ana@exemplo.com", ativado_em: "2026-07-21" }),
        inscricao({ email: "bruno@exemplo.com" }),
      ],
      jaAvisados: new Set(["ana@exemplo.com", "bruno@exemplo.com"]),
    });

    expect(ativados).toHaveLength(0);
    expect(pendentes).toHaveLength(0);
  });

  it("compara e-mail sem depender de caixa alta nem de espaço em volta", () => {
    const { ativados } = separarDestinatarios({
      inscricoes: [inscricao({ email: "  Ana@Exemplo.com ", ativado_em: "2026-07-21" })],
      jaAvisados: new Set(["ana@exemplo.com"]),
    });

    expect(ativados).toHaveLength(0);
  });

  it("descarta endereço interno da equipe", () => {
    const { ativados, pendentes } = separarDestinatarios({
      inscricoes: [
        inscricao({ email: "monitor@coworkingsocial.com.br", ativado_em: "2026-07-21" }),
        inscricao({ email: "aluno@exemplo.com" }),
      ],
      jaAvisados: new Set(),
    });

    expect(ativados).toHaveLength(0);
    expect(pendentes).toHaveLength(1);
  });

  it("descarta inscrição sem e-mail utilizável", () => {
    const { ativados, pendentes } = separarDestinatarios({
      inscricoes: [inscricao({ email: "   " }), inscricao({ email: "sem-arroba" })],
      jaAvisados: new Set(),
    });

    expect(ativados).toHaveLength(0);
    expect(pendentes).toHaveLength(0);
  });
});
