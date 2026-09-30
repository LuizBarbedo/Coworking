/**
 * Conteúdo da landing de rolagem, transcrito do roteiro da marketing
 * (`landing-material/roteiro.txt`) e do documento de especialistas
 * (`landing-material/palestrantes.txt`).
 *
 * Por que o texto vive em código e não no banco: esta página recebe o tráfego
 * pago e é a que mais precisa de LCP baixo — é copy de campanha, estático por
 * natureza, revisado junto com o layout. O catálogo real (com liberação por
 * turma) continua vindo do banco na área logada; aqui a promessa é a peça de
 * marketing, e os 11 temas são o recorte que a marketing escolheu anunciar.
 *
 * Regra ao editar: os textos das seções afirmam quantidades ("11 temas",
 * "11 especialistas"). O teste ao lado trava essa coerência — se você
 * acrescentar um tema, o texto tem que acompanhar.
 */

export type Tema = {
  nome: string;
  descricao: string;
  /** Capa gerada por scripts/preparar-midia-landing.mjs. */
  capa: string;
};

export type Palestrante = {
  slug: string;
  nome: string;
  cargo: string;
  /** Tema(s) da formação que a pessoa ministra — tem que existir em TEMAS. */
  temas: string[];
  resumo: string;
  foto: string;
};

export type SecaoLanding = {
  /** Usado como id do elemento e destino de âncora. */
  id: string;
  /** Rótulo curto, para navegação e leitores de tela. */
  rotulo: string;
};

/** Ordem de rolagem da página. */
export const SECOES_LANDING: SecaoLanding[] = [
  { id: "inicio", rotulo: "Início" },
  { id: "para-quem", rotulo: "Para quem é" },
  { id: "como-funciona", rotulo: "Como funciona" },
  { id: "temas", rotulo: "O que você vai aprender" },
  { id: "aulas", rotulo: "Trechos das aulas" },
  { id: "especialistas", rotulo: "Especialistas" },
  { id: "por-que-participar", rotulo: "Por que participar" },
  { id: "perguntas", rotulo: "Perguntas frequentes" },
  { id: "sobre", rotulo: "Sobre o projeto" },
  { id: "inscricao", rotulo: "Inscrição" },
];

/** Chamadas sugeridas no roteiro, alternadas ao longo da página. */
export const CHAMADAS_CTA = [
  "Quero me inscrever",
  "Participar da formação gratuita",
  "Conhecer o Coworking Social",
  "Garantir minha inscrição",
] as const;

export const TEXTOS = {
  hero: {
    titulo: "Aprenda GRATUITAMENTE. Conecte-se. Transforme.",
    subtitulo:
      "Uma capacitação 100% gratuita para quem quer desenvolver novas habilidades, fortalecer ideias e transformar conhecimento em oportunidades.",
    apoio:
      "O Coworking Social de Mudanças Globais reúne especialistas e conteúdos voltados ao empreendedorismo, à inovação e ao impacto social.",
    selos: [
      "Curso 100% gratuito",
      "Conteúdos com especialistas",
      "Certificado de participação",
      "Acesso online",
    ],
  },
  sobre: {
    titulo: "Conhecimento para transformar ideias em oportunidades.",
    paragrafos: [
      "O Coworking Social de Mudanças Globais é uma iniciativa de capacitação voltada ao desenvolvimento de conhecimentos e competências para quem deseja empreender, fortalecer um negócio ou ampliar suas possibilidades profissionais.",
      "Por meio de conteúdos ministrados por especialistas, a formação aborda temas fundamentais para os desafios do empreendedorismo nos dias de hoje.",
      "Aqui, você encontra conhecimento, ferramentas e novas perspectivas para construir seus próximos passos.",
    ],
  },
  motivos: {
    titulo: "Uma formação pensada para quem quer ir mais longe.",
  },
  temas: {
    titulo: "Conhecimento para diferentes momentos da sua jornada.",
    intro:
      "A formação reúne 11 temas fundamentais para quem deseja empreender, organizar ideias e desenvolver novos caminhos.",
  },
  aprendaCom: {
    titulo: "Conhecimento compartilhado por quem entende do assunto.",
    paragrafos: [
      "O Coworking Social de Mudanças Globais reúne profissionais de diferentes áreas para compartilhar experiências, conhecimentos e perspectivas sobre os desafios e oportunidades do empreendedorismo.",
      "Ao longo da formação, você terá acesso a conteúdos sobre gestão, finanças, marketing, inovação, tecnologia, cultura e impacto social.",
    ],
  },
  especialistas: {
    titulo: "Especialistas que conectam experiência e conhecimento.",
    paragrafos: [
      "O Coworking Social de Mudanças Globais reúne 11 especialistas de diferentes áreas, que compartilham conhecimentos, experiências e perspectivas sobre os desafios do empreendedorismo na atualidade.",
      "São profissionais com trajetórias diversas, trazendo conteúdos sobre temas como marketing, finanças, tecnologia, gestão, cultura, vendas e empreendedorismo social.",
      "Cada aula foi pensada para aproximar o conhecimento da realidade de quem deseja desenvolver uma ideia, fortalecer um negócio ou construir novos caminhos profissionais.",
    ],
  },
  paraQuem: {
    titulo: "Para quem quer dar o próximo passo.",
    intro: "Esta formação é para você que:",
    fecho:
      "Não importa em que momento você está. O conhecimento pode ajudar a construir novos caminhos.",
    /**
     * Critérios do edital. A landing antiga trazia isso no hero e o roteiro da
     * marketing não trouxe — sem eles a campanha paga atrai quem não pode se
     * inscrever, e a pessoa só descobre depois. Não remova.
     */
    elegibilidade:
      "A capacitação atende jovens e adultos empreendedores de 15 a 65 anos, microempreendedores individuais (MEIs) e autônomos moradores de municípios da Região Metropolitana do Rio de Janeiro.",
  },
  comoFunciona: {
    titulo: "Como a formação acontece.",
    intro:
      "Tudo online, no seu ritmo, sem sair de casa e sem custo em nenhuma etapa.",
  },
  gratuita: {
    titulo: "Mais conhecimento. Mais possibilidades. Mais oportunidades.",
    paragrafos: [
      "Acreditamos que o acesso ao conhecimento pode contribuir para transformar trajetórias, fortalecer iniciativas e ampliar horizontes.",
      "Por isso, o Coworking Social de Mudanças Globais oferece uma capacitação gratuita, com conteúdos desenvolvidos para quem deseja aprender, empreender e construir novas possibilidades.",
    ],
    fecho: "Aprender é também preparar-se para o futuro.",
  },
  chamadaFinal: {
    titulo: "Seu próximo passo pode começar agora.",
    texto:
      "Conheça o Coworking Social de Mudanças Globais e faça parte de uma formação que conecta conhecimento, empreendedorismo, inovação e impacto social.",
    destaques: [
      "Capacitação 100% gratuita.",
      "Conteúdos com especialistas.",
      "Novas possibilidades para a sua jornada.",
    ],
  },
  institucional: {
    realizacao:
      "O Coworking Social de Mudanças Globais é uma iniciativa desenvolvida pela OROBORUS, em parceria com o IVIG/COPPE/UFRJ e a Fundação I²G.",
    patrocinio:
      "Patrocínio da Prefeitura do Rio de Janeiro, por meio da Secretaria Especial de Integração Metropolitana, no âmbito do Programa Integra Rio.",
  },
} as const;

/** Ícone: chave lida por components/site/icones-landing.tsx. */
export type IconeMotivo =
  | "livro"
  | "pessoas"
  | "tela"
  | "ideia"
  | "aperto-de-mao";

export const MOTIVOS: { icone: IconeMotivo; titulo: string; texto: string }[] = [
  {
    icone: "livro",
    titulo: "Conteúdos práticos",
    texto:
      "Aprenda sobre temas importantes para o desenvolvimento de ideias, negócios e projetos.",
  },
  {
    icone: "pessoas",
    titulo: "Especialistas",
    texto:
      "Tenha acesso a conteúdos compartilhados por profissionais com experiência em diferentes áreas.",
  },
  {
    icone: "tela",
    titulo: "Acesso online",
    texto: "Estude de onde estiver e acompanhe os conteúdos da formação.",
  },
  {
    icone: "ideia",
    titulo: "Novos conhecimentos",
    texto:
      "Desenvolva habilidades que podem contribuir para sua trajetória profissional e empreendedora.",
  },
  {
    icone: "aperto-de-mao",
    titulo: "Conexão e impacto",
    texto:
      "Faça parte de uma iniciativa que acredita no conhecimento como ferramenta de transformação.",
  },
];

export const PUBLICO_ALVO = [
  "Quer empreender ou já possui um negócio;",
  "Tem uma ideia e deseja desenvolver novos conhecimentos;",
  "Busca melhorar sua organização e planejamento;",
  "Quer entender mais sobre marketing, vendas e finanças;",
  "Tem interesse em inovação e novas tecnologias;",
  "Busca ampliar suas possibilidades profissionais;",
  "Acredita no empreendedorismo como ferramenta de transformação.",
];

/**
 * Como a formação funciona. Responde a objeção número um de qualquer curso —
 * "quanto isso vai me custar de tempo e esforço?" — que nem a landing antiga
 * nem o roteiro respondiam.
 *
 * Só afirmações verificáveis na plataforma: aulas em vídeo com material de
 * apoio, avaliação por disciplina, fórum de dúvidas, assistente de IA e
 * declaração de participação ao concluir.
 */
export const COMO_FUNCIONA: {
  icone: IconeMotivo;
  titulo: string;
  texto: string;
}[] = [
  {
    icone: "tela",
    titulo: "100% online, no seu ritmo",
    texto:
      "Aulas em vídeo para assistir quando der, do celular ou do computador. Você retoma de onde parou.",
  },
  {
    icone: "livro",
    titulo: "Material de apoio e avaliação",
    texto:
      "Cada disciplina traz material para baixar e uma avaliação ao final, para você medir o que aprendeu.",
  },
  {
    icone: "pessoas",
    titulo: "Fórum de dúvidas e assistente",
    texto:
      "Pergunte no fórum da turma e conte com um assistente de IA dentro de cada disciplina.",
  },
  {
    icone: "ideia",
    titulo: "Declaração de participação",
    texto:
      "Ao concluir, você recebe a declaração de participação emitida no seu nome.",
  },
];

/**
 * Perguntas frequentes. Curso gratuito que pede CPF desperta desconfiança — e
 * objeção não respondida na página é conversão perdida em silêncio. As respostas
 * saem do edital e do funcionamento real da plataforma; não inventar nada aqui.
 */
export const PERGUNTAS_FREQUENTES = [
  {
    pergunta: "A formação é realmente gratuita?",
    resposta:
      "Sim, do início ao fim. É uma iniciativa desenvolvida pela Oroborus, em parceria com o IVIG/COPPE/UFRJ e a Fundação I²G, com patrocínio da Prefeitura do Rio de Janeiro. Não há cobrança em nenhuma etapa.",
  },
  {
    pergunta: "Por que vocês pedem meu CPF?",
    resposta:
      "O CPF gera a sua matrícula e permite emitir a declaração de participação no seu nome. Seus dados são tratados conforme a LGPD e não são vendidos nem compartilhados com terceiros.",
  },
  {
    pergunta: "Preciso ter empresa ou CNPJ para participar?",
    resposta:
      "Não. A formação atende tanto quem já tem um negócio quanto quem ainda está com a ideia no papel, incluindo MEIs e autônomos.",
  },
  {
    pergunta: "Quem pode se inscrever?",
    resposta:
      "Jovens e adultos empreendedores de 15 a 65 anos, moradores de municípios da Região Metropolitana do Rio de Janeiro.",
  },
  {
    pergunta: "Recebo certificado no final?",
    resposta:
      "Você recebe uma declaração de participação ao concluir a formação, emitida com o seu nome e a relação de disciplinas.",
  },
  {
    pergunta: "Como recebo o acesso depois de me inscrever?",
    resposta:
      "O acesso chega por e-mail, com o seu número de matrícula e o endereço da plataforma. Se a sua turma ainda não começou, o e-mail avisa a data de abertura.",
  },
];

const TEMA_LEGADO = "Empreendendo com Legado Cultural";
const TEMA_ORGANIZACAO = "Empreendendo com Organização";
const TEMA_CONTABILIDADE = "Contabilidade e Noções Financeiras";
const TEMA_JURIDICO = "Aspectos Jurídicos e Formalização de Empresas";
const TEMA_FINANCIAMENTO =
  "Financiamento de Empreendimentos e Cooperativismo de Crédito";
const TEMA_COMPRA_VENDA = "Técnicas de Compra e Venda";
const TEMA_MARKETING = "Estratégias de Marketing Digital";
const TEMA_PRECIFICACAO = "Planejamento e Precificação de Produtos e Serviços";
const TEMA_IA = "Empreendendo com a Inteligência Artificial";
const TEMA_GESTAO = "Gestão e Planejamento Financeiro";
const TEMA_SOCIAL = "Empreendedorismo Social";

export const TEMAS: Tema[] = [
  {
    nome: TEMA_LEGADO,
    descricao:
      "Conheça possibilidades de empreendedorismo a partir da valorização da cultura e da construção de legados.",
    capa: "/modulos/empreendendo-com-legado-cultural.webp",
  },
  {
    nome: TEMA_ORGANIZACAO,
    descricao:
      "Aprenda como ganhar tempo, reduzir erros e crescer com mais método e organização.",
    capa: "/modulos/empreender-com-organizacao.webp",
  },
  {
    nome: TEMA_CONTABILIDADE,
    descricao:
      "Entenda conceitos importantes para organizar e acompanhar a realidade financeira de um negócio.",
    capa: "/modulos/contabilidade-e-nocoes-financeiras.webp",
  },
  {
    nome: TEMA_JURIDICO,
    descricao:
      "Conheça aspectos importantes para a formalização e estruturação de um empreendimento.",
    capa: "/modulos/aspectos-juridicos-e-formalizacao.webp",
  },
  {
    nome: TEMA_FINANCIAMENTO,
    descricao:
      "Entenda possibilidades de financiamento e conheça conceitos relacionados ao cooperativismo de crédito.",
    capa: "/modulos/financiamento-e-cooperativismo-de-credito.webp",
  },
  {
    nome: TEMA_COMPRA_VENDA,
    descricao:
      "Desenvolva conhecimentos importantes para melhorar processos de negociação, compra e venda.",
    capa: "/modulos/tecnicas-de-compra-e-venda.webp",
  },
  {
    nome: TEMA_MARKETING,
    descricao:
      "Conheça ferramentas e estratégias para fortalecer a presença e o posicionamento de negócios no ambiente digital.",
    capa: "/modulos/estrategias-de-marketing-digital.webp",
  },
  {
    nome: TEMA_PRECIFICACAO,
    descricao:
      "Aprenda sobre planejamento e critérios importantes para definir preços de produtos e serviços.",
    capa: "/modulos/planejamento-e-precificacao.webp",
  },
  {
    nome: TEMA_IA,
    descricao:
      "Entenda como a Inteligência Artificial pode contribuir para novos processos, ideias e oportunidades.",
    capa: "/modulos/empreendendo-com-inteligencia-artificial.webp",
  },
  {
    nome: TEMA_GESTAO,
    descricao:
      "Desenvolva uma visão mais estratégica sobre a organização e o planejamento financeiro.",
    capa: "/modulos/gestao-e-planejamento-financeiro.webp",
  },
  {
    nome: TEMA_SOCIAL,
    descricao:
      "Conheça caminhos para desenvolver iniciativas que gerem impacto positivo nas comunidades.",
    capa: "/modulos/empreendedorismo-social.webp",
  },
];

/**
 * Ordem igual à do documento de especialistas — é a mesma ordem que
 * scripts/preparar-midia-landing.mjs usa para casar foto e pessoa.
 */
export const PALESTRANTES: Palestrante[] = [
  {
    slug: "ronaldinho-do-cavaquinho",
    nome: "Ronaldinho do Cavaquinho",
    cargo: "Presidente do Instituto Waldir Azevedo",
    temas: [TEMA_LEGADO],
    resumo:
      "Com mais de três décadas de atuação artística, é uma das principais referências do cavaquinho brasileiro e guardião da memória musical nacional.",
    foto: "/palestrantes/ronaldinho-do-cavaquinho.webp",
  },
  {
    slug: "aurelio-murta",
    nome: "Prof. Aurélio",
    cargo: "Inteligência Artificial e Tecnologia",
    temas: [TEMA_IA],
    resumo:
      "Atua na área de tecnologia e Inteligência Artificial, compartilhando conhecimentos sobre as transformações provocadas por essas ferramentas e suas possibilidades de aplicação.",
    foto: "/palestrantes/aurelio-murta.webp",
  },
  {
    slug: "jorge-bittencourt",
    nome: "Jorge Bittencourt",
    cargo: "Mestre em Engenharia Elétrica; pesquisador do Convênio PortosRio/IVIG",
    temas: [TEMA_GESTAO],
    resumo:
      "Engenheiro eletricista com ampla experiência como gestor e professor de instituições de ensino superior. Foi Conselheiro Federal do CONFEA e do CREA-RJ.",
    foto: "/palestrantes/jorge-bittencourt.webp",
  },
  {
    slug: "gabriel-chilleli",
    nome: "Gabriel Chilleli",
    cargo: "Especialista em Comunicação e Marketing",
    temas: [TEMA_MARKETING],
    resumo:
      "Atua na área de Comunicação e Marketing Institucional, com foco em estratégias e ferramentas para o ambiente digital.",
    foto: "/palestrantes/gabriel-chilleli.webp",
  },
  {
    slug: "jose-pinto-monteiro",
    nome: "José Pinto Monteiro",
    cargo: "Presidente do CAMP Mangueira",
    temas: [TEMA_SOCIAL],
    resumo:
      "Compartilha conhecimentos e experiências de empreendedorismo social e de iniciativas capazes de gerar impacto positivo por meio da ação coletiva.",
    foto: "/palestrantes/jose-pinto-monteiro.webp",
  },
  {
    slug: "jose-dutra",
    nome: "José Dutra",
    cargo: "Engenheiro Civil; Mestre em Dinâmica dos Oceanos e da Terra",
    temas: [TEMA_ORGANIZACAO],
    resumo:
      "Com uma trajetória profissional de 49 anos, compartilha conhecimentos sobre organização, método e planejamento para reduzir erros e ganhar tempo.",
    foto: "/palestrantes/jose-dutra.webp",
  },
  {
    slug: "jorge-victor",
    nome: "Jorge Victor",
    cargo: "Especialista em Contabilidade pela UFRJ; fundador da Mercury Contabilidade",
    temas: [TEMA_CONTABILIDADE, TEMA_PRECIFICACAO],
    resumo:
      "Compartilha conhecimentos de organização financeira e gestão de negócios, com foco em contabilidade, planejamento e precificação.",
    foto: "/palestrantes/jorge-victor.webp",
  },
  {
    slug: "fabio-laje",
    nome: "Fábio Laje",
    cargo: "Marketing Digital e Posicionamento Digital",
    temas: [TEMA_MARKETING],
    resumo:
      "Discute a importância de compreender o ambiente digital, construir uma presença estratégica e desenvolver formas mais eficientes de comunicação com o público.",
    foto: "/palestrantes/fabio-laje.webp",
  },
  {
    slug: "maria-da-penha",
    nome: "Maria da Penha",
    cargo: "Mestre em Engenharia de Transportes pelo IME; professora universitária",
    temas: [TEMA_COMPRA_VENDA],
    resumo:
      "Professora e pesquisadora com experiência no desenvolvimento de projetos no IVIG/UFRJ e 10 anos de atuação na área comercial.",
    foto: "/palestrantes/maria-da-penha.webp",
  },
  {
    slug: "renato-mansur",
    nome: "Renato Mansur",
    cargo:
      "Empresário contábil e Vice-Presidente do Instituto Brasileiro de Registro Empresarial",
    temas: [TEMA_JURIDICO],
    resumo:
      "Com 37 anos de experiência profissional, atende clientes de comércio, indústria e serviços. Graduado em Ciências Contábeis, com MBA em Controladoria.",
    foto: "/palestrantes/renato-mansur.webp",
  },
  {
    slug: "ronaldo-gaudio",
    nome: "Ronaldo Gáudio",
    cargo: "Advogado; Diretor da Gaudio Advocacia",
    temas: [TEMA_FINANCIAMENTO],
    resumo:
      "Graduado pela Universidade do Estado do Rio de Janeiro (UERJ), compartilha conhecimentos sobre financiamento de empreendimentos e cooperativismo de crédito.",
    foto: "/palestrantes/ronaldo-gaudio.webp",
  },
];

/**
 * Cortes já publicados no canal (playlist "CORTES - COWORKING SOCIAL").
 * Entram por fachada: nada do YouTube carrega antes do clique — vale pela
 * performance e por não disparar cookie do Google antes do consentimento.
 *
 * `destaque` marca o que vai no hero. É escolha de marketing, então mora aqui e
 * não na página; o teste ao lado garante que existe exatamente um.
 */
export const CORTES_YOUTUBE = [
  {
    id: "9ZmDAaMFg6E",
    titulo: "Todo empreendedor precisa entender sobre esse assunto",
    tema: null as string | null,
    destaque: false,
  },
  {
    id: "vKyQr-Rjing",
    titulo: "A forma certa de formalizar sua empresa",
    tema: TEMA_JURIDICO,
    destaque: false,
  },
  {
    id: "WiducuuQQmo",
    titulo: "Posicionamento digital, de forma gratuita e online",
    tema: TEMA_MARKETING,
    destaque: false,
  },
  {
    id: "s4P2IhWop3k",
    titulo: "Use a Inteligência Artificial para mudar o seu futuro",
    tema: TEMA_IA,
    destaque: true,
  },
  {
    id: "jghN6pf6f1E",
    titulo: "Palestra do presidente do CAMP Mangueira",
    tema: TEMA_SOCIAL,
    destaque: false,
  },
];
