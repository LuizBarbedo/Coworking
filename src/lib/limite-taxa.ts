// Limitador de taxa em memória, por chave (normalmente o IP), com janela
// deslizante. Serve pra barrar abuso de formulário público — inscrição em
// massa e força bruta na senha do painel.
//
// EM MEMÓRIA DE PROPÓSITO: a produção roda um processo só (coworking.service
// na VPS), então não precisa de Redis nem tabela. O contador zera a cada
// deploy/restart — aceitável, porque o objetivo é cortar rajada automatizada,
// não fazer contabilidade. Se um dia a aplicação rodar em mais de um processo,
// isto precisa virar contagem no banco.

export type OpcoesLimitador = {
  /** Quantas tentativas a mesma chave pode fazer dentro da janela. */
  limite: number;
  /** Tamanho da janela deslizante, em milissegundos. */
  janelaMs: number;
};

export type Limitador = {
  /** true se a tentativa está liberada (e a consome); false se estourou. */
  consumir: (chave: string, agora?: number) => boolean;
  /** Quantas chaves estão sendo rastreadas — usado nos testes. */
  tamanho: () => number;
};

export function criarLimitador({ limite, janelaMs }: OpcoesLimitador): Limitador {
  const marcasPorChave = new Map<string, number[]>();

  /** Descarta marcas fora da janela; some com a chave quando esvazia. */
  function limpar(agora: number): void {
    for (const [chave, marcas] of marcasPorChave) {
      const vivas = marcas.filter((m) => agora - m < janelaMs);
      if (vivas.length === 0) marcasPorChave.delete(chave);
      else marcasPorChave.set(chave, vivas);
    }
  }

  return {
    consumir(chave, agora = Date.now()) {
      limpar(agora);
      const marcas = marcasPorChave.get(chave) ?? [];
      // Tentativa barrada NÃO vira marca: senão quem está bloqueado se
      // bloqueia pra sempre só insistindo.
      if (marcas.length >= limite) return false;
      marcasPorChave.set(chave, [...marcas, agora]);
      return true;
    },
    tamanho() {
      return marcasPorChave.size;
    },
  };
}
