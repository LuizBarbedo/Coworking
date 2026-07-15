// Passos do tour guiado, por perfil. Cada passo aponta para um elemento
// marcado com data-tour="..." na tela e traz o áudio de narração
// correspondente (gerado por scripts/modal/gerar_narracao.py).

export type PassoTour = {
  seletor?: string; // data-tour do elemento a destacar (ausente = passo central)
  titulo: string;
  descricao: string;
  audio: string; // caminho do clipe de narração em /public
};

export type PerfilTour = "aluno" | "master";

const TOURS: Record<PerfilTour, PassoTour[]> = {
  aluno: [
    {
      titulo: "Bem-vindo(a) à plataforma!",
      descricao:
        "Este é o seu ambiente de estudos. Vou te mostrar rapidamente por onde começar.",
      audio: "/tour/aluno/bemvindo.mp3",
    },
    {
      seletor: "progresso",
      titulo: "Seu progresso",
      descricao:
        "Aqui você acompanha quantas aulas assistiu e quantas avaliações já passou.",
      audio: "/tour/aluno/progresso.mp3",
    },
    {
      seletor: "modulos",
      titulo: "Seus módulos",
      descricao:
        "Clique em um módulo para abrir as disciplinas, as aulas em vídeo e os materiais.",
      audio: "/tour/aluno/modulos.mp3",
    },
    {
      seletor: "assistente",
      titulo: "Assistente de IA",
      descricao:
        "Tem dúvida? Fale com o assistente aqui no canto — ele conhece o conteúdo do curso.",
      audio: "/tour/aluno/assistente.mp3",
    },
  ],
  master: [
    {
      titulo: "Área do Master",
      descricao:
        "Aqui você cria e organiza todo o conteúdo do curso. Vamos ver o essencial.",
      audio: "/tour/master/bemvindo.mp3",
    },
    {
      seletor: "master-modulos",
      titulo: "Módulos e disciplinas",
      descricao:
        "Comece pelos módulos; dentro deles ficam as disciplinas, aulas, materiais e avaliações.",
      audio: "/tour/master/modulos.mp3",
    },
    {
      seletor: "master-conhecimento",
      titulo: "Base de conhecimento",
      descricao:
        "Envie documentos para treinar o assistente de IA de cada disciplina.",
      audio: "/tour/master/conhecimento.mp3",
    },
    {
      seletor: "assistente",
      titulo: "Teste o assistente",
      descricao:
        "O assistente também fica disponível para você testar as respostas.",
      audio: "/tour/master/assistente.mp3",
    },
  ],
};

/**
 * Passos do tour para o perfil, mantendo só os que têm o elemento presente
 * na tela atual (ou que são centrais). Evita passos “mortos” apontando para
 * elementos que não existem na página onde o tour foi iniciado.
 */
export function passosVisiveis(
  perfil: PerfilTour,
  existe: (seletor: string) => boolean,
): PassoTour[] {
  return TOURS[perfil].filter((p) => !p.seletor || existe(p.seletor));
}

export function todosOsPassos(perfil: PerfilTour): PassoTour[] {
  return TOURS[perfil];
}
