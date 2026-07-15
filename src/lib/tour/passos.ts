// Passos do tour guiado, por perfil. O tour é um passeio que NAVEGA entre as
// páginas (painel → módulo → disciplina), destacando cada recurso e narrando.
//
// - `seletor`: data-tour do elemento a destacar (ausente = passo central).
// - `linkDe`: data-tour do contêiner cujo 1º link leva à página deste passo.
//   O motor do tour clica nesse link (navegação real) para chegar ao passo.
// - `audio`: clipe de narração (voz Jessica, ElevenLabs), em /public.

export type PassoTour = {
  seletor?: string;
  titulo: string;
  descricao: string;
  audio: string;
  linkDe?: string;
  aba?: string; // data-aba a ativar (troca de aba na página da disciplina)
};

export type PerfilTour = "aluno" | "master";

const TOURS: Record<PerfilTour, PassoTour[]> = {
  aluno: [
    {
      titulo: "Bem-vindo(a) à plataforma!",
      descricao:
        "Este é o seu ambiente de estudos. Vou te levar por um passeio rápido mostrando tudo que dá pra fazer aqui.",
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
        "Os módulos são o coração do curso. Vamos abrir um para ver o que há dentro.",
      audio: "/tour/aluno/modulos.mp3",
    },
    {
      seletor: "disciplinas",
      linkDe: "modulos",
      titulo: "Disciplinas do módulo",
      descricao:
        "Cada módulo reúne várias disciplinas. Vamos entrar em uma delas.",
      audio: "/tour/aluno/disciplinas.mp3",
    },
    {
      seletor: "abas",
      linkDe: "disciplinas",
      titulo: "Tudo em um lugar",
      descricao:
        "Estas abas organizam a disciplina: aulas, materiais, avaliação e o assistente de IA.",
      audio: "/tour/aluno/abas.mp3",
    },
    {
      seletor: "aulas",
      aba: "aulas",
      titulo: "Aulas em vídeo",
      descricao:
        "Assista às aulas e marque cada uma como concluída para registrar seu progresso.",
      audio: "/tour/aluno/aulas.mp3",
    },
    {
      seletor: "avaliacao",
      aba: "avaliacao",
      titulo: "Avaliação",
      descricao:
        "Teste o que aprendeu. Você pode refazer a avaliação quantas vezes precisar.",
      audio: "/tour/aluno/avaliacao.mp3",
    },
    {
      seletor: "assistente",
      titulo: "Assistente de IA",
      descricao:
        "E este assistente te acompanha em todas as telas — é só chamar quando bater uma dúvida.",
      audio: "/tour/aluno/assistente.mp3",
    },
  ],
  master: [
    {
      titulo: "Área do Master",
      descricao:
        "Aqui você cria e organiza todo o conteúdo do curso. Vou te mostrar o caminho.",
      audio: "/tour/master/bemvindo.mp3",
    },
    {
      seletor: "master-modulos",
      titulo: "Módulos",
      descricao:
        "Tudo começa pelos módulos, as grandes áreas do curso. Vamos abrir um.",
      audio: "/tour/master/modulos.mp3",
    },
    {
      seletor: "master-disciplinas",
      linkDe: "master-modulos",
      titulo: "Disciplinas",
      descricao:
        "Dentro de cada disciplina você cadastra aulas, materiais e avaliações. Vamos entrar em uma.",
      audio: "/tour/master/disciplinas.mp3",
    },
    {
      seletor: "master-aulas",
      linkDe: "master-disciplinas",
      titulo: "Aulas",
      descricao:
        "É aqui que você adiciona as videoaulas da disciplina, colando um link ou enviando um arquivo.",
      audio: "/tour/master/aulas.mp3",
    },
    {
      seletor: "master-materiais",
      titulo: "Materiais",
      descricao:
        "Anexe apostilas, PDFs e links de apoio para os alunos baixarem.",
      audio: "/tour/master/materiais.mp3",
    },
    {
      seletor: "master-avaliacao",
      titulo: "Avaliação final",
      descricao:
        "Monte a avaliação com perguntas e alternativas; o aluno precisa passar para concluir.",
      audio: "/tour/master/avaliacao.mp3",
    },
    {
      seletor: "master-conhecimento",
      titulo: "Base de conhecimento da IA",
      descricao:
        "Envie documentos aqui para treinar o assistente de IA daquela disciplina.",
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
 * Monta a lista de passos alcançáveis a partir da tela atual. Um passo entra se:
 * central (sem seletor); ou seu elemento existe agora; ou é acessível por
 * navegação — seu `linkDe` tem um link na tela, ou o passo anterior incluído já
 * abre caminho para a mesma página (passos irmãos numa página mais profunda).
 */
export function passosDoTour(
  perfil: PerfilTour,
  existe: (dataTour: string) => boolean,
  temLink: (dataTour: string) => boolean,
): PassoTour[] {
  const resultado: PassoTour[] = [];
  // Contêineres que um passo já incluído ABRE ao navegar: o seletor dele passa
  // a existir (com links) na página aonde o tour chega. Assim a cadeia
  // painel → módulo → disciplina se propaga passo a passo.
  const alcancaveis = new Set<string>();
  let paginaProfundaAberta = false;

  for (const passo of TOURS[perfil]) {
    if (!passo.seletor || existe(passo.seletor)) {
      resultado.push(passo);
      continue;
    }
    if (passo.linkDe && (temLink(passo.linkDe) || alcancaveis.has(passo.linkDe))) {
      resultado.push(passo);
      alcancaveis.add(passo.seletor); // este passo abre a página do seu seletor
      paginaProfundaAberta = true;
      continue;
    }
    // Passo irmão numa página profunda já alcançável (ex.: aulas após abas).
    if (!passo.linkDe && paginaProfundaAberta) {
      resultado.push(passo);
    }
  }
  return resultado;
}

export function todosOsPassos(perfil: PerfilTour): PassoTour[] {
  return TOURS[perfil];
}
