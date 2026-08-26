/**
 * Personalize a experiência aqui.
 * Nomes, números, frases e a trilha sonora ficam neste arquivo.
 *
 * Trilha (opcional): coloque o arquivo em
 *   public/soundtrack.mp3
 */
export const siteConfig = {
  projectName: 'PROJETO: ELA',
  caseId: 'CASE-07X',
  herName: 'Milena',
  authorName: 'Davi',
  /** Ex.: "16/08/2026". Se vazio, o sistema mostra "recente". */
  firstDate: '',
  datesCount: 1,
  kissesCount: 1,
  conversations: 'muitas',
  memories: 'começando',
  status: 'Conhecendo',
  soundtrackSrc: `${import.meta.env.BASE_URL}soundtrack.mp3`,

  whatsapp: {
    /** DDI + DDD + número, só dígitos. Não aparece na página. */
    number: '5585985707259',
    cta: 'Vamos marcar o próximo encontro?',
    hint: 'Talvez essa seja a única parte do sistema que realmente precisa da sua resposta.',
    pending: 'Capítulo 2 — aguardando confirmação...',
    prepared: 'Mensagem preparada',
  },

  landing: {
    alert: 'Detectamos uma pessoa suspeita.',
    line1: 'Ela apareceu na vida de um programador recentemente.',
    line2: 'Desde então, alguns comportamentos estranhos foram registrados.',
    cta: 'INICIAR INVESTIGAÇÃO',
  },

  terminalLogs: [
    'Inicializando investigação...',
    'Procurando evidências...',
    'Analisando conversas...',
    'Analisando encontros...',
    'Analisando comportamento do programador...',
  ],
  unexpected: 'Resultado inesperado.',

  evidences: [
    {
      id: 'phone',
      title: 'Evidência #01',
      body: 'Ele começou a verificar o celular com mais frequência.',
    },
    {
      id: 'chat',
      title: 'Evidência #02',
      body: 'Ele aparentemente gosta de conversar com uma determinada pessoa.',
    },
    {
      id: 'next',
      title: 'Evidência #03',
      body: 'Ele já está planejando mentalmente o próximo encontro.',
    },
    {
      id: 'kiss',
      title: 'Evidência #04',
      body: 'Foi identificado um evento extremamente suspeito...',
      reveal: 'PRIMEIRO BEIJO',
    },
  ],
  investigationComplicated: 'Investigação ficando complicada...',

  problem: {
    heading: 'Encontramos um erro no sistema.',
    code: 'ERROR 418',
    codeName: "I'M FALLING FOR YOU",
    explanation: 'Foi identificado um comportamento que não estava previsto no código original.',
    metrics: [
      { label: 'interesse', value: 86 },
      { label: 'curiosidade', value: 94 },
      { label: 'vontade de te ver novamente', value: 100 },
      { label: 'capacidade de agir normalmente perto de você', value: 32 },
    ],
    fixCta: 'Tentar corrigir problema',
    fail: 'Falha.',
    permanent: 'Problema parece ser permanente.',
  },

  interview: {
    title: 'Precisamos fazer algumas perguntas à suspeita.',
    q1: 'Você pretende continuar falando com esse programador?',
    q1Suspicious: 'Resposta suspeita.',
    q1Maybe: 'Resposta ambígua. Vamos considerar isso um sim... disfarçado.',
    q1Yes: 'Resposta aceita.',
    q2: 'Você toparia um segundo encontro?',
    q2No: 'Essa resposta será encaminhada para análise manual.',
    q2Joke: 'Brincadeira',
    q3: 'Qual dessas opções parece mais perigosa?',
    q3Options: [
      {
        id: 'talk',
        emoji: '❤️',
        label: 'Continuar conversando',
        reaction: 'Perigo nível: conversa que não acaba. O sistema aprova.',
      },
      {
        id: 'out',
        emoji: '😏',
        label: 'Sair novamente',
        reaction: 'Alto risco de perder a noção do horário. Registrado.',
      },
      {
        id: 'kiss',
        emoji: '🔥',
        label: 'Repetir o beijo',
        reaction: 'Isso ia direto pra pasta confidencial.',
      },
      {
        id: 'all',
        emoji: '😂',
        label: 'Todas as anteriores',
        reaction: 'Diagnóstico: você entendeu o sistema. Perigoso.',
      },
    ],
  },

  algorithm: {
    title: 'Executando algoritmo...',
    variables: ['conversa++', 'risadas++', 'curiosidade++', 'saudade++', 'química++'],
    calculating: 'Calculando...',
    found: 'Resultado encontrado.',
    score: '100%',
    caption: 'Vocês têm uma combinação perigosamente boa.',
  },

  database: {
    title: 'Informações coletadas até agora',
    emptyWarning: "Campo 'Próximo encontro' está vazio.",
    fixCta: 'CORRIGIR BANCO DE DADOS',
    fixResult: 'Para corrigir esse problema, é necessário um novo encontro.',
  },

  finale: {
    lines: [
      'Tá...',
      'Agora falando sério.',
      'Eu poderia ter simplesmente mandado uma mensagem.',
      'Mas achei mais divertido transformar algumas linhas de código em uma desculpa para te fazer sorrir.',
      'Faz pouco tempo que a gente se conhece...',
      '...mas eu gostei muito de ter te conhecido.',
      'E estou gostando de descobrir, aos poucos, quem você é.',
      'Então não quero acelerar nada.',
      'Só quero continuar vivendo esses momentos com você.',
      'Agora falta só uma coisa...',
    ],
    highlight: 'Quando será a versão 2.0 do nosso encontro?',
  },

  easterEggs: {
    hunter: 'Você realmente estava procurando isso?',
    hunterHint: 'Ok, agora pode voltar pra investigação.',
    footer: 'Feito por um programador que aparentemente não sabe demonstrar interesse de maneira normal.',
    footerReply: 'Mas está tentando.',
  },

  devComments: [
    '// TODO: descobrir mais sobre ela',
    '// TODO: marcar próximo encontro',
    '// TODO: não se apegar rápido demais',
    '// BUG: já pode ser tarde demais',
    '// STATUS: feliz por ter conhecido ela',
  ],
} as const
