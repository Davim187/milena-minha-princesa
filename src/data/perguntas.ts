import { siteConfig } from '../config'

export type PerguntaCatalogo = {
  perguntaId: string
  pergunta: string
  opcoes: string[]
}

export const perguntasCatalogo = {
  pergunta_1: {
    perguntaId: 'pergunta_1',
    pergunta: siteConfig.interview.q1,
    opcoes: ['Não', 'Talvez', 'Sim 👀'],
  },
  pergunta_2: {
    perguntaId: 'pergunta_2',
    pergunta: siteConfig.interview.q2,
    opcoes: ['NÃO', 'CLARO'],
  },
  pergunta_3: {
    perguntaId: 'pergunta_3',
    pergunta: siteConfig.interview.q3,
    opcoes: siteConfig.interview.q3Options.map((item) => `${item.emoji} ${item.label}`),
  },
} as const satisfies Record<string, PerguntaCatalogo>

export type PerguntaId = keyof typeof perguntasCatalogo
