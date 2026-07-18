// Validação pura das publicações do fórum — roda ANTES da moderação IA
// (barato primeiro). Devolve a mensagem de erro em pt-BR, ou null se ok.

export const TITULO_MIN = 3;
export const TITULO_MAX = 200;
export const CORPO_MAX = 5000;
export const OPCOES_MIN = 2;
export const OPCOES_MAX = 10;

export type DadosPost = {
  tipo: "duvida" | "enquete";
  titulo: string;
  corpo: string | null;
  opcoes: string[];
};

export function validarPost(dados: DadosPost): string | null {
  const titulo = dados.titulo.trim();
  if (titulo.length < TITULO_MIN || titulo.length > TITULO_MAX) {
    return `O título precisa ter entre ${TITULO_MIN} e ${TITULO_MAX} caracteres.`;
  }

  const corpo = dados.corpo?.trim() ?? "";
  if (corpo.length > CORPO_MAX) {
    return "O texto está longo demais (máximo de 5.000 caracteres).";
  }

  if (dados.tipo === "duvida" && corpo.length === 0) {
    return "Descreva sua dúvida no corpo do post.";
  }

  if (dados.tipo === "enquete") {
    const opcoes = dados.opcoes.map((o) => o.trim()).filter(Boolean);
    if (opcoes.length < OPCOES_MIN || opcoes.length > OPCOES_MAX) {
      return `A enquete precisa de ${OPCOES_MIN} a ${OPCOES_MAX} opções preenchidas.`;
    }
  }

  return null;
}

export function validarResposta(corpo: string): string | null {
  const texto = corpo.trim();
  if (texto.length === 0) return "Escreva a resposta antes de enviar.";
  if (texto.length > CORPO_MAX) {
    return "A resposta está longa demais (máximo de 5.000 caracteres).";
  }
  return null;
}
