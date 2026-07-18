// Limite de publicação por aluno: barra spam e segura o custo da moderação
// IA (uma chamada por publicação). A contagem vem do banco; aqui é só a
// regra, pura e testável.

export const LIMITE_POR_HORA = 5;

export function podePostar(criadosNaUltimaHora: number): boolean {
  return criadosNaUltimaHora < LIMITE_POR_HORA;
}
